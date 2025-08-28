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
});
