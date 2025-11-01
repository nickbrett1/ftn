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
	logger: loggerMock
}));

vi.mock('$lib/utils/genproj-errors.js', () => ({
	withErrorHandling: (fn) => fn
}));

import { logger } from '$lib/utils/logging.js';
import { POST } from './+server.js';

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
		expect(data.error).toBe('Project name must be at least 3 characters');
	});

	it('rejects invalid capability identifiers', async () => {
		const request = {
			json: async () => ({
				selectedCapabilities: ['not-real'],
				configuration: {}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('Invalid capability IDs');
		expect(data.invalidCapabilities).toEqual(['not-real']);
	});

	it('rejects configuration values that violate schema rules', async () => {
		const request = {
			json: async () => ({
				projectName: 'Demo Project',
				selectedCapabilities: ['devcontainer-node'],
				configuration: {
					'devcontainer-node': { nodeVersion: 22 }
				}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('Configuration validation failed');
		expect(data.details).toContain('devcontainer-node.nodeVersion must be a string');
	});

	it('generates a comprehensive preview for multiple capabilities', async () => {
		const requestBody = {
			projectName: 'My Project',
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
				'devcontainer-node': { nodeVersion: '20' },
				'devcontainer-python': { pythonVersion: '3.11' },
				sonarcloud: { languages: ['javascript', 'python', 'java'] }
			}
		};

		const request = {
			json: async () => requestBody
		};

		const response = await POST({ request });
		expect(response.status).toBe(200);
		const data = await response.json();

		expect(data.metadata).toMatchObject({
			projectName: 'My Project',
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
				projectName: 'Playwright Demo',
				repositoryUrl: '',
				selectedCapabilities: ['playwright'],
				configuration: {}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(200);
		const data = await response.json();

		const playwrightFile = data.files.find((file) => file.filePath === 'playwright.config.js');
		expect(playwrightFile).toBeDefined();
		expect(playwrightFile.content).toContain('defineConfig');
		expect(playwrightFile.content).toContain("testDir: testDir || 'tests/e2e'");
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
		expect(logger.error).toHaveBeenCalledWith('❌ Preview generation error', {
			error: 'Boom'
		});
	});
});
