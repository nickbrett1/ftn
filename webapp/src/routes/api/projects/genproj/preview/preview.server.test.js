import { describe, it, expect, vi, beforeEach } from 'vitest';

const jsonResponder = vi.hoisted(() => (data, options) => ({
	status: options?.status ?? 200,
	body: JSON.stringify(data),
	json: async () => data
}));

vi.mock('@sveltejs/kit', () => ({
	json: jsonResponder
}));

const loggerMock = vi.hoisted(() => ({
	error: vi.fn()
}));
vi.mock('$lib/utils/logging.js', () => ({
	logger: loggerMock,
	logError: loggerMock.error
}));

vi.mock('$lib/utils/genproj-errors.js', () => ({
	withErrorHandling: (fn) => fn
}));

const previewFixture = vi.hoisted(() => ({
	metadata: {
		projectName: 'my-project',
		capabilityCount: 10,
		fileCount: 5,
		serviceCount: 3,
		timestamp: new Date().toISOString()
	},
	files: [
		{
			filePath: '.devcontainer/Dockerfile',
			content: '# Install Doppler CLI\nspeckit via uv'
		},
		{
			filePath: '.devcontainer/devcontainer.json',
			content: '{"features":{"ghcr.io/devcontainers/features/node:1":{},"ghcr.io/devcontainers/features/python:1":{},"ghcr.io/devcontainers/features/java:1":{}},"customizations":{"vscode":{"extensions":["SonarSource.sonarlint-vscode"]}}}'
		},
		{
			filePath: '.devcontainer/setup.sh',
			content: 'bash scripts/cloud-login.sh'
		},
		{
			filePath: 'scripts/cloud-login.sh',
			content: 'doppler login\nwrangler login',
			capabilityId: 'doppler+cloudflare'
		},
		{
			filePath: 'README.md',
			content: 'Cloud Services Login'
		}
	],
	externalServices: [
		{ service: 'circleci', action: 'configure' },
		{ service: 'sonarcloud', action: 'configure' },
		{ service: 'doppler', action: 'configure' }
	]
}));

const playwrightPreviewFixture = vi.hoisted(() => ({
	metadata: {
		projectName: 'playwright-demo',
		capabilityCount: 1,
		fileCount: 1,
		serviceCount: 0,
		timestamp: new Date().toISOString()
	},
	files: [
		{
			filePath: 'playwright.config.js',
			content: `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: process.env.PLAYWRIGHT_TEST_DIR || 'tests/e2e',
  outputFolder: 'playwright-report',
});`
		}
	],
	externalServices: []
}));

vi.mock('$lib/services/project-generator.js', () => {
	const mockGeneratePreview = vi.fn((projectConfig) => {
		if (projectConfig.selectedCapabilities.includes('playwright')) {
			return Promise.resolve(playwrightPreviewFixture);
		}
		return Promise.resolve(previewFixture);
	});
	return {
		ProjectGeneratorService: class {
			constructor() {
				this.generatePreview = mockGeneratePreview;
			}
		}
	};
});

import { logger } from '$lib/utils/logging.js';
import { POST } from './+server.js';
import { ProjectGeneratorService } from '$lib/services/project-generator';

describe('genproj preview API POST', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects requests without selected capabilities', async () => {
		const request = {
			json: async () => ({})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('At least one capability must be selected');
	});

	it('rejects project names shorter than 3 characters when provided', async () => {
		const request = {
			json: async () => ({
				projectName: 'ab',
				selectedCapabilities: ['devcontainer-node'],
				configuration: {}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('Project name must be at least 3 characters long');
	});

	it('rejects invalid capability identifiers', async () => {
		const request = {
			json: async () => ({
				projectName: 'valid-project',
				selectedCapabilities: ['not-real'],
				configuration: {}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('Invalid capability ID: not-real');
		expect(data.invalidCapabilities).toEqual(['not-real']);
	});

	it('rejects configuration values that violate schema rules', async () => {
		const request = {
			json: async () => ({
				projectName: 'demo-project',
				selectedCapabilities: ['devcontainer-node'],
				configuration: {
					'devcontainer-node': { nodeVersion: '99' } // Invalid nodeVersion
				}
			})
		};

		const response = await POST({ request }, new ProjectGeneratorService()); // Pass mocked service
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('Invalid Node.js version'); // Updated error code
		expect(data.details).toContain('Invalid Node.js version'); // Check message content
	});

	it('generates a comprehensive preview for multiple capabilities', async () => {
		const requestBody = {
			projectName: 'my-project',
			repositoryUrl: 'https://github.com/acme/my-project',
			selectedCapabilities: [
				'devcontainer-node',
				'devcontainer-python',
				'devcontainer-java',
				'doppler',
				'cloudflare-wrangler',
				'circleci',
				'sonarcloud',
				'sonarlint',
				'spec-kit',
				'lighthouse-ci'
			],
			configuration: {
				'devcontainer-node': { nodeVersion: '20', enabled: true },
				'devcontainer-python': { pythonVersion: '3.11', packageManager: 'pip' },
				sonarcloud: { language: 'js' }
			}
		};

		const request = {
			json: async () => requestBody
		};

		const response = await POST({ request }, new ProjectGeneratorService());
		expect(response.status).toBe(200);
		const data = await response.json();

		expect(data.metadata).toMatchObject({
			projectName: 'my-project',
			capabilityCount: requestBody.selectedCapabilities.length
		});
		expect(data.metadata.fileCount).toBe(data.files.length);
		expect(data.metadata.serviceCount).toBe(data.externalServices.length);
		expect(data.metadata.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);

		const dockerfile = data.files.find((file) => file.filePath === '.devcontainer/Dockerfile');
		expect(dockerfile).toBeDefined();
		expect(dockerfile.content).toContain('# Install Doppler CLI');
		expect(dockerfile.content).toContain('speckit via uv');

		const devcontainerJsonFile = data.files.find(
			(file) => file.filePath === '.devcontainer/devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();
		const devcontainerConfig = JSON.parse(devcontainerJsonFile.content);
		expect(Object.keys(devcontainerConfig.features)).toEqual(
			expect.arrayContaining([
				'ghcr.io/devcontainers/features/node:1',
				'ghcr.io/devcontainers/features/python:1',
				'ghcr.io/devcontainers/features/java:1'
			])
		);
		expect(devcontainerConfig.customizations.vscode.extensions).toContain(
			'SonarSource.sonarlint-vscode'
		);

		const setupScript = data.files.find((file) => file.filePath === '.devcontainer/setup.sh');
		expect(setupScript.content).toContain('bash scripts/cloud-login.sh');

		const cloudLogin = data.files.find((file) => file.filePath === 'scripts/cloud-login.sh');
		expect(cloudLogin).toBeDefined();
		expect(cloudLogin.capabilityId).toBe('doppler+cloudflare');
		expect(cloudLogin.content).toContain('doppler login');
		expect(cloudLogin.content).toContain('wrangler login');

		const readme = data.files.find((file) => file.filePath === 'README.md');
		expect(readme.content).toContain('Cloud Services Login');

		expect(data.externalServices.map((service) => service.service)).toEqual(
			expect.arrayContaining(['circleci', 'sonarcloud', 'doppler'])
		);
	});

	it('generates populated playwright config when only playwright is selected', async () => {
		const request = {
			json: async () => ({
				projectName: 'playwright-demo',
				repositoryUrl: '',
				selectedCapabilities: ['playwright'],
				configuration: {}
			})
		};

		const response = await POST({ request }, new ProjectGeneratorService());
		expect(response.status).toBe(200);
		const data = await response.json();

		const playwrightFile = data.files.find((file) => file.filePath === 'playwright.config.js');
		expect(playwrightFile).toBeDefined();
		expect(playwrightFile.content).toContain('defineConfig');
		expect(playwrightFile.content).toContain("testDir: process.env.PLAYWRIGHT_TEST_DIR || 'tests/e2e'");
		expect(playwrightFile.content).toContain("outputFolder: 'playwright-report'");
	});

	it('handles unexpected errors by returning a 500 response', async () => {
		const error = new Error('Boom');
		const request = {
			json: vi.fn().mockRejectedValue(error)
		};

		const response = await POST({ request });
		expect(response.status).toBe(500);
		const data = await response.json();
		expect(data.error).toBe('Boom');
		expect(logger.error).toHaveBeenCalledWith('Failed to generate preview', {
			error: 'Boom'
		});
	});
});