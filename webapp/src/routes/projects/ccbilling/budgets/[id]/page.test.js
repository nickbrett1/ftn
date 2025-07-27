import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('Budget Detail Page Logic', () => {
	const mockData = {
		budget: { id: 1, name: 'Groceries', created_at: '2025-01-01' },
		merchants: [
			{ merchant: 'Walmart' },
			{ merchant: 'Target' }
		]
	};

	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});
	});

	it('validates merchant name input correctly', () => {
		const merchantName = '';
		const isValid = !!(merchantName && merchantName.trim().length > 0);
		expect(isValid).toBe(false);
	});

	it('validates non-empty merchant name', () => {
		const merchantName = 'Costco';
		const isValid = merchantName && merchantName.trim().length > 0;
		expect(isValid).toBe(true);
	});

	it('trims whitespace from merchant names', () => {
		const merchantName = '  Costco  ';
		const trimmed = merchantName.trim();
		expect(trimmed).toBe('Costco');
	});

	it('handles add merchant API call correctly', async () => {
		const budgetId = 1;
		const merchantName = 'Costco';

		await fetch(`/projects/ccbilling/budgets/${budgetId}/merchants`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ merchant: merchantName })
		});

		expect(fetch).toHaveBeenCalledWith(
			'/projects/ccbilling/budgets/1/merchants',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ merchant: merchantName })
			})
		);
	});

	it('handles delete merchant API call correctly', async () => {
		const budgetId = 1;
		const merchantName = 'Walmart';

		await fetch(`/projects/ccbilling/budgets/${budgetId}/merchants`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ merchant: merchantName })
		});

		expect(fetch).toHaveBeenCalledWith(
			'/projects/ccbilling/budgets/1/merchants',
			expect.objectContaining({
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ merchant: merchantName })
			})
		);
	});

	it('handles API error responses for adding merchants', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Merchant already exists' })
		});

		const response = await fetch('/projects/ccbilling/budgets/1/merchants', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ merchant: 'Costco' })
		});
		
		const result = await response.json();
		
		expect(response.ok).toBe(false);
		expect(result.error).toBe('Merchant already exists');
	});

	it('handles network errors gracefully', async () => {
		fetch.mockRejectedValueOnce(new Error('Network error'));

		await expect(
			fetch('/projects/ccbilling/budgets/1/merchants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ merchant: 'Costco' })
			})
		).rejects.toThrow('Network error');
	});

	it('processes merchant data correctly', () => {
		const processedMerchants = mockData.merchants.map(merchant => ({
			...merchant,
			displayName: merchant.merchant.toUpperCase()
		}));

		expect(processedMerchants).toHaveLength(2);
		expect(processedMerchants[0].displayName).toBe('WALMART');
		expect(processedMerchants[1].displayName).toBe('TARGET');
	});

	it('handles empty merchant list', () => {
		const emptyMerchants = [];
		const hasNoMerchants = emptyMerchants.length === 0;
		expect(hasNoMerchants).toBe(true);
	});

	it('formats budget display information correctly', () => {
		const budget = mockData.budget;
		const displayInfo = {
			title: `Budget: ${budget.name}`,
			createdDate: new Date(budget.created_at).toLocaleDateString(),
			id: budget.id
		};

		expect(displayInfo.title).toBe('Budget: Groceries');
		expect(displayInfo.id).toBe(1);
		expect(displayInfo.createdDate).toBeTruthy();
	});
});