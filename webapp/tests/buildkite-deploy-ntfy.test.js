/**
 * @fileoverview Regression guard for the production ntfy notification in this
 * repo's own Buildkite deploy step (`.buildkite/steps/deploy.yml`).
 *
 * The CircleCI -> Buildkite port piped a `doppler secrets get --plain` result
 * through `jq -r .computed`. `--plain` emits the raw secret value, not the
 * `{ ..., "computed": ... }` shape jq expects, so jq failed to parse it; the
 * `2>/dev/null || true` then hid the failure, leaving NTFY_URL empty and
 * silently skipping the notification while the deploy still reported green.
 *
 * `--plain` must therefore be read directly, with no jq in the pipeline.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deployYmlPath = path.resolve(__dirname, '..', '..', '.buildkite', 'steps', 'deploy.yml');

function ntfyLookupLine() {
	const yml = fs.readFileSync(deployYmlPath, 'utf8');
	// The single command that resolves the notification URL from Doppler.
	return yml
		.split('\n')
		.find((line) => line.includes('doppler secrets get NTFY_URL_CIRCLECI_BUILD'));
}

describe('ftn deploy step - ntfy notification', () => {
	it('resolves NTFY_URL_CIRCLECI_BUILD from Doppler common/prd with --plain', () => {
		const line = ntfyLookupLine();
		expect(line).toBeDefined();
		expect(line).toContain('--plain');
		expect(line).toContain('--project common');
		expect(line).toContain('--config prd');
	});

	it('does not pipe the --plain value through jq (regression: silent skip)', () => {
		const line = ntfyLookupLine();
		// `--plain` prints the raw value; `jq -r .computed` expects `--json`
		// output and fails on a bare URL, silently skipping the notification.
		expect(line).not.toMatch(/\bjq\b/);
	});
});
