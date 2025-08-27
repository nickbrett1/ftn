import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server.js';

// Mock the database module
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getUnassignedMerchants: vi.fn()
}));

// Mock the auth module
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

import { getUnassignedMerchants } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/budgets/recent-merchants', () => {
	let mockGetUnassignedMerchants;
	let mockRequireUser;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUnassignedMerchants = getUnassignedMerchants;
		mockRequireUser = requireUser;
	});

	it('should return recent merchants when user is authenticated', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		const mockEvent = { platform: { env: { CCBILLING_DB: {} } } };

		mockRequireUser.mockResolvedValue(mockEvent);
		mockGetUnassignedMerchants.mockResolvedValue(mockMerchants);

		const response = await GET(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual(mockMerchants);
		expect(mockGetRecentMerchants).toHaveBeenCalledWith(mockEvent);
	});

	it('should return 401 when user is not authenticated', async () => {
		const mockEvent = { platform: { env: { CCBILLING_DB: {} } } };
		const mockResponse = new Response('Unauthorized', { status: 401 });

		mockRequireUser.mockResolvedValue(mockResponse);

		const response = await GET(mockEvent);

		expect(response.status).toBe(401);
		expect(mockGetRecentMerchants).not.toHaveBeenCalled();
	});

	it('should handle database errors gracefully', async () => {
		const mockEvent = { platform: { env: { CCBILLING_DB: {} } } };

		mockRequireUser.mockResolvedValue(mockEvent);
		mockGetUnassignedMerchants.mockRejectedValue(new Error('Database error'));

		await expect(GET(mockEvent)).rejects.toThrow('Database error');
	});
});
