import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MerchantPicker from './MerchantPicker.svelte';

// Mock fetch globally
global.fetch = vi.fn();

describe('MerchantPicker', () => {
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render loading state initially', () => {
		const { getByText } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		expect(getByText('Loading recent merchants...')).toBeTruthy();
	});

	it('should render error state when API call fails', async () => {
		global.fetch.mockRejectedValueOnce(new Error('Network error'));

		const { getByText } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		// Wait for error to appear
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByText('Error: Network error')).toBeTruthy();
	});

	it('should render merchants when API call succeeds', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByText, getByRole } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect }
		});

		// Wait for merchants to load
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Check if the select element has the merchant options
		const select = getByRole('combobox');
		expect(select).toBeTruthy();
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Target');
		expect(getByText('View All Merchants')).toBeTruthy();
		expect(getByText('Showing 20 most recent merchants from the past month')).toBeTruthy();
	});

	it('should render no merchants message when API returns empty array', async () => {
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		const { getByText } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		// Wait for merchants to load
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByText('No recent unassigned merchants found')).toBeTruthy();
	});

	it('should call onSelect when a merchant is selected from dropdown', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect }
		});

		// Wait for merchants to load
		await new Promise((resolve) => setTimeout(resolve, 0));

		const select = getByRole('combobox');
		await fireEvent.change(select, { target: { value: 'Target' } });

		expect(mockOnSelect).toHaveBeenCalledWith('Target');
	});

	it('should show selected merchant when selectedMerchant prop is provided', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByDisplayValue } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect, selectedMerchant: 'Target' }
		});

		// Wait for merchants to load
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByDisplayValue('Target')).toBeTruthy();
	});

	it('should use custom placeholder when provided', async () => {
		const mockMerchants = ['Amazon'];
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByDisplayValue } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect, placeholder: 'Custom placeholder...' }
		});

		// Wait for merchants to load
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getByDisplayValue('Custom placeholder...')).toBeTruthy();
	});

	it('should call API endpoint for recent merchants', async () => {
		const mockMerchants = ['Amazon'];
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		// Wait for API call
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(global.fetch).toHaveBeenCalledWith('/projects/ccbilling/budgets/recent-merchants');
	});
});
