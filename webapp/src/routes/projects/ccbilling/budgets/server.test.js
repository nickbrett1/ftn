import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	listBudgets: vi.fn(),
	createBudget: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

// Import the mocked functions
import { listBudgets, createBudget } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/budgets API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			request: {
				json: vi.fn()
			}
		};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
	});

	describe('GET endpoint', () => {
		it('should return list of budgets', async () => {
			const mockBudgets = [
				{ id: 1, name: 'Groceries', created_at: '2024-01-01' },
				{ id: 2, name: 'Entertainment', created_at: '2024-01-02' },
				{ id: 3, name: 'Gas', created_at: '2024-01-03' }
			];
			listBudgets.mockResolvedValue(mockBudgets);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listBudgets).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual(mockBudgets);
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await GET(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listBudgets).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should handle empty budget list', async () => {
			listBudgets.mockResolvedValue([]);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual([]);
			expect(response.status).toBe(200);
		});

		it('should handle database errors gracefully', async () => {
			listBudgets.mockRejectedValue(new Error('Database connection failed'));

			await expect(GET(mockEvent)).rejects.toThrow('Database connection failed');
		});
	});

	describe('POST endpoint', () => {
		it('should create new budget successfully', async () => {
			const budgetData = { name: 'Travel', icon: '✈️' };
			mockEvent.request.json.mockResolvedValue(budgetData);
			createBudget.mockResolvedValue({ id: 4, name: 'Travel', icon: '✈️' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).toHaveBeenCalled();
			expect(createBudget).toHaveBeenCalledWith(mockEvent, 'Travel', '✈️');
			expect(result).toEqual({ success: true });
			expect(response.status).toBe(200);
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await POST(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
			expect(createBudget).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for missing budget name', async () => {
			mockEvent.request.json.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing budget name' });
			expect(response.status).toBe(400);
			expect(createBudget).not.toHaveBeenCalled();
		});

		it('should return error for empty budget name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing budget name' });
			expect(response.status).toBe(400);
			expect(createBudget).not.toHaveBeenCalled();
		});

		it('should return error for null budget name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: null });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing budget name' });
			expect(response.status).toBe(400);
			expect(createBudget).not.toHaveBeenCalled();
		});

		it('should handle whitespace-only budget names', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '   ' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing budget name' });
			expect(response.status).toBe(400);
			expect(createBudget).not.toHaveBeenCalled();
		});

		it('should create budget with trimmed name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '  Dining Out  ', icon: '🍽️' });
			createBudget.mockResolvedValue({ id: 5, name: 'Dining Out', icon: '🍽️' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createBudget).toHaveBeenCalledWith(mockEvent, 'Dining Out', '🍽️');
			expect(result).toEqual({ success: true });
		});

		it('should handle special characters in budget names', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Coffee & Snacks', icon: '☕' });
			createBudget.mockResolvedValue({ id: 6, name: 'Coffee & Snacks', icon: '☕' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createBudget).toHaveBeenCalledWith(mockEvent, 'Coffee & Snacks', '☕');
			expect(result).toEqual({ success: true });
		});

		it('should handle long budget names', async () => {
			const longName = 'A'.repeat(100);
			mockEvent.request.json.mockResolvedValue({ name: longName, icon: '📦' });
			createBudget.mockResolvedValue({ id: 7, name: longName, icon: '📦' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createBudget).toHaveBeenCalledWith(mockEvent, longName, '📦');
			expect(result).toEqual({ success: true });
		});

		it('should handle malformed JSON', async () => {
			mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'));

			await expect(POST(mockEvent)).rejects.toThrow('Invalid JSON');
		});

		it('should handle database errors during creation', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Budget', icon: '📦' });
			createBudget.mockRejectedValue(new Error('Database constraint violation'));

			await expect(POST(mockEvent)).rejects.toThrow('Database constraint violation');
		});

		it('should handle missing request body', async () => {
			mockEvent.request.json.mockResolvedValue(null);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should ignore extra fields in request', async () => {
			mockEvent.request.json.mockResolvedValue({
				name: 'Health & Fitness',
				icon: '🏃',
				extraField: 'ignored',
				anotherId: 123
			});
			createBudget.mockResolvedValue({ id: 8, name: 'Health & Fitness', icon: '🏃' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createBudget).toHaveBeenCalledWith(mockEvent, 'Health & Fitness', '🏃');
			expect(result).toEqual({ success: true });
		});
	});
});
