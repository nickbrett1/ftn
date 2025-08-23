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
		const { getByText, getByLabelText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(getByText('Select Merchant')).toBeTruthy();
		expect(getByLabelText('Search merchants')).toBeTruthy();
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

	it('should show loading state initially', () => {
		const { getByText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(getByText('Loading merchants...')).toBeTruthy();
	});

	it('should show search input', () => {
		const { getByLabelText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(getByLabelText('Search merchants')).toBeTruthy();
	});

	it('should not cause infinite loops when typing in search input', async () => {
		// Mock successful fetch response
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ['Merchant A', 'Merchant B', 'Merchant C']
		});

		const { getByLabelText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		const searchInput = getByLabelText('Search merchants');
		
		// Wait for initial load to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		// Type multiple characters rapidly to trigger search
		await fireEvent.input(searchInput, { target: { value: 'a' } });
		await fireEvent.input(searchInput, { target: { value: 'ab' } });
		await fireEvent.input(searchInput, { target: { value: 'abc' } });
		await fireEvent.input(searchInput, { target: { value: 'abcd' } });
		await fireEvent.input(searchInput, { target: { value: 'abcde' } });

		// Wait for debounced search to complete
		await new Promise(resolve => setTimeout(resolve, 200));

		// If we get here without the test timing out or throwing an error,
		// it means no infinite loop occurred
		expect(searchInput.value).toBe('abcde');
	});

	it('should properly capture and display typed input characters', async () => {
		// Mock successful fetch response
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ['Merchant A', 'Merchant B', 'Merchant C']
		});

		const { getByLabelText } = render(MerchantSelectionModal, {
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		const searchInput = getByLabelText('Search merchants');
		
		// Wait for initial load to complete
		await new Promise(resolve => setTimeout(resolve, 100));

		// Test typing individual characters and verify each is captured
		const testChars = ['a', 'b', 'c'];
		let currentValue = '';
		
		for (let i = 0; i < testChars.length; i++) {
			const char = testChars[i];
			currentValue += char;
			
			// Simulate typing the character
			await fireEvent.input(searchInput, { target: { value: currentValue } });
			
			// Wait a bit for the event to be processed
			await new Promise(resolve => setTimeout(resolve, 20));
			
			// Verify the input value is updated immediately
			expect(searchInput.value).toBe(currentValue);
		}

		// Final verification that all characters are captured
		expect(searchInput.value).toBe('abc');
	});
});
