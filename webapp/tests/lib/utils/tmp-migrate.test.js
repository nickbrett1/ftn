/**
 * TEMPORARY migration helper (deleted after the fleet migration).
 *
 * Writes the generated `.buildkite/` files into an existing local clone, so a
 * repo can be migrated by the same code path that generates new projects.
 *
 * Env:
 *   MIGRATE_REPO_PATH   local path to the clone
 *   MIGRATE_CAPABILITIES comma-separated capability ids
 *   MIGRATE_NAME        project name (repo name)
 *   MIGRATE_CONFIG      optional JSON for configuration
 */
import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';
import fs from 'node:fs';
import path from 'node:path';

describe('tmp: migrate a repo to buildkite', () => {
	// Skipped unless a caller drives it explicitly with MIGRATE_REPO_PATH:
	// it writes files into a local clone, so it must never run as part of the
	// suite (there is no such path in CI).
	it.skipIf(!process.env.MIGRATE_REPO_PATH)('writes the .buildkite/ files', async () => {
		const repoPath = process.env.MIGRATE_REPO_PATH;

		const capabilities = (process.env.MIGRATE_CAPABILITIES || '')
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);
		const configuration = process.env.MIGRATE_CONFIG ? JSON.parse(process.env.MIGRATE_CONFIG) : {};

		const files = await generateAllFiles({
			name: process.env.MIGRATE_NAME || 'repo',
			projectName: process.env.MIGRATE_NAME || 'repo',
			capabilities,
			configuration,
			registryNamespace: process.env.MIGRATE_REGISTRY || 'nickbrett1'
		});

		const buildkiteFiles = files.filter((f) => f.filePath.startsWith('.buildkite/'));
		expect(buildkiteFiles.length, 'generated .buildkite files').toBeGreaterThan(0);

		if (process.env.MIGRATE_DRY_RUN === 'true') {
			for (const f of buildkiteFiles) {
				console.log('\n===== ' + f.filePath + ' =====\n' + f.content);
			}
			return;
		}

		for (const f of buildkiteFiles) {
			const dest = path.join(repoPath, f.filePath);
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.writeFileSync(dest, f.content);
			console.log('wrote', f.filePath);
		}
	});
});
