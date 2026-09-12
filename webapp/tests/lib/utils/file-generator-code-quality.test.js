import { describe, it, expect } from 'vitest';
import { generatePackageJson, generateAllFiles } from '$lib/utils/file-generator.js';

describe('file-generator code-quality capability', () => {
	const mockTemplateEngine = {
		generateFile: (templateName, context) => {
			if (templateName === 'package-json') {
				// `scriptsBlock` carries the scripts body (the hook entries are
				// conditional on code-quality, so the template no longer owns them).
				return JSON.stringify({
					scripts: context.scriptsBlock,
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

	it('should auto-accept the npx install when installing git hooks in the devcontainer', async () => {
		const files = await generateAllFiles({
			projectName: 'test-project',
			repositoryUrl: '',
			capabilities: ['code-quality', 'devcontainer-node'],
			configuration: {},
			authTokens: {},
			userId: 'test'
		});

		const postCreateSetup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(postCreateSetup).toBeDefined();
		// Plain `npx simple-git-hooks` blocks the (non-interactive) container
		// build with "Ok to proceed? (y)" — it must auto-accept with --yes.
		expect(postCreateSetup.content).toContain('&& npx --yes simple-git-hooks) || echo "WARN:');
		expect(postCreateSetup.content).not.toContain('&& npx simple-git-hooks)');
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
		expect(eslintConfig.content).toContain('import sonarjs from "eslint-plugin-sonarjs";');
		expect(eslintConfig.content).toContain('import prettier from "eslint-config-prettier";');
		expect(eslintConfig.content).toContain('import globals from "globals";');
		expect(eslintConfig.content).toContain('"sonarjs/cognitive-complexity": ["warn", 20]');
		expect(eslintConfig.content).toContain('"security/detect-object-injection": "warn"');
		expect(eslintConfig.content).toContain('...globals.vitest');
		// Vendored .agents tooling is ignored so generated projects lint cleanly
		expect(eslintConfig.content).toContain('".agents/**"');
	});

	it('omits the git-hook entries when their tooling is absent', async () => {
		// Regression: `prepare` (and the simple-git-hooks / lint-staged config)
		// was hardcoded in the template, while simple-git-hooks only arrives with
		// code-quality. A generated project WITHOUT code-quality therefore could
		// not install at all: "sh: 1: simple-git-hooks: not found", exit 127.
		const files = await generateAllFiles({
			name: 'demo',
			capabilities: ['devcontainer-node'],
			configuration: {}
		});
		const pkg = JSON.parse(files.find((f) => f.filePath === 'package.json').content);

		expect(pkg.scripts.prepare).toBeUndefined();
		expect(pkg['simple-git-hooks']).toBeUndefined();
		expect(pkg['lint-staged']).toBeUndefined();
		// The rest of the scripts survive the first entry being dropped.
		expect(pkg.scripts.test).toBeTruthy();
	});

	it('emits the git-hook entries when code-quality is selected', async () => {
		const files = await generateAllFiles({
			name: 'demo',
			capabilities: ['devcontainer-node', 'code-quality'],
			configuration: {}
		});
		const pkg = JSON.parse(files.find((f) => f.filePath === 'package.json').content);

		expect(pkg.scripts.prepare).toBe('simple-git-hooks');
		expect(pkg['simple-git-hooks']).toEqual({ 'pre-commit': 'npx lint-staged' });
		expect(pkg['lint-staged']).toBeDefined();
	});
});
