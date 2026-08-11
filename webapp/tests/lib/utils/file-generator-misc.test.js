import { describe, it, expect } from 'vitest';
import { generatePyProjectToml, generateCloudLoginFiles } from '$lib/utils/file-generator.js';

describe('file-generator misc coverage', () => {
	it('should add dagster dependencies to pyproject.toml (devcontainer-python + dagster)', () => {
		const context = {
			capabilities: ['devcontainer-python', 'dagster'],
			projectName: 'test-project'
		};

		const files = generatePyProjectToml(context);
		const pyproject = files.find((f) => f.filePath === 'pyproject.toml');
		expect(pyproject).toBeDefined();
		expect(pyproject.content).toContain('"dagster"');
	});

	it('should emit a src-layout pyproject with dev extras (no pytest runtime dep, no flat packages)', () => {
		const context = {
			capabilities: ['devcontainer-python'],
			projectName: 'test-project'
		};

		const files = generatePyProjectToml(context);
		const pyproject = files.find((f) => f.filePath === 'pyproject.toml');
		expect(pyproject).toBeDefined();
		// src layout package discovery
		expect(pyproject.content).toContain('[tool.setuptools.packages.find]');
		expect(pyproject.content).toContain('where = ["src"]');
		// pytest/ruff are dev extras, not runtime deps
		expect(pyproject.content).toContain('[project.optional-dependencies]');
		expect(pyproject.content).toContain('"pytest>=8.0"');
		expect(pyproject.content).toContain('"ruff>=0.4"');
		expect(pyproject.content).not.toContain('packages = []');
		expect(pyproject.content).not.toContain('python_files');
		// scaffolded src/<pkg>/ + tests/
		expect(files.some((f) => f.filePath === 'src/test_project/__init__.py')).toBe(true);
		expect(files.some((f) => f.filePath === 'tests/test_smoke.py')).toBe(true);
	});

	it('should process wrangler capabilities properly', () => {
		const context = {
			capabilities: ['doppler', 'cloudflare-wrangler'],
			projectName: 'test-project',
			configuration: {
				doppler: { config: 'dev' }
			}
		};

		const mockTemplateEngine = {
			generateFile: () => 'mocked'
		};

		const result = generateCloudLoginFiles(mockTemplateEngine, context);
		const wranglerTemplate = result.find((f) => f.filePath === 'wrangler.template.jsonc');
		expect(wranglerTemplate).toBeDefined();

		const syncDoppler = result.find((f) => f.filePath === 'scripts/sync-doppler-secrets.sh');
		expect(syncDoppler).toBeDefined();
	});
});
