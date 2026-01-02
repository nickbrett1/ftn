import { describe, it, expect } from 'vitest';
import { generatePreview } from '../../../src/lib/server/preview-generator.js';

describe('Preview Generation', () => {
	it('should generate a preview with Doppler, SvelteKit, Node.js container, and Wrangler deployment', async () => {
		const projectConfig = {
			name: 'test-project',
			isPrivate: true,
			configuration: {}
		};
		const selectedCapabilities = [
			'doppler',
			'sveltekit',
			'devcontainer-node',
			'cloudflare-wrangler'
		];

		const preview = await generatePreview(projectConfig, selectedCapabilities);

		expect(preview).toBeDefined();
		expect(preview.files).toBeDefined();
		expect(preview.files.length).toBeGreaterThan(0);
		expect(preview.externalServices).toBeDefined();
		expect(preview.summary).toBeDefined();
		expect(preview.summary.isValid).toBe(true);
	});
});
