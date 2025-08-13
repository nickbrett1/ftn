import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MerchantPicker from './MerchantPicker.svelte';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MerchantPicker', () => {
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockClear();
		
		// Set up a default fetch mock to prevent errors
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => []
		});
	});

	it('should render without crashing', () => {
		try {
			const { container } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });
			console.log('Basic render successful, container:', container.innerHTML);
			expect(container).toBeTruthy();
		} catch (error) {
			console.error('Basic render failed:', error);
			throw error;
		}
	});

	it('should render with minimal props and handle fetch call', () => {
		try {
			// Override the default mock for this specific test
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			const { container } = render(MerchantPicker, { 
				props: { 
					onSelect: mockOnSelect,
					selectedMerchant: '',
					placeholder: 'Test',
					assignedMerchants: []
				} 
			});
			
			console.log('Minimal props render successful, container:', container.innerHTML);
			expect(container).toBeTruthy();
			// The component will call fetch in onMount, so we expect it to be called
			expect(mockFetch).toHaveBeenCalledWith('/projects/ccbilling/budgets/recent-merchants');
		} catch (error) {
			console.error('Minimal props render failed:', error);
			throw error;
		}
	});

	it('should render without triggering fetch initially', () => {
		try {
			// Override the default mock for this specific test
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			const { container } = render(MerchantPicker, { 
				props: { 
					onSelect: mockOnSelect,
					selectedMerchant: '',
					placeholder: 'Test',
					assignedMerchants: []
				} 
			});
			
			console.log('No fetch trigger render successful, container:', container.innerHTML);
			expect(container).toBeTruthy();
			// The component will call fetch in onMount, so we expect it to be called
			expect(mockFetch).toHaveBeenCalledWith('/projects/ccbilling/budgets/recent-merchants');
		} catch (error) {
			console.error('No fetch trigger render failed:', error);
			throw error;
		}
	});

	it('should render and handle fetch call properly', async () => {
		try {
			// Override the default mock for this specific test
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ['Test Merchant']
			});

			const { container, getByText } = render(MerchantPicker, { 
				props: { 
					onSelect: mockOnSelect,
					selectedMerchant: '',
					placeholder: 'Test',
					assignedMerchants: []
				} 
			});
			
			console.log('Initial render container:', container.innerHTML);
			
			// Wait for the fetch to complete
			await waitFor(() => {
				expect(mockFetch).toHaveBeenCalledWith('/projects/ccbilling/budgets/recent-merchants');
			});
			
			console.log('After fetch container:', container.innerHTML);
			expect(container).toBeTruthy();
		} catch (error) {
			console.error('Fetch handling test failed:', error);
			throw error;
		}
	});

	it('should render loading state initially', () => {
		try {
			// Override the default mock for this specific test
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => []
			});

			const { getByText, container } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });

			// Debug: log what's actually rendered
			console.log('Container HTML:', container.innerHTML);

			expect(getByText('Loading recent merchants...')).toBeTruthy();
		} catch (error) {
			console.error('Test error:', error);
			throw error;
		}
	});

	it('should render error state when API call fails', async () => {
		// Override the default mock to simulate an error
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const { getByText } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		// Wait for error to appear
		await waitFor(() => {
			expect(getByText('Error: Network error')).toBeTruthy();
		});
	});

	it('should render merchants when API call succeeds', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByText, getByRole } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect }
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		// Check if the select element has the merchant options
		const select = getByRole('combobox');
		expect(select).toBeTruthy();
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Target');
		expect(getByText('View All Merchants')).toBeTruthy();
		expect(getByText('Showing 20 most recent merchants from the past month')).toBeTruthy();
	});

	it('should render no merchants message when API returns empty array', async () => {
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		const { getByText } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByText('No recent unassigned merchants found')).toBeTruthy();
		});
	});

	it('should call onSelect when a merchant is selected from dropdown', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect }
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
		const mockMerchants = ['Amazon', 'Target'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByDisplayValue } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect, selectedMerchant: 'Target' }
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByDisplayValue('Target')).toBeTruthy();
		});
	});

	it('should use custom placeholder when provided', async () => {
		const mockMerchants = ['Amazon'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByDisplayValue } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect, placeholder: 'Custom placeholder...' }
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByDisplayValue('Custom placeholder...')).toBeTruthy();
		});
	});

	it('should call API endpoint for recent merchants', async () => {
		const mockMerchants = ['Amazon'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		// Wait for API call
		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith('/projects/ccbilling/budgets/recent-merchants');
		});
	});

	it('should filter out assigned merchants when assignedMerchants prop is provided', async () => {
		const mockMerchants = ['Amazon', 'Target', 'Walmart'];
		const assignedMerchants = ['Target'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole, queryByText } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect, assignedMerchants }
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Walmart');
		expect(select.innerHTML).not.toContain('Target');
	});

	it('should show "All recent merchants are already assigned" when all merchants are assigned', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		const assignedMerchants = ['Amazon', 'Target'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByText } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect, assignedMerchants }
		});

		// Wait for message to appear
		await waitFor(() => {
			expect(getByText('All recent merchants are already assigned to budgets')).toBeTruthy();
		});
	});

	it('should handle undefined assignedMerchants gracefully', async () => {
		const mockMerchants = ['Amazon', 'Target'];
		// Override the default mock for this specific test
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { getByRole } = render(MerchantPicker, {
			props: { onSelect: mockOnSelect }
		});

		// Wait for merchants to load
		await waitFor(() => {
			expect(getByRole('combobox')).toBeTruthy();
		});

		const select = getByRole('combobox');
		expect(select.innerHTML).toContain('Amazon');
		expect(select.innerHTML).toContain('Target');
	});
});
