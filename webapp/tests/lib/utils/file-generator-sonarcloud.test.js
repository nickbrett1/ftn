import { describe, it, expect } from 'vitest';
import {
	generatePackageJson,
	generateViteConfigFile,
	generateAllFiles
} from '$lib/utils/file-generator.js';

describe('file-generator sonarcloud capabilities', () => {
	const mockTemplateEngine = {
		generateFile: (templateName, context) => {
			if (templateName === 'package-json') {
				return JSON.stringify({
					devDependencies: context.devDependencies,
					scripts: context.scripts
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
		const sonarFile = files.find((f) => f.filePath === 'sonar-project.properties');

		expect(sonarFile).toBeDefined();
		expect(sonarFile.content).toContain('sonar.projectKey');
		expect(sonarFile.content).toContain('sonar.qualitygate.wait=true');
	});

	it('should include lcov paths in sonar-project.properties for devcontainer-node', async () => {
		const context = {
			capabilities: ['sonarcloud', 'devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const sonarFile = files.find((f) => f.filePath === 'sonar-project.properties');

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

	it('should add vitest coverage to package.json for devcontainer-node without sonarcloud', () => {
		const context = {
			capabilities: ['devcontainer-node'],
			projectName: 'test-project'
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		expect(result.content).toContain('@vitest/coverage-v8');
		expect(result.content).toContain('vitest --coverage');
	});

	it('outputs lcov coverage reporter without enforced thresholds (scaffold-safe) for sonarcloud', () => {
		const context = { capabilities: ['sonarcloud'] };
		const result = generateViteConfigFile(context);
		expect(result.content).toContain('reporter: ["lcov", "text"]');
		// Thresholds are intentionally NOT enforced on fresh generated projects
		// (a bare scaffold would fail an 80% gate). lcov still feeds SonarCloud.
		expect(result.content).not.toContain('thresholds:');
		expect(result.content).not.toContain('lines: 80');
	});

	it('outputs lcov coverage reporter without enforced thresholds in sveltekit vite.config.js for sonarcloud', () => {
		const context = { capabilities: ['sonarcloud', 'sveltekit'] };
		const result = generateViteConfigFile(context);
		expect(result.content).toContain('reporter: ["lcov", "text"]');
		expect(result.content).not.toContain('thresholds:');
		expect(result.content).not.toContain('lines: 80');
	});

	it('outputs lcov coverage reporter without enforced thresholds without sonarcloud', () => {
		const context = { capabilities: ['devcontainer-node'] };
		const result = generateViteConfigFile(context);
		expect(result.content).toContain('reporter: ["lcov", "text"]');
		expect(result.content).not.toContain('thresholds:');
		expect(result.content).not.toContain('lines: 80');
	});
});
