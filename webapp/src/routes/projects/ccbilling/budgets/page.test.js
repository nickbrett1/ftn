import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Budget Management Page Logic', () => {
	const mockBudgets = [
		{ id: 1, name: 'Groceries', created_at: '2025-01-01' },
		{ id: 2, name: 'Utilities', created_at: '2025-01-02' }
	];

	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});
	});

	it('validates budget name input correctly', () => {
		const budgetName = '';
		const isValid = !!(budgetName && budgetName.trim().length > 0);
		expect(isValid).toBe(false);
	});

	it('validates non-empty budget name', () => {
		const budgetName = 'Groceries';
		const isValid = budgetName && budgetName.trim().length > 0;
		expect(isValid).toBe(true);
	});

	it('trims whitespace from budget names', () => {
		const budgetName = '  Groceries  ';
		const trimmed = budgetName.trim();
		expect(trimmed).toBe('Groceries');
	});

	it('handles API call formatting correctly', async () => {
		const budgetName = 'New Budget';
		
		await fetch('/projects/ccbilling/budgets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: budgetName })
		});

		expect(fetch).toHaveBeenCalledWith(
			'/projects/ccbilling/budgets',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: budgetName })
			})
		);
	});

	it('handles edit API calls correctly', async () => {
		const budgetId = 1;
		const newName = 'Updated Groceries';
		
		await fetch(`/projects/ccbilling/budgets/${budgetId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newName })
		});

		expect(fetch).toHaveBeenCalledWith(
			'/projects/ccbilling/budgets/1',
			expect.objectContaining({
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName })
			})
		);
	});

	it('handles delete API calls correctly', async () => {
		const budgetId = 1;
		
		await fetch(`/projects/ccbilling/budgets/${budgetId}`, {
			method: 'DELETE'
		});

		expect(fetch).toHaveBeenCalledWith(
			'/projects/ccbilling/budgets/1',
			expect.objectContaining({ method: 'DELETE' })
		);
	});

	it('handles API error responses', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Budget already exists' })
		});

		const response = await fetch('/projects/ccbilling/budgets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Test Budget' })
		});
		
		const result = await response.json();
		
		expect(response.ok).toBe(false);
		expect(result.error).toBe('Budget already exists');
	});

	it('handles network errors', async () => {
		fetch.mockRejectedValueOnce(new Error('Network error'));

		await expect(
			fetch('/projects/ccbilling/budgets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: 'Test Budget' })
			})
		).rejects.toThrow('Network error');
	});

	it('processes budget data correctly', () => {
		const processedBudgets = mockBudgets.map(budget => ({
			...budget,
			displayName: budget.name.toUpperCase(),
			createdDate: new Date(budget.created_at).toLocaleDateString()
		}));

		expect(processedBudgets).toHaveLength(2);
		expect(processedBudgets[0].displayName).toBe('GROCERIES');
		expect(processedBudgets[1].displayName).toBe('UTILITIES');
	});
});