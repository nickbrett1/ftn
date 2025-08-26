import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../src/routes/projects/ccbilling/admin/+page.server.js';

// Mock the requireUser function
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

describe('CCBilling Admin Page Server Route', () => {
	let mockEvent;
	let mockPlatform;
	let mockRequireUser;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock platform environment
		mockPlatform = {
			env: {
				KV: {
					get: vi.fn()
				},
				CCBILLING_DB: {
					prepare: vi.fn()
				}
			}
		};

		// Mock event object
		mockEvent = {
			platform: mockPlatform,
			cookies: {
				get: vi.fn()
			},
			request: {
				headers: {
					get: vi.fn()
				}
			},
			depends: vi.fn()
		};

		// Get mocked functions
		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
	});

	describe('load function', () => {
		it('should return authentication response when user is not authenticated', async () => {
			const authResponse = new Response('Not authenticated', { status: 401 });
			mockRequireUser.mockResolvedValue(authResponse);

			const result = await load(mockEvent);
			expect(result).toBe(authResponse);
			expect(result.status).toBe(401);
		});

		it('should return empty data when user is authenticated', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);

			const result = await load(mockEvent);

			expect(result).toEqual({});
			expect(mockRequireUser).toHaveBeenCalledWith(mockEvent);
		});
	});
});