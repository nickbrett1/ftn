import { describe, it, expect } from 'vitest';
import { generatePackageJson, generateViteConfigFile, generateAllFiles } from '$lib/utils/file-generator.js';

describe('file-generator sonarcloud capabilities', () => {
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

	it('should generate sonar-project.properties for sonarcloud capability', async () => {
		const context = {
			capabilities: ['sonarcloud'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const sonarFile = files.find(f => f.filePath === 'sonar-project.properties');

		expect(sonarFile).toBeDefined();
		expect(sonarFile.content).toContain('sonar.projectKey');
	});

	it('should include lcov paths in sonar-project.properties for devcontainer-node', async () => {
		const context = {
			capabilities: ['sonarcloud', 'devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const sonarFile = files.find(f => f.filePath === 'sonar-project.properties');

		expect(sonarFile).toBeDefined();
		expect(sonarFile.content).toContain('sonar.javascript.lcov.reportPaths=coverage/lcov.info');
	});

	it('should add vitest coverage to package.json for devcontainer-node + sonarcloud', () => {
		const context = {
			capabilities: ['devcontainer-node', 'sonarcloud'],
			projectName: 'test-project'
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		expect(result.content).toContain('@vitest/coverage-v8');
	});

	it('should output coverage in vite.config.js for sonarcloud', () => {
		const context = { capabilities: ['sonarcloud'] };
		const result = generateViteConfigFile(context);
		expect(result.content).toContain("coverage: { reporter: ['lcov', 'text'] }");
	});

	it('should output coverage in sveltekit vite.config.js for sonarcloud', () => {
		const context = { capabilities: ['sonarcloud', 'sveltekit'] };
		const result = generateViteConfigFile(context);
		expect(result.content).toContain("coverage: { reporter: ['lcov', 'text'] }");
	});
});
