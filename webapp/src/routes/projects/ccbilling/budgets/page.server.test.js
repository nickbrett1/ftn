import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { load } from './+page.server.js';

// Mock the dependencies
vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('$lib/server/ccbilling-db.js', () => ({ listBudgets: vi.fn() }));

// Import the mocked functions
import { requireUser } from '$lib/server/require-user.js';
import { listBudgets } from '$lib/server/ccbilling-db.js';

describe('Budget Page Server', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			url: new URL('http://localhost/projects/ccbilling/budgets'),
			request: {
				headers: new Map()
			}
		};

		// Mock requireUser to return user by default
		requireUser.mockResolvedValue({ email: 'test@test.com' });
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	it('loads budgets successfully for authenticated user', async () => {
		const mockBudgets = [
			{ id: 1, name: 'Groceries', created_at: '2025-01-01' },
			{ id: 2, name: 'Utilities', created_at: '2025-01-02' }
		];

		listBudgets.mockResolvedValue(mockBudgets);

		const result = await load(mockEvent);

		expect(requireUser).toHaveBeenCalledWith(mockEvent);
		expect(listBudgets).toHaveBeenCalledWith(mockEvent);
		expect(result).toEqual({ budgets: mockBudgets });
	});

	it('handles empty budget list', async () => {
		listBudgets.mockResolvedValue([]);

		const result = await load(mockEvent);

		expect(result).toEqual({ budgets: [] });
	});

	it('redirects unauthenticated user', async () => {
		const redirectResponse = new Response(null, {
			status: 307,
			headers: { Location: '/notauthorised' }
		});
		requireUser.mockResolvedValue(redirectResponse);

		expect.assertions(1);
		try {
			await load(mockEvent);
		} catch (e) {
			let expected;
			try {
				redirect(307, '/notauthorised');
			} catch (redirectError) {
				expected = redirectError;
			}
			expect(e).toEqual(expected);
		}
	});

	it('handles database errors gracefully', async () => {
		listBudgets.mockRejectedValue(new Error('Database connection failed'));

		await expect(load(mockEvent)).rejects.toThrow('Database connection failed');
		expect(requireUser).toHaveBeenCalledWith(mockEvent);
		expect(listBudgets).toHaveBeenCalledWith(mockEvent);
	});

	it('handles requireUser errors', async () => {
		requireUser.mockRejectedValue(new Error('Auth service unavailable'));

		await expect(load(mockEvent)).rejects.toThrow('Auth service unavailable');
		expect(requireUser).toHaveBeenCalledWith(mockEvent);
		expect(listBudgets).not.toHaveBeenCalled();
	});
});
