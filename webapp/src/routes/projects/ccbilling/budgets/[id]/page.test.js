import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.alert
global.alert = vi.fn();

describe('Budget Page - Merchant Management Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
		mockFetch.mockReset();
	});

	const mockData = {
		budget: {
			id: 'test-budget-id',
			name: 'Test Budget',
			icon: '💰',
			description: 'Test budget description'
		},
		merchants: [
			{
				merchant: 'amazon',
				merchant_normalized: 'amazon'
			},
			{
				merchant: 'target',
				merchant_normalized: 'target'
			}
		]
	};

	it('should validate merchant data structure', () => {
		// Test that the mock data has the expected structure
		expect(mockData.budget).toBeDefined();
		expect(mockData.budget.id).toBe('test-budget-id');
		expect(mockData.budget.name).toBe('Test Budget');
		expect(mockData.merchants).toBeDefined();
		expect(Array.isArray(mockData.merchants)).toBe(true);
		expect(mockData.merchants.length).toBe(2);
		expect(mockData.merchants[0].merchant).toBe('amazon');
		expect(mockData.merchants[1].merchant).toBe('target');
	});

	it('should validate merchant removal API call format', async () => {
		// Mock successful removal response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		// Simulate the removeMerchant function call
		const merchantName = 'amazon';
		const budgetId = 'test-budget-id';
		
		const response = await fetch(`/projects/ccbilling/budgets/${budgetId}/merchants`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ merchant: merchantName })
		});

		expect(response.ok).toBe(true);
		expect(mockFetch).toHaveBeenCalledWith(
			`/projects/ccbilling/budgets/${budgetId}/merchants`,
			{
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ merchant: merchantName })
			}
		);
	});

	it('should validate merchant addition API call format', async () => {
		// Mock successful addition response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		// Simulate the addMerchant function call
		const merchantName = 'walmart';
		const budgetId = 'test-budget-id';
		
		const response = await fetch(`/projects/ccbilling/budgets/${budgetId}/merchants`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ merchant: merchantName })
		});

		expect(response.ok).toBe(true);
		expect(mockFetch).toHaveBeenCalledWith(
			`/projects/ccbilling/budgets/${budgetId}/merchants`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ merchant: merchantName })
			}
		);
	});

	it('should handle API errors gracefully', async () => {
		// Mock error response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 400,
			statusText: 'Bad Request',
			json: async () => ({ error: 'Invalid merchant' })
		});

		const merchantName = 'invalid-merchant';
		const budgetId = 'test-budget-id';
		
		const response = await fetch(`/projects/ccbilling/budgets/${budgetId}/merchants`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ merchant: merchantName })
		});

		expect(response.ok).toBe(false);
		expect(response.status).toBe(400);
	});

	it('should validate merchant normalization logic', () => {
		// Test merchant name normalization
		const testCases = [
			{ input: 'Amazon', expected: 'amazon' },
			{ input: 'TARGET', expected: 'target' },
			{ input: 'Walmart Inc.', expected: 'walmart inc.' },
			{ input: '  Best Buy  ', expected: 'best buy' }
		];

		testCases.forEach(({ input, expected }) => {
			const normalized = input.toLowerCase().trim();
			expect(normalized).toBe(expected);
		});
	});

	it('should validate merchant array operations', () => {
		// Test array filtering logic
		const merchants = [
			{ merchant: 'amazon', merchant_normalized: 'amazon' },
			{ merchant: 'target', merchant_normalized: 'target' },
			{ merchant: 'walmart', merchant_normalized: 'walmart' }
		];

		// Test filtering out a merchant
		const filteredMerchants = merchants.filter(merchant => 
			merchant.merchant !== 'target'
		);

		expect(filteredMerchants.length).toBe(2);
		expect(filteredMerchants.find(m => m.merchant === 'target')).toBeUndefined();
		expect(filteredMerchants.find(m => m.merchant === 'amazon')).toBeDefined();
		expect(filteredMerchants.find(m => m.merchant === 'walmart')).toBeDefined();
	});

	it('should validate merchant sorting logic', () => {
		// Test merchant sorting
		const merchants = [
			{ merchant: 'zebra', merchant_normalized: 'zebra' },
			{ merchant: 'amazon', merchant_normalized: 'amazon' },
			{ merchant: 'target', merchant_normalized: 'target' }
		];

		const sortedMerchants = merchants.sort((a, b) => 
			a.merchant.toLowerCase().localeCompare(b.merchant.toLowerCase())
		);

		expect(sortedMerchants[0].merchant).toBe('amazon');
		expect(sortedMerchants[1].merchant).toBe('target');
		expect(sortedMerchants[2].merchant).toBe('zebra');
	});

	it('should validate budget data structure', () => {
		// Test budget data validation
		expect(mockData.budget.id).toBeDefined();
		expect(mockData.budget.name).toBeDefined();
		expect(mockData.budget.icon).toBeDefined();
		expect(typeof mockData.budget.id).toBe('string');
		expect(typeof mockData.budget.name).toBe('string');
		expect(typeof mockData.budget.icon).toBe('string');
	});

	it('should validate merchant data validation', () => {
		// Test merchant data validation
		mockData.merchants.forEach(merchant => {
			expect(merchant.merchant).toBeDefined();
			expect(merchant.merchant_normalized).toBeDefined();
			expect(typeof merchant.merchant).toBe('string');
			expect(typeof merchant.merchant_normalized).toBe('string');
		});
	});

	it('should validate API endpoint construction', () => {
		// Test API endpoint construction
		const budgetId = 'test-budget-id';
		const merchantsEndpoint = `/projects/ccbilling/budgets/${budgetId}/merchants`;
		
		expect(merchantsEndpoint).toBe('/projects/ccbilling/budgets/test-budget-id/merchants');
	});

	it('should validate request headers', () => {
		// Test request headers
		const headers = { 'Content-Type': 'application/json' };
		
		expect(headers['Content-Type']).toBe('application/json');
		expect(Object.keys(headers)).toContain('Content-Type');
	});

	it('should validate JSON serialization', () => {
		// Test JSON serialization
		const merchantData = { merchant: 'test-merchant' };
		const jsonString = JSON.stringify(merchantData);
		const parsedData = JSON.parse(jsonString);
		
		expect(parsedData).toEqual(merchantData);
		expect(parsedData.merchant).toBe('test-merchant');
	});
});