import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const requireUserMock = vi.fn();
const addBudgetMerchantMock = vi.fn();
const removeBudgetMerchantMock = vi.fn();
const getBudgetByMerchantMock = vi.fn();
const listBudgetsMock = vi.fn();

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: (...args) => requireUserMock(...args)
}));

vi.mock('$lib/server/ccbilling-db.js', () => ({
	addBudgetMerchant: (...args) => addBudgetMerchantMock(...args),
	removeBudgetMerchant: (...args) => removeBudgetMerchantMock(...args),
	getBudgetByMerchant: (...args) => getBudgetByMerchantMock(...args),
	listBudgets: (...args) => listBudgetsMock(...args)
}));

describe('ccbilling auto-associations route', () => {
	beforeEach(() => {
		vi.resetModules();
		requireUserMock.mockReset();
		addBudgetMerchantMock.mockReset();
		removeBudgetMerchantMock.mockReset();
		getBudgetByMerchantMock.mockReset();
		listBudgetsMock.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const loadModule = () =>
		import('../../../src/routes/projects/ccbilling/auto-associations/+server.js');

	const buildEvent = (method, body) => ({
		request: {
			json: async () => body
		}
	});

	describe('PUT', () => {
		it('updates auto-association successfully', async () => {
			const { PUT } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
			listBudgetsMock.mockResolvedValue([{ id: 'budget-1', name: 'Groceries' }]);
			getBudgetByMerchantMock.mockResolvedValue(null);
			addBudgetMerchantMock.mockResolvedValue();

			const event = buildEvent('PUT', { merchant: 'Kroger', newBudgetName: 'Groceries' });
			const response = await PUT(event);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
			expect(listBudgetsMock).toHaveBeenCalled();
			expect(addBudgetMerchantMock).toHaveBeenCalledWith(event, 'budget-1', 'Kroger');
		});

		it('removes existing association before adding new one', async () => {
			const { PUT } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
			listBudgetsMock.mockResolvedValue([{ id: 'budget-1', name: 'Groceries' }]);
			getBudgetByMerchantMock.mockResolvedValue({ id: 'budget-2' });
			removeBudgetMerchantMock.mockResolvedValue();
			addBudgetMerchantMock.mockResolvedValue();

			const event = buildEvent('PUT', { merchant: 'Kroger', newBudgetName: 'Groceries' });
			const response = await PUT(event);

			expect(response.status).toBe(200);
			expect(removeBudgetMerchantMock).toHaveBeenCalledWith(event, 'budget-2', 'Kroger');
			expect(addBudgetMerchantMock).toHaveBeenCalledWith(event, 'budget-1', 'Kroger');
		});

		it('returns 400 if fields are missing', async () => {
			const { PUT } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });

			const event = buildEvent('PUT', { merchant: 'Kroger' }); // Missing newBudgetName
			const response = await PUT(event);

			expect(response.status).toBe(400);
		});

		it('returns 404 if budget not found', async () => {
			const { PUT } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
			listBudgetsMock.mockResolvedValue([{ id: 'budget-1', name: 'Groceries' }]);

			const event = buildEvent('PUT', { merchant: 'Kroger', newBudgetName: 'Unknown' });
			const response = await PUT(event);

			expect(response.status).toBe(404);
		});

		it('returns 401 if user is not authenticated', async () => {
			const { PUT } = await loadModule();
			const unauthorized = new Response('Unauthorized', { status: 401 });
			requireUserMock.mockResolvedValue(unauthorized);

			const event = buildEvent('PUT', {});
			const response = await PUT(event);

			expect(response.status).toBe(401);
		});

		it('handles errors gracefully', async () => {
			const { PUT } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
			listBudgetsMock.mockRejectedValue(new Error('DB Error'));

            // Spy on console.error to avoid noise
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const event = buildEvent('PUT', { merchant: 'Kroger', newBudgetName: 'Groceries' });
			const response = await PUT(event);

			expect(response.status).toBe(500);
            consoleSpy.mockRestore();
		});
	});

	describe('DELETE', () => {
		it('deletes auto-association successfully', async () => {
			const { DELETE } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
			getBudgetByMerchantMock.mockResolvedValue({ id: 'budget-1' });
			removeBudgetMerchantMock.mockResolvedValue();

			const event = buildEvent('DELETE', { merchant: 'Kroger' });
			const response = await DELETE(event);

			expect(response.status).toBe(200);
			expect(removeBudgetMerchantMock).toHaveBeenCalledWith(event, 'budget-1', 'Kroger');
		});

		it('returns 404 if no association found', async () => {
			const { DELETE } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
			getBudgetByMerchantMock.mockResolvedValue(null);

			const event = buildEvent('DELETE', { merchant: 'Kroger' });
			const response = await DELETE(event);

			expect(response.status).toBe(404);
		});

		it('returns 400 if merchant is missing', async () => {
			const { DELETE } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });

			const event = buildEvent('DELETE', {});
			const response = await DELETE(event);

			expect(response.status).toBe(400);
		});

		it('returns 401 if user is not authenticated', async () => {
			const { DELETE } = await loadModule();
			const unauthorized = new Response('Unauthorized', { status: 401 });
			requireUserMock.mockResolvedValue(unauthorized);

			const event = buildEvent('DELETE', {});
			const response = await DELETE(event);

			expect(response.status).toBe(401);
		});

        it('handles errors gracefully', async () => {
			const { DELETE } = await loadModule();
			requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
			getBudgetByMerchantMock.mockRejectedValue(new Error('DB Error'));

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const event = buildEvent('DELETE', { merchant: 'Kroger' });
			const response = await DELETE(event);

			expect(response.status).toBe(500);
            consoleSpy.mockRestore();
		});
	});
});