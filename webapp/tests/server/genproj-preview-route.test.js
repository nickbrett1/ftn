import { capabilities } from '$lib/config/capabilities';
import { ProjectGeneratorService } from '$lib/services/project-generator';

const loggerErrorMock = vi.fn();
const previewFixture = vi.hoisted(() => ({
	metadata: {
		projectName: 'Demo Project',
		capabilityCount: 4
	},
	files: [
		{
			filePath: '.devcontainer/devcontainer.json',
			content: '{"customizations":{"vscode":{"extensions":["esbenp.prettier-vscode"]}}}'
		},
		{
			filePath: '.devcontainer/Dockerfile',
			content: 'FROM mcr.microsoft.com/devcontainers/javascript-node:{{nodeVersion}}'
		},
		{ filePath: 'scripts/cloud-login.sh', content: 'doppler login' },
		{ filePath: 'README.md', content: '# Demo Project' }
	],
	externalServices: [
		{ service: 'doppler', action: 'configure' },
		{ service: 'cloudflare', action: 'deploy' }
	]
}));

vi.mock('$lib/utils/logging.js', () => ({
	logError: loggerErrorMock,
	logger: {
		error: loggerErrorMock
	}
}));

vi.mock('$lib/services/project-generator.js', () => {
	const mockGeneratePreview = vi.fn().mockResolvedValue(previewFixture);
	return {
		ProjectGeneratorService: class {
			constructor() {
				this.generatePreview = mockGeneratePreview;
			}
		}
	};
});

describe('genproj preview route', () => {
	beforeEach(() => {
		vi.resetModules();
		loggerErrorMock.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const loadModule = () => import('../../src/routes/api/projects/genproj/preview/+server.js');

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
				repositoryUrl: 'https://github.com/acme/demo',
				selectedCapabilities: ['unknown'],
				configuration: {}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Invalid capability ID: unknown');
		expect(body.details).toContain('Invalid capability ID: unknown');
	});

	it('validates capability configuration schema', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({
				projectName: 'Demo',
				repositoryUrl: 'https://github.com/acme/demo',
				selectedCapabilities: ['devcontainer-node'],
				configuration: {
					'devcontainer-node': {
						nodeVersion: 'invalid' // Invalid nodeVersion
					}
				}
			})
		};

		const response = await POST({ request }, new ProjectGeneratorService());
		expect(loggerErrorMock).not.toHaveBeenCalled();
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Invalid Node.js version'); // Expect the error message directly
		expect(body.details).toContain('Invalid Node.js version'); // Check details array
	});

	it('returns preview data for a valid payload', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({
				projectName: 'demo-project',
				repositoryUrl: 'https://github.com/acme/demo',
				selectedCapabilities: ['devcontainer-node', 'doppler', 'cloudflare-wrangler', 'spec-kit'],
				configuration: {
					'devcontainer-node': {
						nodeVersion: '22',
						enabled: true
					},
					doppler: {
						projectType: 'web'
					},
					'cloudflare-wrangler': {
						workerType: 'web'
					},
					'spec-kit': {
						specFormat: 'md'
					}
				}
			})
		};

		const response = await POST({ request }, new ProjectGeneratorService());
		expect(loggerErrorMock).not.toHaveBeenCalled();
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
