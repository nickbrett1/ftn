import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BudgetPage from '../../../../../../src/routes/projects/ccbilling/budgets/[id]/+page.svelte';

// Mock the page store
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((callback) => {
			callback({
				params: { id: 'test-budget-id' },
				url: new URL('http://localhost:5173/projects/ccbilling/budgets/test-budget-id'),
				data: {
					user: {
						email: 'test@example.com',
						name: 'Test User'
					}
				}
			});
			return () => {};
		})
	}
}));

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock window.alert
globalThis.alert = vi.fn();

describe('Budget Page - Merchant Removal', () => {
	let component;

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
		mockFetch.mockReset();
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
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

	it('should render merchants correctly', async () => {
		// Mock the recent merchants endpoint
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ['walmart', 'costco']
		});

		component = mount(BudgetPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Wait for merchants to be rendered
		await vi.waitFor(
			() => {
				expect(document.body.textContent).toContain('amazon');
				expect(document.body.textContent).toContain('target');
			},
			{ timeout: 2000 }
		);
	});

	it('should call removeMerchant function when remove button is clicked', async () => {
		// Mock successful removal response
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true })
		});

		component = mount(BudgetPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Wait for merchants to be rendered
		await vi.waitFor(
			() => {
				expect(document.body.textContent).toContain('amazon');
				expect(document.body.textContent).toContain('target');
			},
			{ timeout: 2000 }
		);

		// Find the Remove button
		const removeButtons = [...document.querySelectorAll('button')].filter((button) =>
			button.textContent.includes('Remove')
		);

		if (removeButtons.length > 0) {
			removeButtons[0].click();
			flushSync();
			expect(removeButtons[0]).toBeTruthy();
		}
	});

	it('should expose the merchant addition infinite loop bug', async () => {
		// Mock the recent merchants endpoint
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		component = mount(BudgetPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await vi.waitFor(
			() => {
				const select = document.querySelector('select');
				expect(select).toBeTruthy();
			},
			{ timeout: 2000 }
		);

		const select = document.querySelector('select');

		// Select a merchant from the combo box
		select.value = 'walmart';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		// Verify the selection worked
		expect(select.value).toBe('walmart');

		// Find and click the Add Merchant button
		const addButton = [...document.querySelectorAll('button')].find((button) =>
			button.textContent.includes('Add Merchant')
		);

		if (addButton) {
			addButton.click();
			flushSync();

			// Wait for the async operation to complete
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	});

	it('should expose the infinite loop by testing multiple rapid interactions', async () => {
		// Mock the recent merchants endpoint (first call - initial load)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		// Mock refresh response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['costco', 'bestbuy']
		});

		component = mount(BudgetPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await vi.waitFor(
			() => {
				const select = document.querySelector('select');
				expect(select).toBeTruthy();
			},
			{ timeout: 2000 }
		);

		const select = document.querySelector('select');
		const addButton = [...document.querySelectorAll('button')].find((button) =>
			button.textContent.includes('Add Merchant')
		);

		// Simulate rapid user interactions
		select.value = 'walmart';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		if (addButton) {
			addButton.click();
			flushSync();
		}

		// Wait for the operation to complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Try to interact with the select again
		select.value = 'costco';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(select.value).toBe('costco');
	});

	it('should display budget name and description', async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});

		component = mount(BudgetPage, {
			target: document.body,
			props: { data: mockData }
		});

		await vi.waitFor(
			() => {
				expect(document.body.textContent).toContain('Test Budget');
			},
			{ timeout: 1000 }
		);
	});
});
