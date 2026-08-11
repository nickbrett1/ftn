// @vitest-environment jsdom
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
		expect(content.scripts).toHaveProperty('check', 'svelte-kit sync && svelte-check');
		expect(content.devDependencies).toHaveProperty('@sveltejs/kit');
		expect(content.devDependencies).toHaveProperty('@sveltejs/adapter-auto');
		expect(content.devDependencies).not.toHaveProperty('wrangler');

		// Check SvelteKit files
		expect(files.find((f) => f.filePath === 'src/app.html')).toBeDefined();
		expect(files.find((f) => f.filePath === 'src/routes/+page.svelte')).toBeDefined();
		expect(files.find((f) => f.filePath === 'vite.config.js')).toBeDefined();
		expect(files.find((f) => f.filePath === 'jsconfig.json')).toBeUndefined();

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

	it('should generate SvelteKit + docker-container with adapter-node and a health route', async () => {
		const context = {
			name: 'parquet-peek',
			capabilities: ['sveltekit', 'devcontainer-node', 'docker-container', 'circleci'],
			configuration: {
				'devcontainer-node': { nodeVersion: '20' },
				'docker-container': {
					publishPort: '127.0.0.1:3000:3000',
					dataMounts: [{ hostPath: '/volume1/marketdata', containerPath: '/data', readOnly: true }]
				}
			},
			registryNamespace: 'nickbrett1'
		};

		const files = await generateAllFiles(context);

		// 1.2: adapter-node replaces adapter-auto for docker deployments.
		const packageJson = files.find((f) => f.filePath === 'package.json');
		const content = JSON.parse(packageJson.content);
		expect(content.devDependencies).toHaveProperty('@sveltejs/adapter-node');
		expect(content.devDependencies).not.toHaveProperty('@sveltejs/adapter-auto');

		const svelteConfig = files.find((f) => f.filePath === 'svelte.config.js');
		expect(svelteConfig.content).toContain('@sveltejs/adapter-node');
		expect(svelteConfig.content).not.toContain('@sveltejs/adapter-auto');

		// 2.2: /health route is emitted for the container HEALTHCHECK.
		const healthRoute = files.find((f) => f.filePath === 'src/routes/health/+server.js');
		expect(healthRoute).toBeDefined();
		expect(healthRoute.content).toContain('ok: true');

		// 3.1: no OWNER placeholder in compose; real namespace substituted.
		const compose = files.find((f) => f.filePath === 'docker-compose.yml');
		expect(compose.content).toContain('ghcr.io/nickbrett1/parquet-peek:latest');
		expect(compose.content).not.toContain('OWNER');
		expect(compose.content).toContain('127.0.0.1:3000:3000');

		// 3.3: data mount present in compose volumes.
		expect(compose.content).toContain('/volume1/marketdata:/data:ro');

		// 4.4: .env.example is emitted.
		expect(files.find((f) => f.filePath === '.env.example')).toBeDefined();
	});
});
