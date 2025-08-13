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

	it('should filter out assigned merchants when assignedMerchants prop is provided', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart', 'Best Buy'];
		const assignedMerchants = ['Amazon', 'Walmart'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole, queryByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect,
				assignedMerchants
			}
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		
		// Check that assigned merchants are not in the options
		expect(select.innerHTML).not.toContain('Amazon');
		expect(select.innerHTML).not.toContain('Walmart');
		
		// Check that unassigned merchants are still available
		expect(select.innerHTML).toContain('Target');
		expect(select.innerHTML).toContain('Best Buy');
	});

	it('should show "All recent merchants are already assigned" when all merchants are assigned', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		const assignedMerchants = ['Amazon', 'Target'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByText } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect,
				assignedMerchants
			}
		});

		// Wait for message to appear
		await waitFor(() => {
			expect(getByText('All recent merchants are already assigned to budgets')).toBeTruthy();
		});
	});

	it('should handle undefined assignedMerchants gracefully', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		
		// Mock fetch to return merchants
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole } = render(MerchantPicker, {
			props: {
				onSelect: mockOnSelect,
				assignedMerchants: undefined
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
			expect(getByText('Error: Failed to load recent merchants')).toBeTruthy();
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
});
