import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import BudgetPage from './+page.svelte';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Budget Page Race Condition Tests', () => {
	const mockData = {
		budget: {
			id: 'test-budget-id',
			name: 'Test Budget',
			icon: '💰'
		},
		budgets: [
			{ id: 'test-budget-id', name: 'Test Budget', icon: '💰' }
		],
		merchants: [
			{ merchant: 'amazon', merchant_normalized: 'amazon' },
			{ merchant: 'target', merchant_normalized: 'target' }
		]
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
	});

	it('should handle race condition when removing merchant before combo box loads', async () => {
		// This test reproduces the exact race condition described in the issue:
		// "if I click to remove a merchant association before the combo box of recent merchants has loaded,
		// the screen is stuck showing 'Loading Recent Merchants' in the combo and 'Removing...' on the association"
		
		const mockMerchants = ['walmart', 'costco', 'bestbuy'];
		let resolveInitialLoad;
		let initialLoadPromise = new Promise(resolve => {
			resolveInitialLoad = resolve;
		});
		
		// Mock the recent merchants endpoint with a controlled promise
		mockFetch.mockImplementation((url) => {
			if (url.includes('/recent-merchants')) {
				return initialLoadPromise;
			}
			// Mock other endpoints normally
			return Promise.resolve({
				ok: true,
				json: async () => ({ success: true })
			});
		});
		
		const { getByText, container } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Verify the combo box is in loading state
		await waitFor(() => {
			expect(getByText('Loading recent merchants...')).toBeTruthy();
		});
		
		// Find the Remove button for amazon (before combo box has loaded)
		const amazonElement = getByText('amazon');
		const amazonInfoDiv = amazonElement.closest('div');
		const amazonCard = amazonInfoDiv.parentElement;
		const amazonRemoveButton = amazonCard.querySelector('button');
		
		expect(amazonRemoveButton).toBeTruthy();
		expect(amazonRemoveButton.textContent).toContain('Remove');
		
		// Click the remove button while combo box is still loading
		// This is the race condition scenario
		await fireEvent.click(amazonRemoveButton);
		
		// Verify the button shows "Removing..." state
		expect(amazonRemoveButton.textContent).toContain('Removing...');
		
		// Now resolve the initial load
		resolveInitialLoad({
			ok: true,
			json: async () => mockMerchants
		});
		
		// Wait for the removal to complete
		await waitFor(() => {
			// The merchant should be removed from the UI
			const merchantList = container.querySelector('.merchant-list');
			expect(merchantList).toBeTruthy();
			expect(merchantList.textContent).not.toContain('amazon');
		}, { timeout: 3000 });
		
		// The combo box should NOT be stuck in loading state
		// It should show merchants or empty state
		await waitFor(() => {
			const loadingText = container.querySelector('div')?.textContent?.includes('Loading recent merchants...');
			expect(loadingText).toBeFalsy();
		}, { timeout: 2000 });
		
		// Verify the combo box is in a valid state
		const combobox = container.querySelector('select');
		expect(combobox).toBeTruthy();
	});

	it('should handle rapid remove clicks without getting stuck', async () => {
		// This test ensures that rapid clicking of remove buttons doesn't cause issues
		
		const mockMerchants = ['walmart', 'costco', 'bestbuy'];
		
		// Mock all endpoints
		mockFetch.mockImplementation((url) => {
			if (url.includes('/recent-merchants')) {
				return Promise.resolve({
					ok: true,
					json: async () => mockMerchants
				});
			}
			return Promise.resolve({
				ok: true,
				json: async () => ({ success: true })
			});
		});
		
		const { getByText, container } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for initial load to complete
		await waitFor(() => {
			expect(container.querySelector('select')).toBeTruthy();
		});
		
		// Find both remove buttons
		const amazonElement = getByText('amazon');
		const amazonInfoDiv = amazonElement.closest('div');
		const amazonCard = amazonInfoDiv.parentElement;
		const amazonRemoveButton = amazonCard.querySelector('button');
		
		const targetElement = getByText('target');
		const targetInfoDiv = targetElement.closest('div');
		const targetCard = targetInfoDiv.parentElement;
		const targetRemoveButton = targetCard.querySelector('button');
		
		// Click both remove buttons rapidly
		await fireEvent.click(amazonRemoveButton);
		await fireEvent.click(targetRemoveButton);
		
		// Wait for both removals to complete
		await waitFor(() => {
			const merchantList = container.querySelector('.merchant-list');
			expect(merchantList).toBeTruthy();
			expect(merchantList.textContent).not.toContain('amazon');
			expect(merchantList.textContent).not.toContain('target');
		}, { timeout: 3000 });
		
		// The combo box should still be functional
		const combobox = container.querySelector('select');
		expect(combobox).toBeTruthy();
		expect(combobox.disabled).toBeFalsy();
	});
});