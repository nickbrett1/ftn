import { describe, it, expect } from 'vitest';
import { generatePackageJson, generateAllFiles } from '$lib/utils/file-generator.js';

describe('file-generator code-quality capability', () => {
	const mockTemplateEngine = {
		generateFile: (templateName, context) => {
			if (templateName === 'package-json') {
				return JSON.stringify({
					scripts: context.scripts,
					devDependencies: context.devDependencies
				});
			}
			return '';
		}
	};

	it('should add eslint devDependencies when code-quality is selected', () => {
		const context = {
			capabilities: ['code-quality', 'devcontainer-node'],
			projectName: 'test-project'
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		const pkg = JSON.parse(result.content);
		expect(pkg.devDependencies).toContain('"eslint":');
		expect(pkg.devDependencies).toContain('"@eslint/js":');
		expect(pkg.devDependencies).toContain('"eslint-config-prettier":');
		expect(pkg.devDependencies).toContain('"eslint-plugin-sonarjs":');
		expect(pkg.devDependencies).toContain('"eslint-plugin-security":');
		expect(pkg.devDependencies).toContain('"globals":');
		expect(pkg.devDependencies).toContain('"prettier":');
		expect(pkg.devDependencies).toContain('"simple-git-hooks":');
		expect(pkg.devDependencies).toContain('"lint-staged":');
	});

	it('should add a lint script when code-quality is selected', () => {
		const context = {
			capabilities: ['code-quality', 'devcontainer-node'],
			projectName: 'test-project'
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		const pkg = JSON.parse(result.content);
		expect(pkg.scripts).toContain('"lint": "prettier --check . && eslint ."');
	});

	it('should not add eslint devDependencies or lint script without code-quality', () => {
		const context = {
			capabilities: ['devcontainer-node'],
			projectName: 'test-project'
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		const pkg = JSON.parse(result.content);
		expect(pkg.devDependencies).not.toContain('"eslint":');
		expect(pkg.scripts).not.toContain('"lint"');
	});

	it('should generate eslint.config.js when code-quality is selected', async () => {
		const files = await generateAllFiles({
			projectName: 'test-project',
			repositoryUrl: '',
			capabilities: ['code-quality', 'devcontainer-node'],
			configuration: {},
			authTokens: {},
			userId: 'test'
		});

		const eslintConfig = files.find((f) => f.filePath === 'eslint.config.js');
		expect(eslintConfig).toBeDefined();
		expect(eslintConfig.content).toContain("import sonarjs from 'eslint-plugin-sonarjs';");
		expect(eslintConfig.content).toContain("import prettier from 'eslint-config-prettier';");
		expect(eslintConfig.content).toContain("import globals from 'globals';");
		expect(eslintConfig.content).toContain("'sonarjs/cognitive-complexity': ['warn', 20]");
		expect(eslintConfig.content).toContain("'security/detect-object-injection': 'warn'");
		expect(eslintConfig.content).toContain('...globals.vitest');
	});
});
