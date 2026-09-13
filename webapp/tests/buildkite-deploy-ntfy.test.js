/**
 * @fileoverview Regression guards for this repo's own Buildkite deploy step
 * (`.buildkite/steps/deploy-production.yml`), which notifies ntfy on a
 * successful production deploy. The step used to live in a shared deploy.yml
 * gated by a step-level `if:`; it is now uploaded only on main (see
 * buildkite-deploy-steps.test.js for the split itself).
 *
 * Two bugs surfaced after the CircleCI -> Buildkite port and are pinned here:
 *
 *  1. The notification URL was resolved with `doppler secrets get --plain` but
 *     then piped through `jq -r .computed`. `--plain` emits the raw secret, not
 *     the `{ ..., "computed": ... }` shape jq expects, so jq failed, the
 *     `2>/dev/null || true` hid it, and NTFY_URL came back empty - silently
 *     skipping the notification while the deploy stayed green (builds 67-69).
 *
 *  2. The short commit was extracted with the bash-only substring expansion
 *     (dollar-brace VAR : 0 : 7). The docker plugin runs commands via `sh -e -c`
 *     and /bin/sh is dash, which rejects that form with "Bad substitution" and
 *     exits 2, failing an otherwise-successful deploy (build 71).
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deployYmlPath = path.resolve(
	__dirname,
	'..',
	'..',
	'.buildkite',
	'steps',
	'deploy-production.yml'
);

const deployYml = fs.readFileSync(deployYmlPath, 'utf8');
// Comments may legitimately discuss the forbidden forms, so only executable
// lines are checked.
const deployCode = deployYml
	.split('\n')
	.filter((line) => !line.trim().startsWith('#'))
	.join('\n');

function ntfyLookupLine() {
	// The single command that resolves the notification URL from Doppler.
	return deployYml
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

	it('extracts the short commit POSIX-safely (no bash substring under dash)', () => {
		// /bin/sh is dash in the deploy container, where the bash substring
		// expansion is a fatal "Bad substitution"; cut/sed must be used instead.
		expect(deployCode).not.toMatch(/\$\{[A-Za-z_]\w*:\d+:\d+\}/);
	});

	it('forwards BUILDKITE_BRANCH and BUILDKITE_COMMIT into the container', () => {
		// The docker plugin only passes the variables named in `environment`;
		// otherwise the notification's branch/commit expand to empty strings.
		expect(deployYml).toContain('- BUILDKITE_BRANCH');
		expect(deployYml).toContain('- BUILDKITE_COMMIT');
	});

	it('includes the commit subject in the message', () => {
		// CircleCI's notification carried the commit subject; the Buildkite
		// message should too.
		expect(deployYml).toContain('git log');
	});
});
