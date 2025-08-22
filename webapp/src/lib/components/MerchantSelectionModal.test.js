import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MerchantSelectionModal from './MerchantSelectionModal.svelte';

// Mock fetch globally
global.fetch = vi.fn();

describe('MerchantSelectionModal', () => {
	const mockOnClose = vi.fn();
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// Ensure fetch is properly mocked
		global.fetch = vi.fn();
	});

	it('should not render when isOpen is false', () => {
		const { container } = render(MerchantSelectionModal, {
			props: {
				isOpen: false,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(container.querySelector('.fixed')).toBeNull();
	});

	it('should render when isOpen is true', () => {
		const { getByText, getByPlaceholderText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(getByText('Select Merchant')).toBeTruthy();
		expect(getByPlaceholderText('Search merchants...')).toBeTruthy();
	});

	it('should call onClose when close button is clicked', async () => {
		const { getByText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		const closeButton = getByText('×');
		await fireEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalled();
	});

	it('should call onClose when cancel button is clicked', async () => {
		const { getByText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		const cancelButton = getByText('Cancel');
		await fireEvent.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalled();
	});

	it('should show loading state initially', async () => {
		const { getByText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		// Should show loading state initially
		expect(getByText('Loading merchants...')).toBeTruthy();
		
		// Wait for loading to complete
		await new Promise(resolve => setTimeout(resolve, 600));
		
		// After loading, should show merchants (in dev mode) or error (in prod mode)
		// Check that loading is no longer visible
		expect(() => getByText('Loading merchants...')).toThrow();
	});

	it('should show search input', () => {
		const { getByPlaceholderText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(getByPlaceholderText('Search merchants...')).toBeTruthy();
	});
});
