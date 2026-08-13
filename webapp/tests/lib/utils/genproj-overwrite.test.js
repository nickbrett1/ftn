/**
 * @fileoverview Overwrite-policy classification for genproj regeneration.
 * Round-6 (memo genproj-doppler-login): the generated helper scripts under
 * scripts/ (cloud_login.sh, wrangler/doppler helpers) are INFRA, not app code —
 * otherwise a regeneration keeps the stale first-generation script (e.g. a
 * cloud_login.sh with no doppler block) even when the capability set changed.
 */

import { describe, it, expect } from 'vitest';
import { isAppOwnedPath, isMergeTargetFile } from '$lib/utils/genproj-overwrite.js';

describe('isAppOwnedPath', () => {
	it('classifies user code under src/, tests/, worker/ and app/ as app-owned', () => {
		expect(isAppOwnedPath('src/routes/+page.svelte')).toBe(true);
		expect(isAppOwnedPath('tests/lib/store.test.js')).toBe(true);
		expect(isAppOwnedPath('worker/index.js')).toBe(true);
		expect(isAppOwnedPath('app/App.tsx')).toBe(true);
	});

	it('classifies generated infra (Dockerfile, .circleci, .devcontainer, README) as not app-owned', () => {
		expect(isAppOwnedPath('Dockerfile')).toBe(false);
		expect(isAppOwnedPath('.circleci/config.yml')).toBe(false);
		expect(isAppOwnedPath('.devcontainer/.zshrc')).toBe(false);
		expect(isAppOwnedPath('README.md')).toBe(false);
		expect(isAppOwnedPath('docker-compose.yml')).toBe(false);
	});

	it('classifies user-owned scripts (e.g. the docker-container entrypoint contract) as app-owned', () => {
		expect(isAppOwnedPath('scripts/entrypoint.sh')).toBe(true);
		expect(isAppOwnedPath('scripts/backup.py')).toBe(true);
	});

	it('classifies genproj-generated helper scripts as infra, not app-owned', () => {
		// Round-6: these are template-owned and MUST be updated on regen —
		// a stale cloud_login.sh (pre-doppler) breaks the cloud login flow.
		expect(isAppOwnedPath('scripts/cloud_login.sh')).toBe(false);
		expect(isAppOwnedPath('scripts/run-wrangler-dev.sh')).toBe(false);
		expect(isAppOwnedPath('scripts/setup-wrangler-config.sh')).toBe(false);
		expect(isAppOwnedPath('scripts/sync-doppler-secrets.sh')).toBe(false);
	});
});

describe('isMergeTargetFile', () => {
	it('returns true only for devcontainer.json', () => {
		expect(isMergeTargetFile('.devcontainer/devcontainer.json')).toBe(true);
		expect(isMergeTargetFile('.devcontainer/Dockerfile')).toBe(false);
	});
});
