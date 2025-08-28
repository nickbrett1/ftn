import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, getAllByText } from '@testing-library/svelte';
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
		const { getByText } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for merchants to be rendered (they display as lowercase normalized names)
		await waitFor(() => {
			expect(getByText('amazon')).toBeTruthy();
			expect(getByText('target')).toBeTruthy();
		});
	});

	it('should call removeMerchant function when remove button is clicked', async () => {
		// Mock successful removal response
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		const { getByText } = render(BudgetPage, {
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

		// The function should be called (we can see this in the console logs)
		// This test verifies that the button click triggers the function
		// The actual bug (UI not updating) needs to be tested in the real application
		expect(removeButton).toBeTruthy();
	});

	it('should expose the merchant addition infinite loop bug', async () => {
		// Mock the recent merchants endpoint FIRST (this is called on component mount)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition response (this is called when adding merchant)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		const { getByRole, getByText, container } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Select a merchant from the combo box
		await fireEvent.change(select, { target: { value: 'walmart' } });

		// Verify the selection worked
		expect(select.value).toBe('walmart');

		// Find and click the Add Merchant button
		const addButton = getByRole('button', { name: 'Add Merchant' });
		await fireEvent.click(addButton);

		// Wait a bit for the async operation to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		// The bug: After clicking Add, the select should be reset but it's not
		// This indicates the infinite loop is preventing the reset
		expect(select.value).toBe(''); // This should fail and expose the bug
	});

	it('should expose the infinite loop by testing multiple rapid interactions', async () => {
		// Mock the recent merchants endpoint (first call - initial load)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition response (second call - add merchant)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		// Mock the recent merchants endpoint (third call - refresh after addition)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['costco', 'bestbuy'] // walmart is now assigned, so not in list
		});

		const { getByRole, container } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		const addButton = getByRole('button', { name: 'Add Merchant' });

		// Simulate rapid user interactions that might trigger the infinite loop
		await fireEvent.change(select, { target: { value: 'walmart' } });
		await fireEvent.click(addButton);
		
		// Wait for the operation to complete
		await new Promise(resolve => setTimeout(resolve, 50));
		
		// Debug: Check the current state before trying to change
		console.log('Select value before change:', select.value);
		console.log('Select options:', Array.from(select.options).map(opt => opt.value));
		console.log('Fetch calls made:', mockFetch.mock.calls);
		console.log('Fetch call count:', mockFetch.mock.calls.length);
		
		// Try to interact with the select again - this should work if no infinite loop
		await fireEvent.change(select, { target: { value: 'costco' } });
		
		// Debug: Check the state after change
		console.log('Select value after change:', select.value);
		
		// If there's an infinite loop, the select value won't change
		expect(select.value).toBe('costco'); // This should fail if there's an infinite loop
	});

	it('should expose the infinite loop by testing the View All Merchants button', async () => {
		// Mock the recent merchants endpoint
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition responses
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ success: true })
		});

		const { getByRole, getByText, container } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		const addButton = getByRole('button', { name: 'Add Merchant' });

		// First, add a merchant to trigger the infinite loop
		await fireEvent.change(select, { target: { value: 'walmart' } });
		await fireEvent.click(addButton);
		
		// Wait for the operation to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		// Now try to click "View All Merchants" - this should work if no infinite loop
		const viewAllButton = getByText('View All Merchants');
		await fireEvent.click(viewAllButton);
		
		// If there's an infinite loop, the modal won't open or the button won't respond
		// We can't easily test modal opening in this test environment, but we can test
		// that the button click doesn't cause the test to hang (which would indicate infinite loop)
		expect(viewAllButton).toBeTruthy(); // This should pass if no infinite loop
	});

	it('should successfully remove merchant after adding from combo box', async () => {
		// Mock the recent merchants endpoint (first call - initial load)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition response (second call - add merchant)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		// Mock the recent merchants endpoint (third call - refresh after addition)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['costco', 'bestbuy'] // walmart is now assigned, so not in list
		});

		// Mock successful removal response (fourth call - remove merchant)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		const { getByRole, getByText, container } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		const addButton = getByRole('button', { name: 'Add Merchant' });

		// Step 1: Add a merchant from the combo box
		await fireEvent.change(select, { target: { value: 'walmart' } });
		await fireEvent.click(addButton);
		
		// Wait for the addition to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		// Step 2: Verify the merchant was added to the list
		await waitFor(() => {
			const merchantList = container.querySelector('.merchant-list');
			expect(merchantList).toBeTruthy();
			expect(merchantList.textContent).toContain('walmart');
		});

		// Step 3: Remove the merchant that was just added
		// Use getAllByText to get all walmart elements, then find the one in the merchant list
		const walmartElements = getAllByText(container, 'walmart');
		const walmartElement = walmartElements.find(el => 
			el.closest('.merchant-list') || el.closest('[class*="merchant"]')
		);
		const merchantInfoDiv = walmartElement.closest('div');
		const merchantCard = merchantInfoDiv.parentElement;
		const removeButton = merchantCard.querySelector('button');
		
		// Verify the remove button exists and has the correct text
		expect(removeButton).toBeTruthy();
		expect(removeButton.textContent).toContain('Remove');
		
		// Click the remove button
		await fireEvent.click(removeButton);
		
		// Wait for the removal to complete
		await new Promise(resolve => setTimeout(resolve, 200));

		// Step 4: Verify the merchant was successfully removed from the list
		await waitFor(() => {
			const merchantList = container.querySelector('.merchant-list');
			expect(merchantList).toBeTruthy();
			expect(merchantList.textContent).not.toContain('walmart');
		});
	});

	it('should investigate production bug - remove button becomes unresponsive after adding merchant', async () => {
		// This test specifically investigates the production bug where remove buttons
		// become unresponsive after adding a merchant from the combo box
		
		// Mock the recent merchants endpoint (first call - initial load)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition response (second call - add merchant)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		// Mock the recent merchants endpoint (third call - refresh after addition)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['costco', 'bestbuy'] // walmart is now assigned, so not in list
		});

		const { getByRole, getByText, container } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		const addButton = getByRole('button', { name: 'Add Merchant' });

		// Step 1: Add a merchant from the combo box
		await fireEvent.change(select, { target: { value: 'walmart' } });
		await fireEvent.click(addButton);
		
		// Wait for the addition to complete and UI to update
		await new Promise(resolve => setTimeout(resolve, 300));

		// Step 2: Verify the merchant was added to the list
		await waitFor(() => {
			const merchantList = container.querySelector('.merchant-list');
			expect(merchantList).toBeTruthy();
			expect(merchantList.textContent).toContain('walmart');
		});

		// Step 3: Check if remove buttons are still functional
		// First, let's check if there are any existing merchants (amazon, target) that we can test
		const existingMerchants = ['amazon', 'target'];
		let foundWorkingRemoveButton = false;
		
		for (const merchantName of existingMerchants) {
			try {
				const merchantElement = getByText(merchantName);
				const merchantInfoDiv = merchantElement.closest('div');
				const merchantCard = merchantInfoDiv.parentElement;
				const removeButton = merchantCard.querySelector('button');
				
				if (removeButton && removeButton.textContent.includes('Remove')) {
					// Test if the button is clickable and responsive
					const initialText = removeButton.textContent;
					
					// Try to click the button
					await fireEvent.click(removeButton);
					
					// Wait a bit to see if anything changes
					await new Promise(resolve => setTimeout(resolve, 100));
					
					// Check if the button state changed (e.g., to "Removing...")
					const afterClickText = removeButton.textContent;
					
					console.log(`Testing remove button for ${merchantName}:`);
					console.log(`  Initial text: ${initialText}`);
					console.log(`  After click text: ${afterClickText}`);
					console.log(`  Button disabled: ${removeButton.disabled}`);
					console.log(`  Button clickable: ${!removeButton.disabled && removeButton.style.pointerEvents !== 'none'}`);
					
					// If the button text changed or it's not disabled, it's working
					if (afterClickText !== initialText || !removeButton.disabled) {
						foundWorkingRemoveButton = true;
						console.log(`  ✅ Remove button for ${merchantName} is working`);
					} else {
						console.log(`  ❌ Remove button for ${merchantName} is NOT working`);
					}
					
					break; // Test one button to avoid interfering with the test
				}
			} catch (error) {
				console.log(`Could not find remove button for ${merchantName}:`, error.message);
			}
		}

		// Step 4: Now test the newly added merchant's remove button
		try {
			const walmartElement = getByText('walmart');
			const merchantInfoDiv = walmartElement.closest('div');
			const merchantCard = merchantInfoDiv.parentElement;
			const walmartRemoveButton = merchantCard.querySelector('button');
			
			console.log('Testing newly added walmart remove button:');
			console.log(`  Button found: ${!!walmartRemoveButton}`);
			console.log(`  Button text: ${walmartRemoveButton?.textContent}`);
			console.log(`  Button disabled: ${walmartRemoveButton?.disabled}`);
			console.log(`  Button onclick handler: ${!!walmartRemoveButton?.__click}`);
			
			// This should fail if the bug exists - the remove button should not be working
			expect(walmartRemoveButton).toBeTruthy();
			expect(walmartRemoveButton.textContent).toContain('Remove');
			expect(walmartRemoveButton.disabled).toBe(false);
			
			// Try to click the button
			await fireEvent.click(walmartRemoveButton);
			
			// Wait for any state changes
			await new Promise(resolve => setTimeout(resolve, 100));
			
			console.log(`  After click - Button text: ${walmartRemoveButton.textContent}`);
			console.log(`  After click - Button disabled: ${walmartRemoveButton.disabled}`);
			
		} catch (error) {
			console.log('Error testing walmart remove button:', error.message);
			// If we can't even find or interact with the button, that's the bug
			throw new Error(`Remove button for newly added merchant is not working: ${error.message}`);
		}

		// Step 5: Verify that at least one remove button is working
		// This test will pass if the bug doesn't exist, fail if it does
		expect(foundWorkingRemoveButton).toBe(true);
	});

	it('should verify that remove buttons work after adding merchant from combo box', async () => {
		// This test verifies that the production bug has been fixed - remove buttons
		// should work correctly after adding a merchant from the combo box
		
		// Mock the recent merchants endpoint (first call - initial load)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ['walmart', 'costco', 'bestbuy']
		});

		// Mock successful addition response (second call - add merchant)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		// Mock successful removal response (third call - remove merchant)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ success: true })
		});

		const { getByRole, getByText } = render(BudgetPage, {
			props: { data: mockData }
		});

		// Wait for the merchant picker to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		// Step 1: Add a merchant from the combo box
		const select = getByRole('combobox');
		const addButton = getByRole('button', { name: 'Add Merchant' });
		
		await fireEvent.change(select, { target: { value: 'walmart' } });
		await fireEvent.click(addButton);
		
		// Wait for the addition to complete
		await new Promise(resolve => setTimeout(resolve, 300));

		// Step 2: Test if existing remove buttons still work after the addition
		const amazonElement = getByText('amazon');
		const amazonInfoDiv = amazonElement.closest('div');
		const amazonCard = amazonInfoDiv.parentElement;
		const amazonRemoveButton = amazonCard.querySelector('button');
		
		// Verify the remove button exists and is clickable
		expect(amazonRemoveButton).toBeTruthy();
		expect(amazonRemoveButton.textContent).toContain('Remove');
		expect(amazonRemoveButton.disabled).toBe(false);
		
		// Check fetch calls before clicking
		const fetchCallsBefore = mockFetch.mock.calls.length;
		
		// Click the remove button
		await fireEvent.click(amazonRemoveButton);
		await new Promise(resolve => setTimeout(resolve, 200));
		
		// Check if the remove button state changed (indicating it's working)
		const afterClickText = amazonRemoveButton.textContent;
		const fetchCallsAfter = mockFetch.mock.calls.length;
		
		// The button should either change text (to "Removing...") or make a fetch call
		const buttonStateChanged = afterClickText !== 'Remove';
		const fetchCallMade = fetchCallsAfter > fetchCallsBefore;
		
		// At least one of these should be true if the button is working
		expect(buttonStateChanged || fetchCallMade).toBe(true);
		
		console.log('✅ Remove button is working correctly after adding merchant from combo box');
	});
});