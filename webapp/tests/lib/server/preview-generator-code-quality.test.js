import { describe, it, expect } from 'vitest';
import { generatePreview } from '$lib/server/preview-generator.js';

describe('preview-generator code-quality capability', () => {
	it('should add eslint devDependencies and lint script when code-quality selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {}
		};

		const previewData = await generatePreview(projectConfig, ['code-quality', 'devcontainer-node']);
		const packageJsonFile = previewData.files.find((f) => f.name === 'package.json');
		expect(packageJsonFile).toBeDefined();

		const content = JSON.parse(packageJsonFile.content);
		expect(content.devDependencies).toHaveProperty('eslint');
		expect(content.devDependencies).toHaveProperty('eslint-plugin-sonarjs');
		expect(content.devDependencies).toHaveProperty('eslint-config-prettier');
		expect(content.devDependencies).toHaveProperty('@eslint/js');
		expect(content.devDependencies).toHaveProperty('globals');
		expect(content.devDependencies).toHaveProperty('prettier');
		expect(content.scripts.lint).toBe('prettier --check . && eslint .');
	});

	it('should generate eslint.config.js consistent with main app rules', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {}
		};

		const previewData = await generatePreview(projectConfig, ['code-quality', 'devcontainer-node']);
		const eslintConfig = previewData.files.find((f) => f.name === 'eslint.config.js');
		expect(eslintConfig).toBeDefined();
		expect(eslintConfig.content).toContain('import prettier from "eslint-config-prettier";');
		expect(eslintConfig.content).toContain('import globals from "globals";');
		expect(eslintConfig.content).toContain('"sonarjs/no-duplicate-string": "warn"');
		expect(eslintConfig.content).toContain('"sonarjs/cognitive-complexity": ["warn", 20]');
		expect(eslintConfig.content).toContain('"security/detect-object-injection": "warn"');
	});
});
