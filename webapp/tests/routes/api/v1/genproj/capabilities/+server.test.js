import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../../../../src/routes/api/v1/genproj/capabilities/+server.js';
import * as utils from '../../../../../../src/lib/server/genproj-api-utils.js';
import { json } from '@sveltejs/kit';

vi.mock('../../../../../../src/lib/server/genproj-api-utils.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        validatePatAuth: vi.fn(),
    };
});
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, options) => ({ data, ...options }))
}));

describe('GET /api/v1/genproj/capabilities', () => {
	let mockRequest;
	let mockPlatform;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRequest = {
			headers: new Headers({
				Authorization: 'Bearer pat_123'
			})
		};

		mockPlatform = {
			env: {}
		};
	});

	it('should return 401 if validation fails', async () => {
		utils.validatePatAuth.mockResolvedValue({
			errorResponse: { data: { message: 'Unauthorized' }, status: 401 }
		});

		const response = await GET({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(401);
		expect(response.data.message).toBe('Unauthorized');
	});

	it('should return capabilities if validation succeeds', async () => {
		utils.validatePatAuth.mockResolvedValue({
			userEmail: 'test@example.com'
		});

		const response = await GET({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBeUndefined(); // Assuming default 200
		expect(response.data.message).toBe('Capabilities retrieved successfully');
		expect(Array.isArray(response.data.capabilities)).toBe(true);
	});

	it('should handle unexpected errors', async () => {
		utils.validatePatAuth.mockRejectedValue(new Error('Crash'));

		const response = await GET({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(500);
		expect(response.data.message).toBe('Crash');
	});

	it('should return 500 if error thrown in try/catch (non-Error object)', async () => {
		utils.validatePatAuth.mockRejectedValue('non-error object throw');
		const request = { headers: new Headers() };
		const response = await GET({ request, platform: mockPlatform });
		expect(response.status).toBe(500);
	});
});
