import { describe, it, expect } from 'vitest';
import { devcontainerNodeJson, playwrightConfig } from '$lib/config/fallback-templates.js';

describe('fallback-templates', () => {
	it('should export devcontainerNodeJson string', () => {
		expect(devcontainerNodeJson).toBeDefined();
		expect(typeof devcontainerNodeJson).toBe('string');
		expect(devcontainerNodeJson).toContain('"name": "Node.js"');
	});

	it('should export playwrightConfig string', () => {
		expect(playwrightConfig).toBeDefined();
		expect(typeof playwrightConfig).toBe('string');
		expect(playwrightConfig).toContain('defineConfig');
	});
});
