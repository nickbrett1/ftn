import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('SvelteKit File Generation', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should generate SvelteKit project files correctly', async () => {
		const context = {
			name: 'sveltekit-project',
			capabilities: ['sveltekit', 'devcontainer-node'],
			configuration: {
				'devcontainer-node': { nodeVersion: '20' }
			}
		};

		const files = await generateAllFiles(context);

		// Check package.json
		const packageJson = files.find((f) => f.filePath === 'package.json');
		expect(packageJson).toBeDefined();
		const content = JSON.parse(packageJson.content);
		expect(content.type).toBe('module');
		expect(content.scripts).toHaveProperty('dev', 'vite dev');
		expect(content.scripts).toHaveProperty('check', 'svelte-kit sync && svelte-check --tsconfig ./jsconfig.json');
		expect(content.devDependencies).toHaveProperty('@sveltejs/kit');
		expect(content.devDependencies).toHaveProperty('@sveltejs/adapter-auto');
		expect(content.devDependencies).not.toHaveProperty('wrangler');

		// Check SvelteKit files
		expect(files.find((f) => f.filePath === 'src/app.html')).toBeDefined();
		expect(files.find((f) => f.filePath === 'src/routes/+page.svelte')).toBeDefined();
		expect(files.find((f) => f.filePath === 'vite.config.js')).toBeDefined();
		expect(files.find((f) => f.filePath === 'jsconfig.json')).toBeDefined();

		// Check svelte.config.js adapter
		const svelteConfig = files.find((f) => f.filePath === 'svelte.config.js');
		expect(svelteConfig).toBeDefined();
		expect(svelteConfig.content).toContain('@sveltejs/adapter-auto');
	});

	it('should generate SvelteKit + Wrangler project correctly', async () => {
		const context = {
			name: 'sveltekit-wrangler-project',
			capabilities: ['sveltekit', 'devcontainer-node', 'cloudflare-wrangler'],
			configuration: {
				'devcontainer-node': { nodeVersion: '20' },
				'cloudflare-wrangler': { workerType: 'web' }
			}
		};

		const files = await generateAllFiles(context);

		// Check package.json
		const packageJson = files.find((f) => f.filePath === 'package.json');
		const content = JSON.parse(packageJson.content);
		expect(content.type).toBe('module');
		expect(content.scripts).toHaveProperty('deploy', 'wrangler deploy');
		expect(content.devDependencies).toHaveProperty('@sveltejs/adapter-cloudflare');
		expect(content.devDependencies).toHaveProperty('wrangler');

		// Check svelte.config.js adapter
		const svelteConfig = files.find((f) => f.filePath === 'svelte.config.js');
		expect(svelteConfig).toBeDefined();
		expect(svelteConfig.content).toContain('@sveltejs/adapter-cloudflare');

		// Check wrangler.jsonc entry point
		const wranglerConfig = files.find((f) => f.filePath === 'wrangler.jsonc');
		expect(wranglerConfig).toBeDefined();
		expect(wranglerConfig.content).toContain('"main": ".svelte-kit/cloudflare/_worker.js"');

		// Ensure default src/index.js is NOT generated for SvelteKit
		expect(files.find((f) => f.filePath === 'src/index.js')).toBeUndefined();
	});
});
