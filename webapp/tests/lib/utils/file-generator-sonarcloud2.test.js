import { describe, it, expect } from 'vitest';
import { generatePackageJson } from '$lib/utils/file-generator.js';

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
