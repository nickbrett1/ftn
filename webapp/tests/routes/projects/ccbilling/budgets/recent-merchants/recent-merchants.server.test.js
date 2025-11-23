import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../../../../src/routes/projects/ccbilling/budgets/recent-merchants/+server.js';

// Mock the database module
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getRecentUnassignedMerchants: vi.fn()
}));

// Mock the auth module
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

import { getRecentUnassignedMerchants } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/budgets/recent-merchants', () => {
	let mockGetRecentUnassignedMerchants;
	let mockRequireUser;

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetRecentUnassignedMerchants = getRecentUnassignedMerchants;
		mockRequireUser = requireUser;
	});
	it('should return recent merchants when user is authenticated', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		const mockEvent = { platform: { env: { CCBILLING_DB: {} } } };

		mockRequireUser.mockResolvedValue(mockEvent);
		mockGetRecentUnassignedMerchants.mockResolvedValue(mockMerchants);

		const response = await GET(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual(mockMerchants);
		expect(mockGetRecentUnassignedMerchants).toHaveBeenCalledWith(mockEvent);
	});

	it('should return 401 when user is not authenticated', async () => {
		const mockEvent = { platform: { env: { CCBILLING_DB: {} } } };
		const mockResponse = new Response('Unauthorized', { status: 401 });

		mockRequireUser.mockResolvedValue(mockResponse);

		const response = await GET(mockEvent);

		expect(response.status).toBe(401);
		expect(mockGetRecentUnassignedMerchants).not.toHaveBeenCalled();
	});

	it('should handle database errors gracefully', async () => {
		const mockEvent = { platform: { env: { CCBILLING_DB: {} } } };

		mockRequireUser.mockResolvedValue(mockEvent);
		mockGetRecentUnassignedMerchants.mockRejectedValue(new Error('Database error'));

		await expect(GET(mockEvent)).rejects.toThrow('Database error');
	});
});
