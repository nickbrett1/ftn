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
		expect(pipeline.content).toContain('npm test --if-present');
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
});
