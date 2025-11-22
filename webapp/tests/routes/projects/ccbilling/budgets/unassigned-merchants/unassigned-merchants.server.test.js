import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../../../../src/routes/projects/ccbilling/budgets/unassigned-merchants/+server.js';

// Mock the database functions
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getUnassignedMerchants: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

describe('Unassigned Merchants API', () => {
	let mockGetUnassignedMerchants;
	let mockRequireUser;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import the mocked functions
		const databaseModule = await import('$lib/server/ccbilling-db.js');
		const authModule = await import('$lib/server/require-user.js');

		mockGetUnassignedMerchants = databaseModule.getUnassignedMerchants;
		mockRequireUser = authModule.requireUser;
	});
	it('should return unassigned merchants when authenticated', async () => {
		const mockMerchants = ['Walmart', 'Target', 'Grocery Store'];
		mockRequireUser.mockResolvedValue(null); // No auth error
		mockGetUnassignedMerchants.mockResolvedValue(mockMerchants);

		const mockEvent = {
			request: new Request('http://localhost/projects/ccbilling/budgets/unassigned-merchants')
		};

		const response = await GET(mockEvent);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual(mockMerchants);
		expect(mockGetUnassignedMerchants).toHaveBeenCalledWith(mockEvent);
	});

	it('should return 401 when not authenticated', async () => {
		const authError = new Response('Unauthorized', { status: 401 });
		mockRequireUser.mockResolvedValue(authError);

		const mockEvent = {
			request: new Request('http://localhost/projects/ccbilling/budgets/unassigned-merchants')
		};

		const response = await GET(mockEvent);

		expect(response.status).toBe(401);
		expect(mockGetUnassignedMerchants).not.toHaveBeenCalled();
	});

	it('should handle database errors gracefully', async () => {
		mockRequireUser.mockResolvedValue(null);
		mockGetUnassignedMerchants.mockRejectedValue(new Error('Database error'));

		const mockEvent = {
			request: new Request('http://localhost/projects/ccbilling/budgets/unassigned-merchants')
		};

		await expect(GET(mockEvent)).rejects.toThrow('Database error');
	});
});