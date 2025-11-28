import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('Cloudflare Wrangler File Generation', () => {
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
		expect(content.devDependencies).toHaveProperty('wrangler');
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
});
