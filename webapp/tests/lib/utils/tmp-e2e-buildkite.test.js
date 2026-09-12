/**
 * TEMPORARY end-to-end smoke test (deleted after the run).
 *
 * Generates a real project with the buildkite capability: a real GitHub repo
 * and a real Buildkite pipeline, then asserts the provisioning result. It
 * creates external state on purpose, which is why it is not committed.
 */
import { describe, it, expect } from 'vitest';
import { ProjectGeneratorService } from '$lib/server/project-generator.js';
import { BuildkiteAPIService } from '$lib/server/buildkite-api.js';

const GH = process.env.SMOKE_GITHUB_TOKEN;
const BK = process.env.SMOKE_BUILDKITE_TOKEN;
const PROJECT = process.env.SMOKE_PROJECT_NAME || `genproj-bk-smoke-${Date.now()}`;

describe('e2e: generate a project with the buildkite capability', () => {
	it('creates the repo, the pipeline, registers the webhook and triggers a build', async () => {
		expect(GH, 'SMOKE_GITHUB_TOKEN').toBeTruthy();
		expect(BK, 'SMOKE_BUILDKITE_TOKEN').toBeTruthy();

		const service = new ProjectGeneratorService({ github: GH, buildkite: BK });
		const result = await service.generateProject({
			projectName: PROJECT,
			capabilities: ['buildkite', 'devcontainer-node', 'sveltekit', 'code-quality', 'dependabot'],
			configuration: { buildkite: {} }
		});

		console.log('\n=== generation result ===');
		console.log('success:', result.success);
		console.log('repo:', result.repository?.htmlUrl || result.repository?.fullName);
		console.log('externalServices:', JSON.stringify(result.externalServices, null, 2));
		console.log('files:', result.generatedFiles?.length);

		expect(result.success).toBe(true);
		const bk = result.externalServices.buildkite;
		expect(bk).toBeDefined();
		expect(bk.success).toBe(true);
		expect(bk.webhookRegistered).toBe(true);

		// The pipeline must advertise a webhook URL — necessary, not
		// sufficient, but it is the signal the API exposes.
		const api = new BuildkiteAPIService(BK);
		const pipeline = await api.getPipeline(bk.organization, bk.pipeline.slug);
		console.log('pipeline:', pipeline.web_url);
		console.log('hasWebhookUrl:', Boolean(pipeline?.provider?.webhook_url));
		console.log('build:', JSON.stringify(bk.build));

		expect(pipeline?.provider?.webhook_url).toBeTruthy();
	}, 300_000);
});
