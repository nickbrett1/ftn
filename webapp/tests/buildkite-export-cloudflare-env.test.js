/**
 * @fileoverview Regression guards for `.buildkite/scripts/export-cloudflare-env.sh`.
 *
 * That script is SOURCED into the deploy container, which the docker plugin runs
 * via `sh -e -c` — `/bin/sh` is dash on Debian. Two bashisms there turned its
 * safety checks into dead code (see build 73's log lines):
 *
 *  1. `[[ ]]` is bash-only. dash prints "[: not found" and the test never
 *     evaluates, so a missing `DOPPLER_TOKEN` or an empty Doppler value was
 *     never caught — the guards silently did nothing.
 *
 *  2. dash's `.` builtin ignores arguments, so `. export-cloudflare-env.sh prd`
 *     fell back to the `stg` default instead of `prd`. The config now travels in
 *     `CF_DOPPLER_CONFIG`, which every shell honours.
 *
 * These tests execute the script under real `dash` rather than pattern-matching
 * it, so they fail if either regression returns.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const scriptRef = '.buildkite/scripts/export-cloudflare-env.sh';
const scriptPath = path.join(repoRoot, ...scriptRef.split('/'));
// The deploy step is split by branch (production on main, preview elsewhere),
// so the call sites live in two files now.
const deployYmlPath = path.join(repoRoot, '.buildkite', 'steps', 'deploy-production.yml');
const deployPreviewYmlPath = path.join(repoRoot, '.buildkite', 'steps', 'deploy-preview.yml');
const PRD = 'common/prd';
const STG = 'common/stg';

const script = fs.readFileSync(scriptPath, 'utf8');
const deployYml = fs.readFileSync(deployYmlPath, 'utf8');
const deployPreviewYml = fs.readFileSync(deployPreviewYmlPath, 'utf8');
// Both deploy fragments, for assertions that only care about the union.
const deployYmls = `${deployYml}\n${deployPreviewYml}`;
// Comments are allowed to name the forbidden forms in order to explain them.
const scriptCode = script
	.split('\n')
	.filter((line) => !line.trim().startsWith('#'))
	.join('\n');

/** True when a real dash is on PATH (it is the deploy container's /bin/sh). */
function hasDash() {
	try {
		execFileSync('dash', ['-c', 'true'], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

const dashAvailable = hasDash();

/**
 * A stand-in `doppler` that echoes `CFG:<config>` for the requested secret, so
 * tests can observe both the value and which config was consulted. `empty`
 * makes it behave like Doppler finding nothing (blank output, exit 0 — which is
 * why the script relies on an emptiness check rather than an exit code).
 */
function fakeDopplerDir({ empty = false } = {}) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-doppler-'));
	const body = empty
		? '#!/bin/sh\nexit 0\n'
		: `#!/bin/sh
cfg=stg
while [ $# -gt 0 ]; do
	if [ "$1" = "--config" ]; then cfg="$2"; fi
	shift
done
echo "CFG:$cfg"
`;
	fs.writeFileSync(path.join(dir, 'doppler'), body, { mode: 0o755 });
	return dir;
}

/** Sources the script under dash and returns {status, stdout, stderr}. */
function sourceUnderDash({ config, dopplerDir, withToken = true } = {}) {
	const env = { ...process.env };
	if (withToken) {
		env.DOPPLER_TOKEN = 'dummy-token';
	} else {
		delete env.DOPPLER_TOKEN;
	}
	if (config) {
		env.CF_DOPPLER_CONFIG = config;
	} else {
		delete env.CF_DOPPLER_CONFIG;
	}
	if (dopplerDir) {
		env.PATH = `${dopplerDir}:${env.PATH}`;
	}
	const cmd = `. "${scriptPath}"\necho REACHED-END\n`;
	try {
		const stdout = execFileSync('dash', ['-c', cmd], { env, encoding: 'utf8' });
		return { status: 0, stdout, stderr: '' };
	} catch (error) {
		return {
			status: error.status ?? -1,
			stdout: error.stdout ?? '',
			stderr: error.stderr ?? ''
		};
	}
}

describe('export-cloudflare-env.sh - POSIX safety', () => {
	it('contains no bash-only [[ ]] tests', () => {
		// Under dash `[[` is "not found", so the guard never runs.
		expect(scriptCode).not.toContain('[[');
		expect(scriptCode).not.toContain(']]');
	});

	it.skipIf(!dashAvailable)('parses under dash', () => {
		execFileSync('dash', ['-n', scriptPath], { stdio: 'ignore' });
	});

	it.skipIf(!dashAvailable)('fails loudly when DOPPLER_TOKEN is absent (the guard is live)', () => {
		const result = sourceUnderDash({ withToken: false, dopplerDir: fakeDopplerDir() });
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain('DOPPLER_TOKEN is not in the job environment');
		// The guard used to fall through, letting the step continue.
		expect(result.stdout).not.toContain('REACHED-END');
	});

	it.skipIf(!dashAvailable)('fails loudly when Doppler returns an empty value', () => {
		const result = sourceUnderDash({ dopplerDir: fakeDopplerDir({ empty: true }) });
		expect(result.status).not.toBe(0);
		expect(result.stderr).toMatch(/Doppler returned an empty value for \w+/);
		expect(result.stdout).not.toContain('REACHED-END');
	});

	it.skipIf(!dashAvailable)('exports the values when Doppler resolves them', () => {
		const result = sourceUnderDash({ dopplerDir: fakeDopplerDir(), config: 'prd' });
		expect(result.status).toBe(0);
		expect(result.stdout).toContain(`✅ CLOUDFLARE_API_TOKEN set from Doppler (${PRD})`);
		expect(result.stdout).toContain(`✅ CLOUDFLARE_ACCOUNT_ID set from Doppler (${PRD})`);
	});

	it.skipIf(!dashAvailable)('honours CF_DOPPLER_CONFIG, since dash ignores `.` arguments', () => {
		// Regression: `. <script> prd` set config=stg under dash, so production
		// deploys read the stg secrets.
		const prod = sourceUnderDash({ dopplerDir: fakeDopplerDir(), config: 'prd' });
		expect(prod.stdout).toContain(PRD);
		expect(prod.stdout).not.toContain(STG);

		const preview = sourceUnderDash({ dopplerDir: fakeDopplerDir(), config: 'stg' });
		expect(preview.stdout).toContain(STG);
	});

	it.skipIf(!dashAvailable)('defaults to stg when no config is supplied', () => {
		const result = sourceUnderDash({ dopplerDir: fakeDopplerDir() });
		expect(result.stdout).toContain(STG);
	});
});

describe('export-cloudflare-env.sh - call sites', () => {
	it('passes the Doppler config by env var, not as a `.` argument', () => {
		// `. <script> prd` is silently downgraded to the stg default by dash.
		expect(deployYmls).not.toMatch(/\.\s+\.buildkite\/scripts\/export-cloudflare-env\.sh\s+\w+/);
		expect(deployYmls).toContain(`CF_DOPPLER_CONFIG=prd . ${scriptRef}`);
		expect(deployYmls).toContain(`CF_DOPPLER_CONFIG=stg . ${scriptRef}`);
	});
});
