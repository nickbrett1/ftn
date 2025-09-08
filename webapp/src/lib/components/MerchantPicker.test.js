import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MerchantPicker from './MerchantPicker.svelte';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MerchantPicker', () => {
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
	});

	it('should render with minimal props and handle fetch call', async () => {
		// Mock fetch to return empty array
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});

		const { getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for loading to complete
		await waitFor(() => {
			expect(getByText('No recent unassigned merchants found')).toBeTruthy();
		});

		expect(mockFetch).toHaveBeenCalledWith('/projects/ccbilling/budgets/recent-merchants');
	});

	it('should render merchants when API call succeeds', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole, getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load and combobox to appear
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		// Check if the select element has the merchant options
		const select = getByRole('combobox');
		expect(select).toBeTruthy();
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Target');
		expect(select.innerHTML).toContain('Walmart');
	});

	it('should render no merchants message when API returns empty array', async () => {
		// Mock fetch to return empty array
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});

		const { getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for loading to complete
		await waitFor(() => {
			expect(getByText('No recent unassigned merchants found')).toBeTruthy();
		});
	});

	it('should call onSelect when a merchant is selected from dropdown', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		await fireEvent.change(select, { target: { value: 'Target' } });

		expect(mockOnSelect).toHaveBeenCalledWith('Target');
	});

	it('should show selected merchant when selectedMerchant prop is provided', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByDisplayValue } = render(MerchantPicker, {
			props: {
				selectedMerchant: 'Target',
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByDisplayValue('Target')).toBeTruthy();
		});
	});

	it('should use custom placeholder when provided', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByDisplayValue } = render(MerchantPicker, {
			props: {
				placeholder: 'Custom placeholder...',
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByDisplayValue('Custom placeholder...')).toBeTruthy();
		});
	});

	it('should display merchants returned from server (server-side filtering)', async () => {
		// Server now returns only unassigned merchants, so we don't need client-side filtering
		const mockMerchants = ['Best Buy', 'Target']; // Only unassigned merchants
		
		// Mock fetch to return unassigned merchants only
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Check that only unassigned merchants are displayed (server-side filtering)
		expect(select.innerHTML).toContain('Target');
		expect(select.innerHTML).toContain('Best Buy');
	});

	it('should show "No merchants available" when server returns empty array', async () => {
		// Server returns empty array when all merchants are assigned
		const mockMerchants = [];
		
		// Mock fetch to return empty array
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for message to appear
		await waitFor(() => {
			expect(getByText('No recent unassigned merchants found')).toBeTruthy();
		});
	});

	it('should handle normal merchant loading', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Target');
	});

	it('should handle API errors gracefully', async () => {
		// Mock fetch to return an error
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500
		});

		const { getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for error message to appear
		await waitFor(() => {
			expect(getByText(/Error: Failed to load recent merchants/)).toBeTruthy();
		});
	});

	it('should handle network errors gracefully', async () => {
		// Mock fetch to throw an error
		mockFetch.mockRejectedValue(new Error('Network error'));

		const { getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for error message to appear
		await waitFor(() => {
			expect(getByText('Error: Network error')).toBeTruthy();
		});
	});

	it('should not cause infinite loop when selecting merchant and refreshing list', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let onSelectCallCount = 0;
		
		// Mock fetch to return merchants initially
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const mockOnSelect = vi.fn(() => {
			onSelectCallCount++;
			// Simulate the parent component adding the merchant and then refreshing
			// This would normally trigger loadUnassignedMerchants() after 100ms
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Select a merchant - this should trigger onSelect exactly once
		// and not cause an infinite loop when the DOM is updated
		await fireEvent.change(select, { target: { value: 'Amazon' } });
		
		// Wait a bit to ensure any async operations complete
		await new Promise(resolve => setTimeout(resolve, 200));
		
		// onSelect should be called exactly once, not in a loop
		expect(onSelectCallCount).toBe(1);
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		
		// The select should still have the correct value
		expect(select.value).toBe('Amazon');
	});

	it('should prevent infinite loop when DOM updates trigger onchange events', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let onSelectCallCount = 0;
		let maxCalls = 10; // Safety limit to prevent actual infinite loop in test
		
		// Mock fetch to return merchants initially
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const mockOnSelect = vi.fn(() => {
			onSelectCallCount++;
			if (onSelectCallCount > maxCalls) {
				throw new Error('Infinite loop detected! onSelect called too many times');
			}
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Select a merchant
		await fireEvent.change(select, { target: { value: 'Amazon' } });
		
		// Wait for the 100ms timeout and any subsequent DOM updates
		await new Promise(resolve => setTimeout(resolve, 300));
		
		// onSelect should be called exactly once, not in a loop
		expect(onSelectCallCount).toBe(1);
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		
		// Verify the select value is still correct after all updates
		expect(select.value).toBe('Amazon');
		
		// This test would fail if the infinite loop bug returns because:
		// 1. onSelect would be called multiple times (violating the count check)
		// 2. The test would throw an error if onSelect is called more than maxCalls times
		// 3. The select value might be incorrect due to recursive updates
	});

	it('should handle parent component resetting selectedMerchant prop without infinite loop', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let onSelectCallCount = 0;
		let maxCalls = 5; // Lower safety limit to catch loops faster
		
		// Mock fetch to return merchants initially
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// This simulates what the parent component does:
		// 1. User selects merchant -> onSelect called
		// 2. Parent adds merchant to list
		// 3. Parent resets selectedMerchant = '' (this is what causes the infinite loop)
		let selectedMerchant = '';
		const mockOnSelect = vi.fn((merchant) => {
			onSelectCallCount++;
			
			if (onSelectCallCount > maxCalls) {
				throw new Error(`Infinite loop detected! onSelect called ${onSelectCallCount} times (limit: ${maxCalls})`);
			}
			
			// Simulate parent component behavior: 
			// First, the parent sets selectedMerchant to the selected value
			selectedMerchant = merchant;
			rerender({ selectedMerchant, onSelect: mockOnSelect });
			
			// Then, after a brief delay, the parent resets it to empty
			setTimeout(() => {
				selectedMerchant = '';
				rerender({ selectedMerchant, onSelect: mockOnSelect });
			}, 50);
		});

		const { getByRole, rerender } = render(MerchantPicker, {
			props: {
				selectedMerchant,
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Select a merchant - this should trigger onSelect exactly once
		// even though the parent resets selectedMerchant = '' after onSelect
		await fireEvent.change(select, { target: { value: 'Amazon' } });
		
		// Wait for the 100ms timeout and any subsequent DOM updates
		await new Promise(resolve => setTimeout(resolve, 500)); // Longer wait
		
		// onSelect should be called exactly once, not in a loop
		expect(onSelectCallCount).toBe(1);
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		
		// The select should be reset to empty (as the parent intended)
		expect(select.value).toBe('');
	});

	it('should not cause infinite loop when parent resets selectedMerchant immediately', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let onSelectCallCount = 0;
		let maxCalls = 3; // Very low limit to catch loops quickly
		
		// Mock fetch to return merchants initially
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// This simulates the real-world scenario more accurately:
		// Parent first sets selectedMerchant to the selected value, then resets it
		let selectedMerchant = '';
		const mockOnSelect = vi.fn((merchant) => {
			onSelectCallCount++;
			
			if (onSelectCallCount > maxCalls) {
				throw new Error(`Infinite loop detected! onSelect called ${onSelectCallCount} times (limit: ${maxCalls})`);
			}
			
			// Simulate parent component behavior: first set to selected value, then reset
			selectedMerchant = merchant;
			rerender({ selectedMerchant, onSelect: mockOnSelect });
			
			// Then immediately reset to empty
			selectedMerchant = '';
			rerender({ selectedMerchant, onSelect: mockOnSelect });
		});

		const { getByRole, rerender } = render(MerchantPicker, {
			props: {
				selectedMerchant,
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Select a merchant - this should trigger onSelect exactly once
		await fireEvent.change(select, { target: { value: 'Amazon' } });
		
		// Wait for any async operations
		await new Promise(resolve => setTimeout(resolve, 200));
		
		// onSelect should be called exactly once, not in a loop
		expect(onSelectCallCount).toBe(1);
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		
		// The select should be reset to empty (as the parent intended)
		expect(select.value).toBe('');
	});

	// This test demonstrates how the infinite loop bug would be caught
	// It's commented out because it would fail with our current fix
	// Uncomment and remove the isUpdatingUI flag to see it fail
	/*
	it('would fail if infinite loop bug returns (demonstration)', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let onSelectCallCount = 0;
		
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const mockOnSelect = vi.fn(() => {
			onSelectCallCount++;
			// Without the isUpdatingUI flag, this would be called multiple times
			// causing the test to fail
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		await fireEvent.change(select, { target: { value: 'Amazon' } });
		await new Promise(resolve => setTimeout(resolve, 300));
		
		// This would fail if the infinite loop bug returns:
		// expect(onSelectCallCount).toBe(1); // Would be > 1
		// expect(mockOnSelect).toHaveBeenCalledTimes(1); // Would be > 1
	});
	*/

	it('should handle race condition when refreshMerchantList is called during initial load', async () => {
		// This test exposes the race condition where refreshMerchantList() is called
		// while the initial loadUnassignedMerchants() is still in progress
		
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let resolveInitialLoad;
		let initialLoadPromise = new Promise(resolve => {
			resolveInitialLoad = resolve;
		});
		
		// Mock fetch to return a promise that we can control
		mockFetch.mockImplementation(() => initialLoadPromise);
		
		const { getByText, component } = render(MerchantPicker, {
			props: {
				onSelect: vi.fn()
			}
		});

		// Verify we're in loading state
		expect(getByText('Loading recent merchants...')).toBeTruthy();
		
		// Call refreshMerchantList while initial load is still in progress
		// This should NOT cause the UI to get stuck in loading state
		const refreshPromise = component.refreshMerchantList();
		
		// Now resolve the initial load
		resolveInitialLoad({
			ok: true,
			json: async () => mockMerchants
		});
		
		// Wait for both operations to complete
		await Promise.all([initialLoadPromise, refreshPromise]);
		
		// The UI should not be stuck in loading state
		// It should show the merchants or empty state, not "Loading recent merchants..."
		await waitFor(() => {
			// Should either show merchants or empty state, but NOT loading
			const loadingText = document.querySelector('div')?.textContent?.includes('Loading recent merchants...');
			expect(loadingText).toBeFalsy();
		}, { timeout: 2000 });
		
		// Verify the component is in a valid state (not stuck)
		const combobox = document.querySelector('select');
		expect(combobox).toBeTruthy();
	});

	it('should prevent multiple concurrent loadUnassignedMerchants calls', async () => {
		// This test verifies that multiple concurrent calls to loadUnassignedMerchants
		// are properly handled and don't cause race conditions
		
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let fetchCallCount = 0;
		
		// Mock fetch to track how many times it's called
		mockFetch.mockImplementation(() => {
			fetchCallCount++;
			return Promise.resolve({
				ok: true,
				json: async () => mockMerchants
			});
		});
		
		const { component } = render(MerchantPicker, {
			props: {
				onSelect: vi.fn()
			}
		});

		// Wait for initial load to complete
		await waitFor(() => {
			expect(document.querySelector('select')).toBeTruthy();
		});
		
		const initialFetchCount = fetchCallCount;
		
		// Make multiple rapid calls to refreshMerchantList
		const promises = [
			component.refreshMerchantList(),
			component.refreshMerchantList(),
			component.refreshMerchantList(),
			component.refreshMerchantList()
		];
		
		await Promise.all(promises);
		
		// Should only make one additional fetch call, not 4
		// The race condition protection should prevent multiple concurrent calls
		expect(fetchCallCount).toBe(initialFetchCount + 1);
	});

	it('should handle refreshMerchantList being called before initial load completes', async () => {
		// This test simulates the exact race condition described in the issue:
		// User clicks remove merchant before combo box has loaded
		
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		let resolveInitialLoad;
		let initialLoadPromise = new Promise(resolve => {
			resolveInitialLoad = resolve;
		});
		
		// Mock fetch to return a controlled promise
		mockFetch.mockImplementation(() => initialLoadPromise);
		
		const { component } = render(MerchantPicker, {
			props: {
				onSelect: vi.fn()
			}
		});

		// Verify we're in loading state
		expect(document.querySelector('div')?.textContent?.includes('Loading recent merchants...')).toBeTruthy();
		
		// Simulate the race condition: refreshMerchantList called before initial load completes
		// This is what happens when user clicks remove merchant before combo box loads
		const refreshPromise = component.refreshMerchantList();
		
		// Resolve the initial load
		resolveInitialLoad({
			ok: true,
			json: async () => mockMerchants
		});
		
		// Wait for operations to complete
		await Promise.all([initialLoadPromise, refreshPromise]);
		
		// The component should be in a valid state, not stuck
		await waitFor(() => {
			const combobox = document.querySelector('select');
			expect(combobox).toBeTruthy();
		}, { timeout: 2000 });
		
		// Should not be stuck in loading state
		const loadingText = document.querySelector('div')?.textContent?.includes('Loading recent merchants...');
		expect(loadingText).toBeFalsy();
	});

	it('should handle duplicate merchant names without DOM indexing issues', async () => {
		// This test detects the regression where multiple merchants with the same name
		// cause DOM indexing issues when using merchant name as the key in {#each} blocks
		
		const mockMerchants = ['Amazon', 'Amazon', 'Target', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants with duplicates for the correct URL
		mockFetch.mockImplementation((url) => {
			if (url.includes('recent-merchants')) {
				return Promise.resolve({
					ok: true,
					json: async () => mockMerchants
				});
			}
			return Promise.resolve({
				ok: true,
				json: async () => []
			});
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Count how many times each merchant appears in the DOM
		const amazonCount = (select.innerHTML.match(/Amazon/g) || []).length;
		const targetCount = (select.innerHTML.match(/Target/g) || []).length;
		const walmartCount = (select.innerHTML.match(/Walmart/g) || []).length;
		
		// With duplicate merchants, we should see each merchant name appear multiple times
		// If the DOM indexing bug regresses, we might see incorrect counts or missing options
		expect(amazonCount).toBeGreaterThan(1); // Should appear at least twice
		expect(targetCount).toBeGreaterThan(1); // Should appear at least twice
		expect(walmartCount).toBeGreaterThanOrEqual(1); // Should appear at least once
		
		// Verify all options are present and selectable
		const options = select.querySelectorAll('option');
		const optionValues = Array.from(options).map(option => option.value);
		
		// Should have placeholder + all merchants (including duplicates)
		expect(options.length).toBe(6); // 1 placeholder + 5 merchants
		expect(optionValues).toContain(''); // Placeholder
		expect(optionValues).toContain('Amazon');
		expect(optionValues).toContain('Target');
		expect(optionValues).toContain('Walmart');
		
		// Test that we can select each merchant (including duplicates)
		// This would fail if DOM elements are incorrectly reused
		await fireEvent.change(select, { target: { value: 'Amazon' } });
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		
		await fireEvent.change(select, { target: { value: 'Target' } });
		expect(mockOnSelect).toHaveBeenCalledWith('Target');
		
		await fireEvent.change(select, { target: { value: 'Walmart' } });
		expect(mockOnSelect).toHaveBeenCalledWith('Walmart');
		
		// Verify the select value is correctly set after each selection
		expect(select.value).toBe('Walmart');
	});

	it('should detect Svelte duplicate key error when merchants have same names', async () => {
		// This test specifically targets the MerchantSelectionModal where the bug was occurring
		// The modal uses {#each filteredMerchants as merchant (merchant)} which causes
		// Svelte to throw a "Keyed each block has duplicate key" error when merchants have the same name
		
		const mockMerchants = ['Amazon', 'Amazon', 'Target', 'Target', 'Walmart'];
		
		// Mock the modal's fetch call to return merchants with duplicates
		mockFetch.mockImplementation((url) => {
			if (url.includes('unassigned-merchants')) {
				return Promise.resolve({
					ok: true,
					json: async () => mockMerchants
				});
			}
			if (url.includes('recent-merchants')) {
				return Promise.resolve({
					ok: true,
					json: async () => []
				});
			}
			// Default to empty for other calls
			return Promise.resolve({
				ok: true,
				json: async () => []
			});
		});

		// Capture both console errors and unhandled exceptions
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const originalOnError = window.onerror;
		let caughtError = null;
		window.onerror = (message, source, lineno, colno, error) => {
			caughtError = { message, source, lineno, colno, error };
			return false; // Don't prevent default error handling
		};

		const { getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load (should show empty state since recent-merchants returns empty)
		await waitFor(() => {
			expect(getByText('No recent unassigned merchants found')).toBeTruthy();
		});

		// Click "View All Merchants" to open the modal
		const viewAllButton = getByText('View All Merchants');
		await fireEvent.click(viewAllButton);

		// Wait for modal to open - this should trigger the Svelte duplicate key error
		await waitFor(() => {
			// Look for the modal title specifically in the modal (not the main component label)
			const modalTitle = document.querySelector('[id="modal-title"]');
			expect(modalTitle).toBeTruthy();
		});

		// Wait for merchants to load in modal - this is where the error occurs
		// The Svelte error happens when the merchants are rendered, so we need to wait for that
		await waitFor(() => {
			// Check if merchants have loaded (either as buttons or if there's an error)
			const merchantButtons = document.querySelectorAll('button[role="option"]');
			const loadingText = document.querySelector('.text-gray-400');
			const hasMerchants = merchantButtons.length > 0;
			const notLoading = !loadingText || !loadingText.textContent.includes('Loading merchants');
			
			// Either merchants loaded or loading finished (with or without error)
			expect(hasMerchants || notLoading).toBeTruthy();
		}, { timeout: 3000 });

		// Check if the Svelte duplicate key error was caught
		// This error indicates the regression has occurred
		const duplicateKeyError = consoleSpy.mock.calls.find(call => 
			call[0] && call[0].includes && call[0].includes('Keyed each block has duplicate key')
		);
		
		// Also check if we caught an unhandled error
		const hasDuplicateKeyError = duplicateKeyError || 
			(caughtError && caughtError.message && caughtError.message.includes('Keyed each block has duplicate key'));
		
		// The test should fail if this error is NOT present, because that would mean
		// the regression test isn't working properly
		expect(hasDuplicateKeyError).toBeTruthy();
		
		// Clean up
		consoleSpy.mockRestore();
		window.onerror = originalOnError;
	});
});
