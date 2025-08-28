import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { page } from '$app/stores';
import BudgetPage from './+page.svelte';

// Mock the page store
vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn((callback) => {
			callback({
				params: { id: 'test-budget-id' },
				url: new URL('http://localhost:5173/projects/ccbilling/budgets/test-budget-id')
			});
			return () => {};
		})
	}
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.alert
global.alert = vi.fn();

describe('Budget Page - Merchant Removal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
	});

	const mockData = {
		budget: {
			id: 'test-budget-id',
			name: 'Test Budget',
			icon: '💰',
			merchants: []
		},
		budgets: [
			{
				id: 'test-budget-id',
				name: 'Test Budget',
				icon: '💰'
			}
		],
		merchants: [
			{
				merchant: 'Amazon',
				merchant_normalized: 'amazon'
			},
			{
				merchant: 'Target',
				merchant_normalized: 'target'
			}
		]
	};

	it('should render merchants correctly', async () => {
		const { getByText } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for merchants to be rendered (they display as lowercase normalized names)
		await waitFor(() => {
			expect(getByText('amazon')).toBeTruthy();
			expect(getByText('target')).toBeTruthy();
		});
	});

	it('should expose the merchant removal bug - button shows "Removing..." but merchant is not removed', async () => {
		// Mock successful removal response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		const { getByText, queryByText } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for merchants to be rendered
		await waitFor(() => {
			expect(getByText('amazon')).toBeTruthy();
			expect(getByText('target')).toBeTruthy();
		});

		// Find the Remove button for amazon by looking for the button in the same container
		const amazonElement = getByText('amazon');
		const amazonContainer = amazonElement.closest('div');
		// The button is a sibling of the div containing the text, so we need to go up one more level
		const merchantCard = amazonContainer.parentElement;
		const removeButton = merchantCard.querySelector('button');
		
		// Click the remove button
		await fireEvent.click(removeButton);

		// Wait a bit for state to update
		await new Promise(resolve => setTimeout(resolve, 100));

		// Debug: check what buttons are available
		const allButtons = document.querySelectorAll('button');
		console.log('All buttons after click:', Array.from(allButtons).map(btn => btn.textContent));

		// The bug: The button should show "Removing..." but it doesn't
		// This test will fail and expose the bug
		expect(getByText('Removing...')).toBeTruthy();
	});

	it('should handle removal API error gracefully', async () => {
		// Mock API error response
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ error: 'Failed to remove merchant' })
		});

		const { getByText, queryByText } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for merchants to be rendered
		await waitFor(() => {
			expect(getByText('amazon')).toBeTruthy();
		});

		// Find the Remove button for amazon by looking for the button near the amazon text
		const amazonContainer = getByText('amazon').closest('div');
		const removeButton = amazonContainer.querySelector('button');
		
		// Click the remove button
		await fireEvent.click(removeButton);

		// Check that button shows "Removing..." state
		expect(getByText('Removing...')).toBeTruthy();

		// Wait for the error to be handled
		await waitFor(() => {
			expect(queryByText('Removing...')).toBeFalsy();
		}, { timeout: 3000 });

		// Verify alert was called with error message
		expect(global.alert).toHaveBeenCalledWith('Failed to remove merchant');

		// Verify the merchant is still in the UI (not removed due to error)
		expect(getByText('amazon')).toBeTruthy();
	});

	it('should handle network error during removal', async () => {
		// Mock network error
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const { getByText, queryByText } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for merchants to be rendered
		await waitFor(() => {
			expect(getByText('amazon')).toBeTruthy();
		});

		// Find the Remove button for amazon by looking for the button near the amazon text
		const amazonContainer = getByText('amazon').closest('div');
		const removeButton = amazonContainer.querySelector('button');
		
		// Click the remove button
		await fireEvent.click(removeButton);

		// Check that button shows "Removing..." state
		expect(getByText('Removing...')).toBeTruthy();

		// Wait for the error to be handled
		await waitFor(() => {
			expect(queryByText('Removing...')).toBeFalsy();
		}, { timeout: 3000 });

		// Verify alert was called with network error message
		expect(global.alert).toHaveBeenCalledWith('Network error occurred');

		// Verify the merchant is still in the UI (not removed due to error)
		expect(getByText('amazon')).toBeTruthy();
	});
});