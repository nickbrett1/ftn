import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { capabilities } from '../../src/lib/config/capabilities.js';

const loggerErrorMock = vi.fn();

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

	const loadModule = () => import('../../src/routes/api/projects/genproj/capabilities/+server.js');

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
		expect(body.capabilities).toEqual(capabilities);
		expect(body.metadata.total).toBe(capabilities.length);
		expect(Array.isArray(body.metadata.categories)).toBe(true);
		expect(loggerErrorMock).not.toHaveBeenCalled();
	});

	it('rejects requests when selectedCapabilities is not an array', async () => {
		const { POST } = await loadModule();
		const request = {
			method: 'POST',
			json: vi.fn().mockResolvedValue({ selectedCapabilities: 'doppler' })
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
				selectedCapabilities: ['doppler'],
				configuration: {
					doppler: {
						projectType: 'web'
					}
				}
			})
		};

		const response = await POST({ request });
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.valid).toBe(true);
		expect(body.requiredAuth).toEqual(['doppler']);
		expect(loggerErrorMock).not.toHaveBeenCalled();
	});
});
