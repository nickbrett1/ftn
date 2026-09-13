/**
 * @fileoverview Regression guards for the phantom-job fix.
 *
 * The deploy step used to be one file (`deploy.yml`) holding two steps selected
 * by mutually exclusive `if:` conditions. When a step's `if:` is false Buildkite
 * still creates a job object for it: no agent, exit_status null, zero log rows,
 * and — the problem — the terminal state `broken`. A green main build therefore
 * reported `Deploy preview` as a *problem* job (get_build_failure_summary counts
 * it among the failures), and vice versa on branches.
 *
 * The fix splits the step in two and moves the branch policy into
 * bootstrap.sh's upload decision, so the inapplicable step is never created.
 * This mirrors the Lighthouse step, which was already uploaded conditionally.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const stepsDir = path.join(repoRoot, '.buildkite', 'steps');
const bootstrapPath = path.join(repoRoot, '.buildkite', 'bootstrap.sh');

const productionYml = fs.readFileSync(path.join(stepsDir, 'deploy-production.yml'), 'utf8');
const previewYml = fs.readFileSync(path.join(stepsDir, 'deploy-preview.yml'), 'utf8');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');

// YAML comments legitimately mention `if:` to explain why it is gone, so only
// real lines are inspected.
function yamlCode(yml) {
	return yml
		.split('\n')
		.filter((line) => !line.trim().startsWith('#'))
		.join('\n');
}

describe('deploy steps - split by branch', () => {
	it('no longer ships the combined deploy.yml', () => {
		expect(fs.existsSync(path.join(stepsDir, 'deploy.yml'))).toBe(false);
	});

	it('keeps the production and preview steps in separate files', () => {
		expect(productionYml).toContain('key: deploy');
		expect(productionYml).toContain('":rocket: Deploy (production)"');
		expect(previewYml).toContain('key: deploy_preview');
		expect(previewYml).toContain('":rocket: Deploy preview"');
	});

	it('has no step-level `if:` left to produce a phantom broken job', () => {
		const hasStepIf = (yml) =>
			yamlCode(yml)
				.split('\n')
				.some((line) => line.trimStart().startsWith('if:'));
		expect(hasStepIf(productionYml)).toBe(false);
		expect(hasStepIf(previewYml)).toBe(false);
	});

	it('bootstrap.sh uploads the production step only on main', () => {
		const mainGuard = bootstrap.indexOf('"${BUILDKITE_BRANCH:-}" == "main"');
		const productionUpload = bootstrap.indexOf('steps/deploy-production.yml');
		// The upload must sit inside the main branch guard, not before it.
		expect(mainGuard).toBeGreaterThan(-1);
		expect(productionUpload).toBeGreaterThan(mainGuard);
	});
});
