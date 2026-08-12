import { describe, it, expect } from 'vitest';
import { generatePreview } from '$lib/server/preview-generator.js';
import { capabilities } from '$lib/config/capabilities.js';
import { getCapabilityTemplateData } from '$lib/utils/capability-template-utils.js';

describe('CircleCI Capability Generation', () => {
	it('should generate .circleci/config.yml when circleci capability is selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'none'
				}
			}
		};

		const selectedCapabilities = ['circleci'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		// The output is organized into folders. We expect a .circleci folder.
		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		expect(circleCiFolder).toBeDefined();

		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');
		expect(circleCiFile).toBeDefined();

		expect(circleCiFile.content).toContain('version: 2.1');
		expect(circleCiFile.content).toContain('executor: node/default');
		expect(circleCiFile.content).toContain('node: circleci/node@5.0.2');
	});

	it('should generate a test step when devcontainer-node is selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {}
		};

		const selectedCapabilities = ['circleci', 'devcontainer-node'];
		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');

		expect(circleCiFile.content).toContain('npx vitest --coverage');
	});

	it('should generate ESLint + SonarJS lint step in circleci config when devcontainer-node or code-quality is selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'none',
					context: {
						enabled: true,
						name: 'common'
					}
				}
			}
		};

		const selectedCapabilities = ['circleci', 'devcontainer-node'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		expect(circleCiFolder).toBeDefined();

		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');
		expect(circleCiFile).toBeDefined();

		expect(circleCiFile.content).toContain('Lint (ESLint + SonarJS)');
		expect(circleCiFile.content).toContain('npm run lint');
	});

	it('should not contain jobEnvironment if sonarcloud is not selected', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'none'
				}
			}
		};

		const selectedCapabilities = ['circleci'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');

		expect(circleCiFile.content).not.toContain('environment:');
	});

	it('keeps the non-doppler ENV_VAL Wrangler deploy step when doppler is absent', () => {
		// circleci now requires doppler, so via the preview path a circleci +
		// cloudflare-wrangler project always resolves doppler (CLOUDFLARE_ENV
		// sync variant). The ENV_VAL branch (Wrangler must never see a
		// CLOUDFLARE_ENV env var — it would deploy to env "default") is pinned
		// here at the template-data level by calling the circleci data generator
		// directly without the doppler capability.
		const data = getCapabilityTemplateData('circleci', {
			capabilities: ['cloudflare-wrangler'],
			configuration: {
				circleci: {
					deployTarget: 'cloudflare-workers',
					context: {
						enabled: true,
						name: 'common'
					}
				}
			},
			projectName: 'test-project'
		});

		expect(data.deployJobDefinition).not.toContain('CLOUDFLARE_ENV:');
		expect(data.deployJobDefinition).toContain('ENV_VAL=');
		expect(data.deployJobDefinition).toContain('npx wrangler deploy --env "$ENV_VAL"');
	});

	it('uses the doppler-based Cloudflare sync step when circleci pulls in doppler', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'cloudflare-workers',
					context: {
						enabled: true,
						name: 'common'
					}
				}
			}
		};

		const selectedCapabilities = ['circleci', 'cloudflare-wrangler'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');

		// circleci requires doppler → doppler is auto-resolved → the deploy job
		// uses the Doppler-backed secrets sync (CLOUDFLARE_ENV on the sync step).
		expect(circleCiFile.content).toContain('install_doppler');
		expect(circleCiFile.content).toContain('CLOUDFLARE_ENV: << parameters.environment >>');
	});

	it('should not include notify_deployment by default when ntfyNotifications is false', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'cloudflare-workers'
				}
			}
		};

		const selectedCapabilities = ['circleci', 'cloudflare-wrangler'];
		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');

		expect(circleCiFile.content).not.toContain('notify_deployment');
	});

	it('should include notify_deployment pulling from Doppler common project with project name when ntfyNotifications is true', async () => {
		const projectConfig = {
			name: 'test-project',
			description: 'A test project',
			configuration: {
				circleci: {
					deployTarget: 'cloudflare-workers',
					ntfyNotifications: true
				}
			}
		};

		const selectedCapabilities = ['circleci', 'cloudflare-wrangler'];
		const previewData = await generatePreview(projectConfig, selectedCapabilities);

		const circleCiFolder = previewData.files.find(
			(f) => f.name === '.circleci' && f.type === 'folder'
		);
		const circleCiFile = circleCiFolder.children.find((f) => f.name === 'config.yml');

		expect(circleCiFile.content).toContain('notify_deployment:');
		expect(circleCiFile.content).toContain('--project common');
		expect(circleCiFile.content).toContain('🚀 [${CIRCLE_PROJECT_REPONAME}]');
		expect(circleCiFile.content).toContain('equal: [ main, << pipeline.git.branch >> ]');
	});
});
