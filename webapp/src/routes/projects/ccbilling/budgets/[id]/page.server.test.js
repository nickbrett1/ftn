import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { load } from './+page.server.js';

// Mock the dependencies
vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('$lib/server/ccbilling-db.js', () => ({ 
	getBudget: vi.fn(),
	getBudgetMerchants: vi.fn()
}));

// Import the mocked functions
import { requireUser } from '$lib/server/require-user.js';
import { getBudget, getBudgetMerchants } from '$lib/server/ccbilling-db.js';

describe('Budget Detail Page Server', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		
		mockEvent = {
			params: { id: '1' },
			url: new URL('http://localhost/projects/ccbilling/budgets/1'),
			request: {
				headers: new Map()
			}
		};

		// Mock requireUser to return user by default
		requireUser.mockResolvedValue({ email: 'test@test.com' });
	});

	it('loads budget and merchants successfully', async () => {
		const mockBudget = { id: 1, name: 'Groceries', created_at: '2025-01-01' };
		const mockMerchants = [
			{ merchant: 'Walmart' },
			{ merchant: 'Target' }
		];

		getBudget.mockResolvedValue(mockBudget);
		getBudgetMerchants.mockResolvedValue(mockMerchants);

		const result = await load(mockEvent);

		expect(requireUser).toHaveBeenCalledWith(mockEvent);
		expect(getBudget).toHaveBeenCalledWith(mockEvent, 1);
		expect(getBudgetMerchants).toHaveBeenCalledWith(mockEvent, 1);
		expect(result).toEqual({ 
			budget: mockBudget, 
			merchants: mockMerchants 
		});
	});

	it('redirects for invalid budget ID', async () => {
		mockEvent.params.id = 'invalid';

		expect.assertions(1);
		try {
			await load(mockEvent);
		} catch (e) {
			let expected;
			try {
				redirect(307, '/projects/ccbilling/budgets');
			} catch (redirectError) {
				expected = redirectError;
			}
			expect(e).toEqual(expected);
		}
	});

	it('redirects for missing budget ID', async () => {
		mockEvent.params.id = '';

		expect.assertions(1);
		try {
			await load(mockEvent);
		} catch (e) {
			let expected;
			try {
				redirect(307, '/projects/ccbilling/budgets');
			} catch (redirectError) {
				expected = redirectError;
			}
			expect(e).toEqual(expected);
		}
	});

	it('redirects when budget not found', async () => {
		getBudget.mockResolvedValue(null);

		expect.assertions(1);
		try {
			await load(mockEvent);
		} catch (e) {
			let expected;
			try {
				redirect(307, '/projects/ccbilling/budgets');
			} catch (redirectError) {
				expected = redirectError;
			}
			expect(e).toEqual(expected);
		}
	});

	it('handles empty merchant list', async () => {
		const mockBudget = { id: 1, name: 'Groceries', created_at: '2025-01-01' };
		
		getBudget.mockResolvedValue(mockBudget);
		getBudgetMerchants.mockResolvedValue([]);

		const result = await load(mockEvent);

		expect(result).toEqual({ 
			budget: mockBudget, 
			merchants: [] 
		});
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

	it('handles database errors when getting budget', async () => {
		getBudget.mockRejectedValue(new Error('Database connection failed'));

		await expect(load(mockEvent)).rejects.toThrow('Database connection failed');
		expect(getBudget).toHaveBeenCalledWith(mockEvent, 1);
		expect(getBudgetMerchants).not.toHaveBeenCalled();
	});

	it('handles database errors when getting merchants', async () => {
		const mockBudget = { id: 1, name: 'Groceries', created_at: '2025-01-01' };
		
		getBudget.mockResolvedValue(mockBudget);
		getBudgetMerchants.mockRejectedValue(new Error('Merchant query failed'));

		await expect(load(mockEvent)).rejects.toThrow('Merchant query failed');
		expect(getBudget).toHaveBeenCalledWith(mockEvent, 1);
		expect(getBudgetMerchants).toHaveBeenCalledWith(mockEvent, 1);
	});
});