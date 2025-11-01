import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const capabilitiesFixture = [
	{
		id: 'cap-a',
		name: 'Capability A',
		description: 'First capability',
		category: 'general',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['service-a'],
		configurationSchema: {
			properties: {
				mode: { type: 'string', enum: ['basic', 'advanced'] },
				enabled: { type: 'boolean', required: true }
			}
		},
		templates: []
	},
	{
		id: 'cap-b',
		name: 'Capability B',
		description: 'Second capability',
		category: 'general',
		dependencies: ['cap-a'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			properties: {
				flag: { type: 'boolean' }
			}
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

describe('genproj capabilities route', () => {
	beforeEach(() => {
		vi.resetModules();
		loggerErrorMock.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const loadModule = () => import('../../src/routes/projects/genproj/api/capabilities/+server.js');

	it('returns all capabilities with metadata on GET', async () => {
		const { GET } = await loadModule();
		const response = await GET({
			url: new URL('https://app.test/projects/genproj/api/capabilities'),
			request: new Request('https://app.test/projects/genproj/api/capabilities', {
				method: 'GET'
			})
		});

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.capabilities).toEqual(capabilitiesFixture);
		expect(body.metadata.total).toBe(capabilitiesFixture.length);
		expect(Array.isArray(body.metadata.categories)).toBe(true);
		expect(loggerErrorMock).not.toHaveBeenCalled();
	});

	it('rejects requests when selectedCapabilities is not an array', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({ selectedCapabilities: 'cap-a' })
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Selected capabilities must be an array');
		expect(loggerErrorMock).not.toHaveBeenCalled();
	});

	it('reports invalid capability identifiers', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({ selectedCapabilities: ['unknown'] })
		};

		const response = await POST({ request });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Invalid capability IDs');
		expect(body.invalidCapabilities).toEqual(['unknown']);
	});

	it('validates configuration and returns required auth services', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({
				selectedCapabilities: ['cap-a'],
				configuration: {
					'cap-a': {
						mode: 'basic',
						enabled: true
					}
				}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.valid).toBe(true);
		expect(body.requiredAuth).toEqual(['service-a']);
		expect(loggerErrorMock).not.toHaveBeenCalled();
	});
});
