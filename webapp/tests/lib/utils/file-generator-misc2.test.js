import { describe, it, expect } from 'vitest';
import { generateGitignoreFile, generateVscodeSettingsFile } from '$lib/utils/file-generator.js';

describe('file-generator misc coverage 2', () => {

	it('should add wrangler ignores', () => {
		const context = {
			capabilities: ['cloudflare-wrangler', 'doppler'],
			projectName: 'test-project'
		};

        const mockTemplateEngine = {
            generateFile: (name, data) => JSON.stringify(data)
        };

		const result = generateGitignoreFile(mockTemplateEngine, context);
		expect(result.content).toContain('.wrangler');
		expect(result.content).toContain('wrangler.jsonc');
	});

	it('should add dagster ignores', () => {
		const context = {
			capabilities: ['devcontainer-python', 'dagster'],
			projectName: 'test-project'
		};

        const mockTemplateEngine = {
            generateFile: (name, data) => JSON.stringify(data)
        };

		const result = generateGitignoreFile(mockTemplateEngine, context);
		expect(result.content).toContain('.tmp_dagster*');
	});

    it('should fall back to raw content for vscode settings', () => {
		const context = {
			capabilities: ['devcontainer-python'],
			projectName: 'test-project'
		};

        const mockTemplateEngine = {
            generateFile: () => 'not-json-content'
        };

		const result = generateVscodeSettingsFile(mockTemplateEngine, context);
		expect(result.content).toBe('not-json-content');
	});
});
