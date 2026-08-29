import { describe, it, expect } from 'vitest';
import {
	generatePackageJson,
	generateAllFiles,
	buildSveltekitSmokeTest
} from '$lib/utils/file-generator.js';

describe('file-generator package-json coverage', () => {
	const mockTemplateEngine = {
		generateFile: (templateName, context) => {
			if (templateName === 'package-json') {
				return JSON.stringify({
					devDependencies: context.devDependencies
				});
			}
			return '';
		}
	};

	it('should add vitest coverage when sveltekit, devcontainer-node, and sonarcloud are selected', () => {
		const context = {
			capabilities: ['sveltekit', 'devcontainer-node', 'sonarcloud'],
			projectName: 'test-project'
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		expect(result.content).toContain('@vitest/coverage-v8');
	});

	it('should add vitest coverage when wrangler, devcontainer-node, and sonarcloud are selected', () => {
		const context = {
			capabilities: ['cloudflare-wrangler', 'devcontainer-node', 'sonarcloud'],
			projectName: 'test-project'
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		expect(result.content).toContain('@vitest/coverage-v8');
	});
});

describe('file-generator package.json test script', () => {
	const base = {
		repositoryUrl: '',
		configuration: {},
		authTokens: {},
		userId: 'test'
	};

	it('renders exactly one test script (no duplicate key) with the real template', async () => {
		const files = await generateAllFiles({
			...base,
			projectName: 'DupTest',
			capabilities: ['sveltekit', 'devcontainer-node']
		});

		const pj = files.find((f) => f.filePath === 'package.json');
		expect(pj).toBeDefined();
		const content = pj.content;
		const parsed = JSON.parse(content);
		expect(parsed.scripts.test).toBe('vitest --coverage');
		expect(parsed.scripts['test:once']).toBe('npx vitest run --changed');
		// The bug produced a duplicated "test" key in the JSON. Assert only one.
		expect((content.match(/"test"\s*:/g) || []).length).toBe(1);
	});

	it('keeps the placeholder test script when vitest is not selected', async () => {
		// cloudflare-wrangler generates a package.json without devcontainer-node,
		// so the placeholder test script (not the vitest one) must be present.
		const files = await generateAllFiles({
			...base,
			projectName: 'NoTests',
			capabilities: ['cloudflare-wrangler']
		});

		const pj = files.find((f) => f.filePath === 'package.json');
		expect(pj).toBeDefined();
		const parsed = JSON.parse(pj.content);
		expect(parsed.scripts.test).toContain('no test specified');
	});

	it('smoke test exercises the health route and omits the trivial test when health exists', () => {
		const withHealth = buildSveltekitSmokeTest(true);
		expect(withHealth).toContain('health endpoint returns ok');
		expect(withHealth).not.toContain('smoke test passes');

		const withoutHealth = buildSveltekitSmokeTest(false);
		expect(withoutHealth).not.toContain('health endpoint');
		expect(withoutHealth).toContain('smoke test passes');
	});
});
