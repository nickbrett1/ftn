import { render, cleanup } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MerchantPicker from './MerchantPicker.svelte';

// Mock fetch
global.fetch = vi.fn();

describe('MerchantPicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	it('should render loading state initially', () => {
		const { container } = render(MerchantPicker);
		expect(container.innerHTML).toContain('Loading merchants...');
	});

	it('should render merchants dropdown when data is loaded', async () => {
		const mockMerchants = ['Amazon', 'Walmart', 'Target'];
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { container } = render(MerchantPicker);

		// Wait for async data loading
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(container.innerHTML).toContain('Amazon');
		expect(container.innerHTML).toContain('Walmart');
		expect(container.innerHTML).toContain('Target');
	});

	it('should render error state when API call fails', async () => {
		fetch.mockRejectedValueOnce(new Error('Network error'));

		const { container } = render(MerchantPicker);

		// Wait for async error handling
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(container.innerHTML).toContain('Error: Network error');
	});

	it('should render empty state when no merchants found', async () => {
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => []
		});

		const { container } = render(MerchantPicker);

		// Wait for async data loading
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(container.innerHTML).toContain('No unassigned merchants found');
	});

	it('should call onSelect when merchant is selected', async () => {
		const mockMerchants = ['Amazon', 'Walmart'];
		const mockOnSelect = vi.fn();

		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockMerchants
		});

		const { container } = render(MerchantPicker, { props: { onSelect: mockOnSelect } });

		// Wait for async data loading
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(container.innerHTML).toContain('Amazon');
		expect(container.innerHTML).toContain('Walmart');
	});

it('renders dropdown with merchants only (no manual entry)', async () => {
    const mockMerchants = ['Amazon'];
    fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMerchants
    });

    const { container } = render(MerchantPicker);

    // Wait for async data loading
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(container.innerHTML).toContain('Amazon');
    expect(container.innerHTML).not.toContain('Enter manually');
});
});
