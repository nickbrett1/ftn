import { describe, it, expect, vi } from 'vitest';
import { TemplateEngine } from '../../src/lib/utils/file-generator.js';
import * as fallbackTemplates from '../../src/lib/config/fallback-templates';

vi.mock('../../src/lib/config/fallback-templates', () => ({
	devcontainerNodeJson: '{"mock": "fallback"}'
}));

describe('TemplateEngine with R2 errors', () => {
	it('should fall back to local templates if R2 throws an error', async () => {
		const mockR2Bucket = {
			list: vi.fn().mockResolvedValue({ objects: [] }),
			get: vi.fn().mockRejectedValue(new Error('Network error'))
		};

		const engine = new TemplateEngine(mockR2Bucket);
		// Suppress expected error logs during initialization if list also fails or just generic setup
		// In this test, list succeeds (returns empty), so initialize succeeds.
		await engine.initialize();

		// Register the fallback explicitly
		engine.registerFallbackTemplate('devcontainer-node-json', 'devcontainerNodeJson');

		// This should not throw, but return the fallback content
		const template = await engine.getTemplate('devcontainer-node-json');

		expect(template).toBe('{"mock": "fallback"}');
		expect(mockR2Bucket.get).toHaveBeenCalledWith('devcontainer-node-json');
	});
});
