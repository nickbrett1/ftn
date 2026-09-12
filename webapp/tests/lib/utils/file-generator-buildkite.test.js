import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

const generate = (capabilities, configuration = {}) =>
	generateAllFiles({ name: 'test-project', capabilities, configuration });

const pipelineFrom = (files) => files.find((f) => f.filePath === '.buildkite/pipeline.yml');
const readmeFrom = (files) => files.find((f) => f.filePath === '.buildkite/README.md');

describe('Buildkite file generation', () => {
	it('generates the pipeline and its README for a node project', async () => {
		const files = await generate(['buildkite', 'devcontainer-node'], { buildkite: {} });

		const pipeline = pipelineFrom(files);
		expect(pipeline).toBeDefined();
		expect(readmeFrom(files)).toBeDefined();

		expect(pipeline.content).toContain('queue: mac-studio-linux');
		expect(pipeline.content).toContain('node:22-bookworm');
		expect(pipeline.content).toContain('npm ci --no-audit --no-fund --prefer-offline');
		expect(pipeline.content).toContain('npm run build --if-present');
		// Tests run through a placeholder guard: a plain `npm init` project has
		// "test": "echo \"Error: no test specified\" && exit 1", which fails by design.
		expect(pipeline.content).toContain('CI=true npm test');
		expect(pipeline.content).toContain('skipping tests');
		// Installs once, in a single job — the ftn measurements showed the
		// install dominates, so there is deliberately only one step.
		expect((pipeline.content.match(/npm ci/g) || []).length).toBe(1);
	});

	it('honours a configured queue', async () => {
		const files = await generate(['buildkite', 'devcontainer-node'], {
			buildkite: { queue: 'my-queue' }
		});
		const pipeline = pipelineFrom(files);
		expect(pipeline.content).toContain('queue: my-queue');
		expect(pipeline.content).not.toContain('queue: mac-studio-linux');
	});

	it('uses python commands for a python project', async () => {
		const files = await generate(['buildkite', 'devcontainer-python'], { buildkite: {} });
		const pipeline = pipelineFrom(files);

		expect(pipeline.content).toContain('python:3.13-slim');
		expect(pipeline.content).toContain('pip install --no-cache-dir -e ".[dev]"');
		expect(pipeline.content).toContain('ruff check src tests');
		expect(pipeline.content).toContain('pytest -q');
	});

	it('uses cargo for a rust project', async () => {
		const files = await generate(['buildkite', 'devcontainer-rust'], { buildkite: {} });
		const pipeline = pipelineFrom(files);

		expect(pipeline.content).toContain('rust:1-slim');
		expect(pipeline.content).toContain('cargo build --locked');
		expect(pipeline.content).toContain('cargo test --locked');
	});

	it('explains itself rather than failing for a java project', async () => {
		// genproj generates a Java devcontainer but no build system, so there is
		// genuinely nothing to build yet. A step that fails on the first push
		// would be worse than one that says so.
		const files = await generate(['buildkite', 'devcontainer-java'], { buildkite: {} });
		const pipeline = pipelineFrom(files);

		expect(pipeline.content).toContain('eclipse-temurin:21-jdk');
		expect(pipeline.content).toContain('genproj generates a Java devcontainer');
		expect(pipeline.content).not.toContain('npm ci');
	});

	it('installs playwright browsers when the project uses playwright', async () => {
		const files = await generate(['buildkite', 'devcontainer-node', 'playwright'], {
			buildkite: {}
		});
		const pipeline = pipelineFrom(files);

		expect(pipeline.content).toContain('playwright install --with-deps chromium');
	});

	it('documents the agent-side prerequisites in the generated README', async () => {
		const files = await generate(['buildkite', 'devcontainer-node'], { buildkite: {} });
		const readme = readmeFrom(files);

		// The two failures we actually hit on ftn: a missing plugins-path, and a
		// secret that never reached the container.
		expect(readme.content).toContain('plugins-path');
		expect(readme.content).toContain('does **not** reach the container');
		expect(readme.content).toContain('webhook');
		expect(readme.content).toContain('node:22-bookworm');
	});

	it('generates nothing when the buildkite capability is not selected', async () => {
		const files = await generate(['devcontainer-node'], {});
		expect(pipelineFrom(files)).toBeUndefined();
		expect(readmeFrom(files)).toBeUndefined();
	});

	it('adds a secret scan that gates the build when gitguardian is selected', async () => {
		const files = await generate(['buildkite', 'devcontainer-node', 'gitguardian'], {
			buildkite: {}
		});
		const content = pipelineFrom(files).content;

		expect(content).toContain('key: secret_scan');
		expect(content).toContain('gitguardian/ggshield');
		// NAME only: a step-level env: value never reaches the container.
		expect(content).toContain('- GITGUARDIAN_API_KEY');
		// The image has no ENTRYPOINT, so the full argv is spelled out.
		expect(content).toContain('command: ["ggshield", "secret", "scan", "path", "."]');
		// CircleCI made `build` require the scan; so does this.
		expect(content).toMatch(/key: build[\s\S]*?depends_on:\n {6}- secret_scan/);
	});

	it('adds a main-only Lighthouse step when lighthouse-ci is selected', async () => {
		const files = await generate(['buildkite', 'devcontainer-node', 'lighthouse-ci'], {
			buildkite: {}
		});
		const content = pipelineFrom(files).content;

		expect(content).toContain('key: lighthouse');
		expect(content).toContain('if: build.branch == "main"');
		// The pinned Playwright image, because Lighthouse needs real Chromium.
		expect(content).toContain('mcr.microsoft.com/playwright');
		expect(content).toContain('- CHROME_PATH');
		// .lighthouse.cjs is not a filename lhci discovers on its own.
		expect(content).toContain('lhci autorun --config .lighthouse.cjs');
	});

	it('runs Lighthouse on every branch when branch gating is off', async () => {
		const files = await generate(['buildkite', 'devcontainer-node', 'lighthouse-ci'], {
			buildkite: { branchGating: false }
		});
		expect(pipelineFrom(files).content).not.toContain('if: build.branch == "main"');
	});

	it('adds a main-only Cloudflare deploy when cloudflare-wrangler is selected', async () => {
		const files = await generate(
			['buildkite', 'devcontainer-node', 'cloudflare-wrangler', 'doppler'],
			{ buildkite: {} }
		);
		const content = pipelineFrom(files).content;

		expect(content).toContain('key: deploy');
		expect(content).toContain('if: build.branch == "main"');
		// With doppler selected the credentials are resolved from Doppler inside
		// the step (CircleCI got them from its context), so they are not listed
		// for forwarding from the agent environment.
		expect(content).toContain('doppler secrets get CLOUDFLARE_API_TOKEN');
		expect(content).not.toContain('            - CLOUDFLARE_API_TOKEN');
		expect(content).toContain('setup-wrangler-config.sh');
		expect(content).toContain('sync-doppler-secrets.sh');
		expect(content).toContain('npx --yes wrangler deploy');
		// A preview on every branch is off by default, matching CircleCI.
		expect(content).not.toContain('key: deploy_preview');
	});

	it('deploys without the Doppler steps when doppler is not selected', async () => {
		const files = await generate(['buildkite', 'devcontainer-node', 'cloudflare-wrangler'], {
			buildkite: {}
		});
		const content = pipelineFrom(files).content;

		expect(content).toContain('key: deploy');
		expect(content).not.toContain('DOPPLER_TOKEN');
		expect(content).not.toContain('sync-doppler-secrets.sh');
		// Without doppler there is nothing to resolve the credentials with, so
		// they have to come from the agent environment.
		expect(content).toContain('            - CLOUDFLARE_API_TOKEN');
		expect(content).toContain('            - CLOUDFLARE_ACCOUNT_ID');
	});

	it('adds a preview deploy for branches when branch gating is off', async () => {
		const files = await generate(
			['buildkite', 'devcontainer-node', 'cloudflare-wrangler', 'doppler'],
			{ buildkite: { branchGating: false } }
		);
		const content = pipelineFrom(files).content;

		expect(content).toContain('key: deploy_preview');
		expect(content).toContain('wrangler deploy --env preview');
		expect(content).toContain('build.branch != "main"');
	});

	it('publishes the container image on the agent when docker-container is selected', async () => {
		const files = await generateAllFiles({
			name: 'demo',
			registryNamespace: 'nickbrett1',
			capabilities: ['buildkite', 'devcontainer-node', 'docker-container', 'docker'],
			configuration: { buildkite: {} }
		});
		const content = pipelineFrom(files).content;

		expect(content).toContain('key: docker_publish');
		expect(content).toContain('ghcr.io/nickbrett1/demo');
		expect(content).toContain('type=registry,ref=$$CACHE_REF,mode=max');
		// Needs a Docker daemon, so it runs on the agent rather than in a
		// container - i.e. no docker plugin on this step.
		expect(content).toMatch(/key: docker_publish[\s\S]*?commands:/);
		expect(content).not.toMatch(/key: docker_publish[\s\S]*?docker#v5\.13\.0/);
	});

	it('adds a notification step when ntfy is configured', async () => {
		const files = await generate(
			['buildkite', 'devcontainer-node', 'cloudflare-wrangler', 'doppler'],
			{ buildkite: { ntfyNotifications: true } }
		);
		const content = pipelineFrom(files).content;

		expect(content).toContain(':loudspeaker: Notify');
		expect(content).toContain('NTFY_URL_CIRCLECI_BUILD');
		expect(content).toContain('allow_dependency_failure: true');
	});

	it('contributes no extra steps when no contributing capability is selected', async () => {
		const files = await generate(['buildkite', 'devcontainer-node'], { buildkite: {} });
		const content = pipelineFrom(files).content;

		// Step keys, not raw substrings: the template's header comment names the
		// contributing capabilities on purpose.
		for (const key of [
			'key: secret_scan',
			'key: lighthouse',
			'key: deploy',
			'key: docker_publish'
		]) {
			expect(content).not.toContain(key);
		}
		expect(content).not.toContain(':loudspeaker:');
	});

	it('activates the npm version the project pins, before installing', async () => {
		// The generated package.json declares `packageManager` and .npmrc sets
		// engine-strict=true, so the image's bundled npm refuses to install and
		// dies with "Cannot read properties of null (reading 'edgesOut')". This
		// is CircleCI's activate_pinned_npm step, and leaving it out is why the
		// first fleet build of a generated project failed.
		const files = await generate(['buildkite', 'devcontainer-node'], { buildkite: {} });
		const content = pipelineFrom(files).content;

		expect(content).toContain("require('./package.json').packageManager");
		expect(content).toContain('npm install -g "npm@$$PINNED"');
	});

	it('guards npm ci behind a lockfile check', async () => {
		// A generated project ships a package.json but no package-lock.json, so
		// a bare `npm ci` fails outright.
		const files = await generate(['buildkite', 'devcontainer-node'], { buildkite: {} });
		expect(pipelineFrom(files).content).toContain('if [ -f package-lock.json ]; then npm ci');
	});

	it('runs tests non-interactively so vitest cannot hang in watch mode', async () => {
		// The docker plugin allocates a TTY, and with a TTY vitest starts in
		// watch mode and holds the step open until the job is killed. CircleCI
		// has no TTY, which is why this only bites on Buildkite.
		const files = await generate(['buildkite', 'devcontainer-node'], { buildkite: {} });
		expect(pipelineFrom(files).content).toContain('CI=true npm test');
	});

	it('pins the container platform to the fleet architecture', async () => {
		// Without this, docker resolves a multi-arch tag to linux/amd64 and runs
		// every step emulated on an Apple-silicon fleet.
		const files = await generate(['buildkite', 'devcontainer-node'], { buildkite: {} });
		expect(pipelineFrom(files).content).toContain('platform: linux/arm64');
	});
});
