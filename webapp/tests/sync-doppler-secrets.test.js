/**
 * @fileoverview Guards for `webapp/scripts/sync-doppler-secrets.sh`.
 *
 * The deploy pushes the whole shared `common` bus plus this project's config
 * into the Worker. That crossed Cloudflare's Workers Free limit of 64 variables
 * per Worker and took the deploy down at `wrangler versions secret bulk`, which
 * reports the count only after the API has already rejected the upload:
 *
 *   This deployment includes 68 variables, which exceeds the Workers Free limit
 *   of 64 variables per Worker (secrets + text). [code: 10055]
 *
 * The script now drops the keys this Worker does not read (`worker-secret-exclusions.txt`)
 * and checks the count itself, before the API call can fail obscurely. Two
 * things have to stay true for that to be safe, and both are tested here:
 *
 *  1. Every excluded key is genuinely absent from everything the Worker is
 *     built from and runs. Otherwise the list has grown a key the app needs and
 *     the deploy would break a feature quietly.
 *  2. The filter actually filters — so this runs the real script against a
 *     stubbed `doppler` and `npx` and reads the batch that would have been
 *     uploaded, rather than pattern-matching the source.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const webappRoot = path.join(repoRoot, 'webapp');
const scriptPath = path.join(webappRoot, 'scripts', 'sync-doppler-secrets.sh');
const exclusionsPath = path.join(webappRoot, 'scripts', 'worker-secret-exclusions.txt');

/**
 * Parses the exclusions file into key names, dropping comments and blanks.
 * @returns {string[]} The excluded keys.
 */
function readExclusions() {
	return fs
		.readFileSync(exclusionsPath, 'utf8')
		.split('\n')
		.map((line) => line.replace(/#.*$/, '').trim())
		.filter((line) => line.length > 0);
}

// Where the Worker is built from and what it runs. A key that appears in none
// of these cannot be read by the Worker.
const WORKER_PATHS = [
	'webapp/src',
	'webapp/worker',
	'webapp/scripts',
	'webapp/wrangler.template.jsonc',
	'.buildkite',
	'.github'
];

/**
 * Lists files under a path, skipping the directories that are not source.
 * @param {string} relativePath Path relative to the repository root.
 * @returns {string[]} Absolute file paths.
 */
function sourceFiles(relativePath) {
	const absolute = path.join(repoRoot, relativePath);
	if (!fs.existsSync(absolute)) {
		return [];
	}
	if (fs.statSync(absolute).isFile()) {
		return [absolute];
	}
	return fs
		.readdirSync(absolute, { withFileTypes: true, recursive: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.join(entry.parentPath ?? entry.path, entry.name))
		.filter(
			(file) => !file.includes('node_modules') && !file.includes(`${path.sep}.git${path.sep}`)
		);
}

// The exclusions file itself names every excluded key, and so does this test.
const NON_SOURCE = new Set([exclusionsPath, fileURLToPath(import.meta.url)]);
// Read once: the check below asks about every key, and re-reading the Worker's
// sources per key made this the slowest test in the suite.
const workerSource = WORKER_PATHS.flatMap(sourceFiles)
	.filter((file) => !NON_SOURCE.has(file))
	.map((file) => ({ file: path.relative(repoRoot, file), text: fs.readFileSync(file, 'utf8') }));

const exclusions = readExclusions();

describe('worker secret exclusions', () => {
	it('only excludes keys the Worker cannot read', () => {
		const offenders = exclusions.flatMap((key) => {
			const named = workerSource.filter((source) => source.text.includes(key));
			return named.length > 0 ? [`${key} in ${named.map((source) => source.file)}`] : [];
		});
		expect(offenders).toEqual([]);
	});

	it('has no duplicate entries', () => {
		expect(new Set(exclusions).size).toBe(exclusions.length);
	});
});

describe('sync-doppler-secrets.sh', () => {
	let workDir;
	let recordsDir;

	/**
	 * Wraps a key/value map the way `doppler secrets --json` reports it: each
	 * value is an object with a `computed` field, which is what the script reads.
	 * @param {Record<string, string>} values The raw values.
	 * @returns {string} The Doppler JSON.
	 */
	function dopplerJson(values) {
		return JSON.stringify(
			Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { computed: value }]))
		);
	}

	/**
	 * Runs the real script in a copy of the webapp directory, with `doppler` and
	 * `npx` stubbed on PATH so nothing reaches the network.
	 * @param {object} [options] Options.
	 * @param {number} [options.limit] WORKER_VARIABLE_LIMIT to export.
	 * @returns {{status: number, stdout: string}} The exit status and output.
	 */
	function runScript({ limit } = {}) {
		const env = {
			...process.env,
			PATH: `${path.join(workDir, 'bin')}:${process.env.PATH}`,
			RECORDS_DIR: recordsDir,
			DOPPLER_TOKEN: ''
		};
		delete env.DOPPLER_PROJECT;
		delete env.DOPPLER_CONFIG;
		if (limit === undefined) {
			delete env.WORKER_VARIABLE_LIMIT;
		} else {
			env.WORKER_VARIABLE_LIMIT = String(limit);
		}

		try {
			const stdout = execFileSync(
				'bash',
				[path.join(workDir, 'webapp', 'scripts', 'sync-doppler-secrets.sh')],
				{ env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
			);
			return { status: 0, stdout };
		} catch (error) {
			return { status: error.status ?? 1, stdout: `${error.stdout ?? ''}${error.stderr ?? ''}` };
		}
	}

	/**
	 * The secrets that actually reached `wrangler`, across every batch.
	 * @returns {object} The merged secret map the uploads carried.
	 */
	function uploadedSecrets() {
		const batches = fs
			.readdirSync(recordsDir)
			.map((name) => JSON.parse(fs.readFileSync(path.join(recordsDir, name), 'utf8')));
		return Object.assign({}, ...batches);
	}

	beforeEach(() => {
		workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-doppler-'));
		recordsDir = path.join(workDir, 'records');
		fs.mkdirSync(recordsDir, { recursive: true });

		// The script resolves temp files from its own location, so run a copy and
		// keep the repository working tree untouched.
		const scriptsDir = path.join(workDir, 'webapp', 'scripts');
		fs.mkdirSync(scriptsDir, { recursive: true });
		for (const name of ['sync-doppler-secrets.sh', 'worker-secret-exclusions.txt']) {
			fs.copyFileSync(path.join(webappRoot, 'scripts', name), path.join(scriptsDir, name));
		}

		const binDir = path.join(workDir, 'bin');
		fs.mkdirSync(binDir, { recursive: true });

		// A stub doppler: `whoami` succeeds; the two config reads return fixtures.
		fs.writeFileSync(
			path.join(binDir, 'doppler'),
			`#!/bin/bash
case "$*" in
	*whoami*) exit 0 ;;
	*"--project common"*) cat "${path.join(workDir, 'common.json')}" ;;
	*"secrets --json"*) cat "${path.join(workDir, 'project.json')}" ;;
	*) exit 0 ;;
esac
`
		);
		// A stub npx that keeps each batch instead of uploading it.
		fs.writeFileSync(
			path.join(binDir, 'npx'),
			`#!/bin/bash
cp doppler_secrets_batch_temp.json "$RECORDS_DIR/$(ls "$RECORDS_DIR" | wc -l).json"
exit 0
`
		);
		fs.chmodSync(path.join(binDir, 'doppler'), 0o755);
		fs.chmodSync(path.join(binDir, 'npx'), 0o755);
	});

	afterEach(() => {
		fs.rmSync(workDir, { recursive: true, force: true });
	});

	it('drops the excluded keys and keeps the rest', () => {
		// Every excluded key for real, plus two that must survive. If the filter
		// stopped working, this is where it shows.
		const fixture = { KEEP_ONE: 'kept', KEEP_TWO: 'kept' };
		for (const key of exclusions) {
			fixture[key] = 'dropped';
		}
		fs.writeFileSync(path.join(workDir, 'common.json'), dopplerJson(fixture));
		fs.writeFileSync(path.join(workDir, 'project.json'), dopplerJson({ PROJECT_ONLY: 'kept' }));

		const result = runScript();

		expect(result.status).toBe(0);
		expect(uploadedSecrets()).toEqual({
			KEEP_ONE: 'kept',
			KEEP_TWO: 'kept',
			PROJECT_ONLY: 'kept'
		});
	});

	it('comes in under the Workers variable limit for the real bus', () => {
		// The merged set as the deploy sees it: whichever of the excluded keys are
		// actually on the bus, they are dropped, so the count is comfortably under
		// the 64 that failed the build.
		const common = {};
		const project = {};
		exclusions.forEach((key, index) => {
			// Spread them across both configs, as the real bus has them.
			if (index % 2 === 0) {
				common[key] = 'value';
			} else {
				project[key] = 'value';
			}
		});
		for (let index = 0; index < 40; index += 1) {
			project[`PROJECT_SECRET_${index}`] = 'value';
		}
		fs.writeFileSync(path.join(workDir, 'common.json'), dopplerJson(common));
		fs.writeFileSync(path.join(workDir, 'project.json'), dopplerJson(project));

		const result = runScript();

		expect(result.status).toBe(0);
		expect(Object.keys(uploadedSecrets())).toHaveLength(40);
		expect(result.stdout).toContain('Syncing 40 secrets');
	});

	it('fails with a readable message instead of the API error', () => {
		const project = {};
		for (let index = 0; index < 30; index += 1) {
			project[`PROJECT_SECRET_${index}`] = 'value';
		}
		fs.writeFileSync(path.join(workDir, 'common.json'), '{}');
		fs.writeFileSync(path.join(workDir, 'project.json'), dopplerJson(project));

		const result = runScript({ limit: 20 });

		expect(result.status).toBe(1);
		expect(result.stdout).toContain('30 secrets plus an assumed 7 text variables');
		expect(result.stdout).toContain('worker-secret-exclusions.txt');
		expect(uploadedSecrets()).toEqual({});
	});
});
