import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const capabilitiesFixture = [
	{
		id: 'devcontainer-node',
		name: 'Node Devcontainer',
		description: 'Sets up a Node.js devcontainer',
		category: 'devcontainer',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			properties: {
				nodeVersion: { type: 'string', default: '20' },
				enabled: { type: 'boolean', required: true }
			}
		},
		templates: [
			{
				filePath: '.devcontainer/devcontainer.json',
				content: '{"customizations":{"vscode":{"extensions":["esbenp.prettier-vscode"]}}}'
			},
			{
				filePath: '.devcontainer/Dockerfile',
				content: 'FROM mcr.microsoft.com/devcontainers/javascript-node:{{nodeVersion}}'
			},
			{
				filePath: '.devcontainer/setup.sh',
				content: 'echo "Setup complete!"'
			}
		]
	},
	{
		id: 'doppler',
		name: 'Doppler',
		description: 'Integrates Doppler secrets manager',
		category: 'services',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['doppler'],
		configurationSchema: {
			properties: {}
		},
		templates: [],
		externalService: {
			service: 'doppler',
			action: 'configure',
			description: 'Configure Doppler CLI'
		}
	},
	{
		id: 'cloudflare-wrangler',
		name: 'Cloudflare Wrangler',
		description: 'Deploys via Wrangler',
		category: 'deploy',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			properties: {}
		},
		templates: [],
		externalService: {
			service: 'cloudflare',
			action: 'deploy',
			description: 'Deploy to Cloudflare Workers'
		}
	},
	{
		id: 'spec-kit',
		name: 'Spec Kit',
		description: 'Adds spec-kit tooling',
		category: 'tooling',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			properties: {}
		},
		templates: []
	}
];

const loggerErrorMock = vi.fn();

vi.mock('$lib/config/capabilities.js', () => ({
	capabilities: capabilitiesFixture
}));

vi.mock('$lib/utils/logging.js', () => ({
	logger: {
		error: loggerErrorMock
	}
}));

describe('genproj preview route', () => {
	beforeEach(() => {
		vi.resetModules();
		loggerErrorMock.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const loadModule = () => import('../../src/routes/projects/genproj/api/preview/+server.js');

	it('requires at least one selected capability', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({
				projectName: 'Demo',
				repositoryUrl: '',
				selectedCapabilities: [],
				configuration: {}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('At least one capability must be selected');
	});

	it('rejects unknown capability identifiers', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({
				projectName: 'Demo',
				repositoryUrl: '',
				selectedCapabilities: ['unknown'],
				configuration: {}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Invalid capability IDs');
		expect(body.invalidCapabilities).toEqual(['unknown']);
	});

	it('validates capability configuration schema', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({
				projectName: 'Demo',
				repositoryUrl: '',
				selectedCapabilities: ['devcontainer-node'],
				configuration: {
					'devcontainer-node': {
						nodeVersion: '20'
					}
				}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Configuration validation failed');
		expect(body.details).toContain('devcontainer-node.enabled is required');
	});

	it('returns preview data for a valid payload', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({
				projectName: 'Demo Project',
				repositoryUrl: 'https://github.com/acme/demo',
				selectedCapabilities: ['devcontainer-node', 'doppler', 'cloudflare-wrangler', 'spec-kit'],
				configuration: {
					'devcontainer-node': {
						nodeVersion: '22',
						enabled: true
					},
					doppler: {},
					'cloudflare-wrangler': {},
					'spec-kit': {}
				}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(200);
		const body = await response.json();

		expect(body.metadata.projectName).toBe('Demo Project');
		expect(body.metadata.capabilityCount).toBe(4);
		expect(body.files.some((file) => file.filePath === '.devcontainer/devcontainer.json')).toBe(
			true
		);
		expect(body.files.some((file) => file.filePath === '.devcontainer/Dockerfile')).toBe(true);
		const cloudLoginFile = body.files.find((file) => file.filePath === 'scripts/cloud-login.sh');
		expect(cloudLoginFile).toBeDefined();
		expect(cloudLoginFile.capabilityId).toBe('doppler+cloudflare');
		expect(cloudLoginFile.content).toContain('doppler login');
		expect(body.files.some((file) => file.filePath === 'README.md')).toBe(true);
		expect(body.externalServices).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ service: 'doppler', action: 'configure' }),
				expect.objectContaining({ service: 'cloudflare', action: 'deploy' })
			])
		);
		expect(loggerErrorMock).not.toHaveBeenCalled();
	});
});
