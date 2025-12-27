import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('Cloudflare Wrangler File Generation', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should generate package.json with deploy command when Wrangler and Node are selected', async () => {
		const context = {
			name: 'wrangler-test-project',
			capabilities: ['cloudflare-wrangler', 'devcontainer-node'],
			configuration: {
				'devcontainer-node': { nodeVersion: '20' },
				'cloudflare-wrangler': { workerType: 'web' }
			}
		};

		const files = await generateAllFiles(context);
		const packageJson = files.find((f) => f.filePath === 'package.json');

		expect(packageJson).toBeDefined();
		const content = JSON.parse(packageJson.content);
		expect(content.scripts).toHaveProperty('deploy', 'wrangler deploy');
		expect(content.devDependencies).toHaveProperty('wrangler', '^4.54.0');
	});

	it('should add deploy job to circleci config when Wrangler and CircleCI are selected', async () => {
		const context = {
			name: 'wrangler-circleci-test',
			capabilities: ['cloudflare-wrangler', 'circleci', 'devcontainer-node'],
			configuration: {
				circleci: { deployTarget: 'cloudflare' },
				'cloudflare-wrangler': { workerType: 'web' }
			}
		};

		const files = await generateAllFiles(context);
		const circleCiConfig = files.find((f) => f.filePath === '.circleci/config.yml');

		expect(circleCiConfig).toBeDefined();
		expect(circleCiConfig.content).toContain('deploy-to-cloudflare');
		expect(circleCiConfig.content).toContain('command: npx wrangler deploy');
	});

	it('generates wrangler.jsonc and cloud_login.sh when only Cloudflare is selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['cloudflare-wrangler'],
			configuration: {}
		};

		const files = await generateAllFiles(context);

		const wranglerJsonc = files.find((f) => f.filePath === 'wrangler.jsonc');
		expect(wranglerJsonc).toBeDefined();
		expect(wranglerJsonc.content).toContain('"name": "test-project"');
		// Check that compatibility_date is set to today's date
		const today = new Date().toISOString().split('T')[0];
		expect(wranglerJsonc.content).toContain(`"compatibility_date": "${today}"`);

		const cloudLogin = files.find((f) => f.filePath === 'scripts/cloud_login.sh');
		expect(cloudLogin).toBeDefined();
		expect(cloudLogin.content).toContain('npx wrangler login');
		expect(cloudLogin.content).not.toContain('doppler login');

		const wranglerTemplate = files.find((f) => f.filePath === 'wrangler.template.jsonc');
		expect(wranglerTemplate).toBeUndefined();
	});

	it('generates wrangler.template.jsonc and setup scripts when Cloudflare and Doppler are selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['cloudflare-wrangler', 'doppler'],
			configuration: {}
		};

		const files = await generateAllFiles(context);

		const wranglerTemplate = files.find((f) => f.filePath === 'wrangler.template.jsonc');
		expect(wranglerTemplate).toBeDefined();
		expect(wranglerTemplate.content).toContain('"name": "test-project"');
		// Check that compatibility_date is set to today's date
		const today = new Date().toISOString().split('T')[0];
		expect(wranglerTemplate.content).toContain(`"compatibility_date": "${today}"`);

		const setupScript = files.find((f) => f.filePath === 'scripts/setup-wrangler-config.sh');
		expect(setupScript).toBeDefined();

		const cloudLogin = files.find((f) => f.filePath === 'scripts/cloud_login.sh');
		expect(cloudLogin).toBeDefined();
		expect(cloudLogin.content).toContain('doppler login');
		expect(cloudLogin.content).toContain('doppler setup --no-interactive --project test-project');
		expect(cloudLogin.content).toContain('./scripts/setup-wrangler-config.sh');

		const wranglerJsonc = files.find((f) => f.filePath === 'wrangler.jsonc');
		expect(wranglerJsonc).toBeUndefined(); // Should not generate wrangler.jsonc directly

		const gitignore = files.find((f) => f.filePath === '.gitignore');
		expect(gitignore).toBeDefined();
		expect(gitignore.content).toContain('wrangler.jsonc');
	});

	it('injects setup script into CircleCI config when CircleCI, Cloudflare, and Doppler are selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['cloudflare-wrangler', 'doppler', 'circleci'],
			configuration: {
				circleci: { deployTarget: 'cloudflare' }
			}
		};

		const files = await generateAllFiles(context);

		const circleCiConfig = files.find((f) => f.filePath === '.circleci/config.yml');
		expect(circleCiConfig).toBeDefined();
		expect(circleCiConfig.content).toContain('./scripts/setup-wrangler-config.sh');
	});

	it('includes python ignore patterns in .gitignore when python capability is selected', async () => {
		const context = {
			name: 'python-project',
			capabilities: ['devcontainer-python', 'cloudflare-wrangler'],
			configuration: {}
		};

		const files = await generateAllFiles(context);

		const gitignore = files.find((f) => f.filePath === '.gitignore');
		expect(gitignore).toBeDefined();
		expect(gitignore.content).toContain('__pycache__');
		expect(gitignore.content).toContain('.venv');
	});
});
