import { describe, it, expect } from 'vitest';
import { generatePyProjectToml, generateCloudLoginFiles } from '$lib/utils/file-generator.js';

describe('file-generator misc coverage', () => {

	it('should add dagster dependencies to pyproject.toml', () => {
		const context = {
			capabilities: ['devcontainer-python', 'dagster'],
			projectName: 'test-project'
		};

		const result = generatePyProjectToml(context);
		expect(result.content).toContain('dagster');
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
		const wranglerTemplate = result.find(f => f.filePath === 'wrangler.template.jsonc');
        expect(wranglerTemplate).toBeDefined();

        const syncDoppler = result.find(f => f.filePath === 'scripts/sync-doppler-secrets.sh');
        expect(syncDoppler).toBeDefined();
	});
});
