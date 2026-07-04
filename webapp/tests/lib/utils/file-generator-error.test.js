import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '$lib/utils/file-generator.js';

describe('TemplateEngine error handling', () => {

	it('should handle template string load errors in initialize', async () => {
		const engine = new TemplateEngine();
        const oldImport = Object.entries;
        Object.entries = () => { throw new Error('mock error'); };

		const res = await engine.initialize();
        Object.entries = oldImport;
		expect(res).toBe(false);
	});
});
