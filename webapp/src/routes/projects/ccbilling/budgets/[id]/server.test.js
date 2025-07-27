import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getBudget: vi.fn(),
	updateBudget: vi.fn(),
	deleteBudget: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

// Import the mocked functions
import { getBudget, updateBudget, deleteBudget } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/budgets/[id] API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			params: { id: '1' },
			request: {
				json: vi.fn()
			}
		};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});

	describe('GET endpoint', () => {
		it('should return budget details', async () => {
			const mockBudget = { id: 1, name: 'Groceries', created_at: '2024-01-01' };
			getBudget.mockResolvedValue(mockBudget);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getBudget).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual(mockBudget);
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await GET(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getBudget).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for invalid id', async () => {
			mockEvent.params.id = 'invalid';

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getBudget).not.toHaveBeenCalled();
		});

		it('should return error for missing id', async () => {
			mockEvent.params.id = '';

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getBudget).not.toHaveBeenCalled();
		});

		it('should handle zero id', async () => {
			mockEvent.params.id = '0';

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getBudget).not.toHaveBeenCalled();
		});

		it('should return 404 for non-existent budget', async () => {
			getBudget.mockResolvedValue(null);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Budget not found' });
			expect(response.status).toBe(404);
		});

		it('should handle database errors', async () => {
			getBudget.mockRejectedValue(new Error('Database connection failed'));

			await expect(GET(mockEvent)).rejects.toThrow('Database connection failed');
		});
	});

	describe('PUT endpoint', () => {
		it('should update budget successfully', async () => {
			const budgetData = { name: 'Updated Groceries' };
			mockEvent.request.json.mockResolvedValue(budgetData);
			getBudget.mockResolvedValue({ id: 1, name: 'Groceries' });
			updateBudget.mockResolvedValue({ id: 1, name: 'Updated Groceries' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getBudget).toHaveBeenCalledWith(mockEvent, 1);
			expect(updateBudget).toHaveBeenCalledWith(mockEvent, 1, 'Updated Groceries');
			expect(result).toEqual({ success: true });
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await PUT(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for invalid id', async () => {
			mockEvent.params.id = 'invalid';

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
		});

		it('should return error for missing budget name', async () => {
			mockEvent.request.json.mockResolvedValue({});

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing budget name' });
			expect(response.status).toBe(400);
			expect(getBudget).not.toHaveBeenCalled();
		});

		it('should return error for empty budget name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing budget name' });
			expect(response.status).toBe(400);
		});

		it('should return error for whitespace-only name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '   ' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing budget name' });
			expect(response.status).toBe(400);
		});

		it('should return 404 for non-existent budget', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Updated Name' });
			getBudget.mockResolvedValue(null);

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Budget not found' });
			expect(response.status).toBe(404);
			expect(updateBudget).not.toHaveBeenCalled();
		});

		it('should trim budget name before update', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '  Travel Budget  ' });
			getBudget.mockResolvedValue({ id: 1, name: 'Travel' });
			updateBudget.mockResolvedValue({ id: 1, name: 'Travel Budget' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(updateBudget).toHaveBeenCalledWith(mockEvent, 1, 'Travel Budget');
			expect(result).toEqual({ success: true });
		});

		it('should handle special characters in budget names', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Health & Wellness' });
			getBudget.mockResolvedValue({ id: 1, name: 'Health' });
			updateBudget.mockResolvedValue({ id: 1, name: 'Health & Wellness' });

			const response = await PUT(mockEvent);

			expect(updateBudget).toHaveBeenCalledWith(mockEvent, 1, 'Health & Wellness');
		});

		it('should handle database errors during update', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test' });
			getBudget.mockResolvedValue({ id: 1, name: 'Original' });
			updateBudget.mockRejectedValue(new Error('Constraint violation'));

			await expect(PUT(mockEvent)).rejects.toThrow('Constraint violation');
		});
	});

	describe('DELETE endpoint', () => {
		it('should delete budget successfully', async () => {
			getBudget.mockResolvedValue({ id: 1, name: 'Groceries' });
			deleteBudget.mockResolvedValue();

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getBudget).toHaveBeenCalledWith(mockEvent, 1);
			expect(deleteBudget).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual({ success: true });
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await DELETE(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getBudget).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for invalid id', async () => {
			mockEvent.params.id = 'invalid';

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getBudget).not.toHaveBeenCalled();
		});

		it('should return 404 for non-existent budget', async () => {
			getBudget.mockResolvedValue(null);

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Budget not found' });
			expect(response.status).toBe(404);
			expect(deleteBudget).not.toHaveBeenCalled();
		});

		it('should handle negative id', async () => {
			mockEvent.params.id = '-1';

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
		});

		it('should handle very large id', async () => {
			mockEvent.params.id = '999999999999999';
			getBudget.mockResolvedValue(null);

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Budget not found' });
			expect(response.status).toBe(404);
		});

		it('should handle database errors during deletion', async () => {
			getBudget.mockResolvedValue({ id: 1, name: 'Test' });
			deleteBudget.mockRejectedValue(new Error('Foreign key constraint'));

			await expect(DELETE(mockEvent)).rejects.toThrow('Foreign key constraint');
		});

		it('should handle floating point id', async () => {
			mockEvent.params.id = '1.5';

			const response = await DELETE(mockEvent);

			// Number('1.5') converts to 1, so this should work
			expect(getBudget).toHaveBeenCalledWith(mockEvent, 1);
		});
	});
});