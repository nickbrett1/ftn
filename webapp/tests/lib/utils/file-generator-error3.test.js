import { describe, it, expect } from 'vitest';
import { generatePackageJson } from '$lib/utils/file-generator.js';

describe('file-generator missing capabilities', () => {

	it('should return undefined if neither devcontainer-node nor cloudflare-wrangler are selected', () => {
		const context = {
			capabilities: [],
			projectName: 'test-project'
		};

		const mockTemplateEngine = {
			generateFile: () => ''
		};

		const result = generatePackageJson(mockTemplateEngine, context);
		expect(result).toBeUndefined();
	});

});
