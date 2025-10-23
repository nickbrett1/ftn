import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
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

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for loading to complete
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		// Check if the component rendered
		expect(document.body.innerHTML).toContain('No recent unassigned merchants found');
		expect(mockFetch).toHaveBeenCalledWith('/projects/ccbilling/budgets/recent-merchants');

		// Clean up
		unmount(component);
	});

	it('should render merchants when API call succeeds', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		// Check if the select element has the merchant options
		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Target');
		expect(select.innerHTML).toContain('Walmart');

		// Clean up
		unmount(component);
	});

	it('should render no merchants message when API returns empty array', async () => {
		// Mock fetch to return empty array
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for loading to complete
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		// Check for the no merchants message
		expect(document.body.innerHTML).toContain('No recent unassigned merchants found');

		// Clean up
		unmount(component);
	});

	it('should call onSelect when a merchant is selected from dropdown', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		
		// Simulate selecting a merchant
		select.value = 'Target';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(mockOnSelect).toHaveBeenCalledWith('Target');

		// Clean up
		unmount(component);
	});

	it('should show selected merchant when selectedMerchant prop is provided', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				selectedMerchant: 'Target',
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		expect(select.value).toBe('Target');

		// Clean up
		unmount(component);
	});

	it('should use custom placeholder when provided', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				placeholder: 'Custom placeholder...',
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		// Check if placeholder option exists
		const placeholderOption = select.querySelector('option[value=""]');
		expect(placeholderOption).toBeTruthy();
		expect(placeholderOption.textContent).toBe('Custom placeholder...');

		// Clean up
		unmount(component);
	});

	it('should display merchants returned from server (server-side filtering)', async () => {
		// Server now returns only unassigned merchants, so we don't need client-side filtering
		const mockMerchants = ['Best Buy', 'Target']; // Only unassigned merchants
		
		// Mock fetch to return unassigned merchants only
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		
		// Check that only unassigned merchants are displayed (server-side filtering)
		expect(select.innerHTML).toContain('Target');
		expect(select.innerHTML).toContain('Best Buy');

		// Clean up
		unmount(component);
	});

	it('should show "No merchants available" when server returns empty array', async () => {
		// Server returns empty array when all merchants are assigned
		const mockMerchants = [];
		
		// Mock fetch to return empty array
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for message to appear
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		// Check for the no merchants message
		expect(document.body.innerHTML).toContain('No recent unassigned merchants found');

		// Clean up
		unmount(component);
	});

	it('should handle normal merchant loading', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for merchants to load
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Target');

		// Clean up
		unmount(component);
	});

	it('should handle API errors gracefully', async () => {
		// Mock fetch to return an error
		mockFetch.mockResolvedValue({
			ok: false,
			status: 500
		});

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for error message to appear
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		// Check for error message
		expect(document.body.innerHTML).toMatch(/Error: Failed to load recent merchants/);

		// Clean up
		unmount(component);
	});

	it('should handle network errors gracefully', async () => {
		// Mock fetch to throw an error
		mockFetch.mockRejectedValue(new Error('Network error'));

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for error message to appear
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		// Check for error message
		expect(document.body.innerHTML).toContain('Error: Network error');

		// Clean up
		unmount(component);
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

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		
		// Select a merchant - this should trigger onSelect exactly once
		// and not cause an infinite loop when the DOM is updated
		select.value = 'Amazon';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		
		// Wait a bit to ensure any async operations complete
		await new Promise(resolve => setTimeout(resolve, 200));
		flushSync();
		
		// onSelect should be called exactly once, not in a loop
		expect(onSelectCallCount).toBe(1);
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		
		// The select should still have the correct value
		expect(select.value).toBe('Amazon');

		// Clean up
		unmount(component);
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

		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		
		// Select a merchant
		select.value = 'Amazon';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		
		// Wait for the 100ms timeout and any subsequent DOM updates
		await new Promise(resolve => setTimeout(resolve, 300));
		flushSync();
		
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

		// Clean up
		unmount(component);
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
		let component;
		const mockOnSelect = vi.fn((merchant) => {
			onSelectCallCount++;
			
			if (onSelectCallCount > maxCalls) {
				throw new Error(`Infinite loop detected! onSelect called ${onSelectCallCount} times (limit: ${maxCalls})`);
			}
			
			// Simulate parent component behavior: 
			// First, the parent sets selectedMerchant to the selected value
			selectedMerchant = merchant;
			// Unmount and remount with new props
			unmount(component);
			component = mount(MerchantPicker, {
				target: document.body,
				props: { selectedMerchant, onSelect: mockOnSelect }
			});
			flushSync();
			
			// Then, after a brief delay, the parent resets it to empty
			setTimeout(() => {
				selectedMerchant = '';
				unmount(component);
				component = mount(MerchantPicker, {
					target: document.body,
					props: { selectedMerchant, onSelect: mockOnSelect }
				});
				flushSync();
			}, 50);
		});

		// Mount the component
		component = mount(MerchantPicker, {
			target: document.body,
			props: {
				selectedMerchant,
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		
		// Select a merchant - this should trigger onSelect exactly once
		// even though the parent resets selectedMerchant = '' after onSelect
		select.value = 'Amazon';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		
		// Wait for the 100ms timeout and any subsequent DOM updates
		await new Promise(resolve => setTimeout(resolve, 500)); // Longer wait
		flushSync();
		
		// onSelect should be called exactly once, not in a loop
		expect(onSelectCallCount).toBe(1);
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		
		// The select should be reset to empty (as the parent intended)
		const finalSelect = document.querySelector('select');
		expect(finalSelect.value).toBe('');

		// Clean up
		unmount(component);
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
		let component;
		const mockOnSelect = vi.fn((merchant) => {
			onSelectCallCount++;
			
			if (onSelectCallCount > maxCalls) {
				throw new Error(`Infinite loop detected! onSelect called ${onSelectCallCount} times (limit: ${maxCalls})`);
			}
			
			// Simulate parent component behavior: first set to selected value, then reset
			selectedMerchant = merchant;
			// Unmount and remount with new props
			unmount(component);
			component = mount(MerchantPicker, {
				target: document.body,
				props: { selectedMerchant, onSelect: mockOnSelect }
			});
			flushSync();
			
			// Then immediately reset to empty
			selectedMerchant = '';
			unmount(component);
			component = mount(MerchantPicker, {
				target: document.body,
				props: { selectedMerchant, onSelect: mockOnSelect }
			});
			flushSync();
		});

		// Mount the component
		component = mount(MerchantPicker, {
			target: document.body,
			props: {
				selectedMerchant,
				onSelect: mockOnSelect
			}
		});

		// Wait for initial load to complete
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();

		const select = document.querySelector('select');
		expect(select).toBeTruthy();
		
		// Select a merchant - this should trigger onSelect exactly once
		select.value = 'Amazon';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();
		
		// Wait for any async operations
		await new Promise(resolve => setTimeout(resolve, 200));
		flushSync();
		
		// onSelect should be called exactly once, not in a loop
		expect(onSelectCallCount).toBe(1);
		expect(mockOnSelect).toHaveBeenCalledWith('Amazon');
		expect(mockOnSelect).toHaveBeenCalledTimes(1);
		
		// The select should be reset to empty (as the parent intended)
		const finalSelect = document.querySelector('select');
		expect(finalSelect.value).toBe('');

		// Clean up
		unmount(component);
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
		
		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: vi.fn()
			}
		});

		// Verify we're in loading state
		expect(document.body.innerHTML).toContain('Loading recent merchants...');
		
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
		flushSync();
		
		// The UI should not be stuck in loading state
		// It should show the merchants or empty state, not "Loading recent merchants..."
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();
		
		// Should either show merchants or empty state, but NOT loading
		const loadingText = document.body.innerHTML.includes('Loading recent merchants...');
		expect(loadingText).toBeFalsy();
		
		// Verify the component is in a valid state (not stuck)
		const combobox = document.querySelector('select');
		expect(combobox).toBeTruthy();

		// Clean up
		unmount(component);
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
		
		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: vi.fn()
			}
		});

		// Wait for initial load to complete
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();
		
		expect(document.querySelector('select')).toBeTruthy();
		
		const initialFetchCount = fetchCallCount;
		
		// Make multiple rapid calls to refreshMerchantList
		const promises = [
			component.refreshMerchantList(),
			component.refreshMerchantList(),
			component.refreshMerchantList(),
			component.refreshMerchantList()
		];
		
		await Promise.all(promises);
		flushSync();
		
		// Should only make one additional fetch call, not 4
		// The race condition protection should prevent multiple concurrent calls
		expect(fetchCallCount).toBe(initialFetchCount + 1);

		// Clean up
		unmount(component);
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
		
		// Mount the component
		const component = mount(MerchantPicker, {
			target: document.body,
			props: {
				onSelect: vi.fn()
			}
		});

		// Verify we're in loading state
		expect(document.body.innerHTML).toContain('Loading recent merchants...');
		
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
		flushSync();
		
		// The component should be in a valid state, not stuck
		await new Promise(resolve => setTimeout(resolve, 100));
		flushSync();
		
		const combobox = document.querySelector('select');
		expect(combobox).toBeTruthy();
		
		// Should not be stuck in loading state
		const loadingText = document.body.innerHTML.includes('Loading recent merchants...');
		expect(loadingText).toBeFalsy();

		// Clean up
		unmount(component);
	});
});
