import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import MerchantSelectionModal from './MerchantSelectionModal.svelte';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('MerchantSelectionModal', () => {
	const mockOnClose = vi.fn();
	const mockOnSelect = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock fetch to return a proper response
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue([])
		});
	});

	afterEach(() => {
		// Clear all mocks and timers to prevent leaks
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	it('should not render when isOpen is false', () => {
		const component = mount(MerchantSelectionModal, {
			target: document.body,
			props: {
				isOpen: false,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(document.querySelector('.fixed')).toBeNull();

		unmount(component);
	});

	it('should render when isOpen is true', () => {
		const component = mount(MerchantSelectionModal, {
			target: document.body,
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(document.body.textContent).toContain('Select Merchant');
		expect(document.querySelector('input[placeholder="Search merchants..."]')).toBeTruthy();

		unmount(component);
	});

	it('should call onClose when close button is clicked', async () => {
		const component = mount(MerchantSelectionModal, {
			target: document.body,
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		// Find the close button by looking for the × character
		const buttons = document.querySelectorAll('button');
		const closeButton = Array.from(buttons).find((btn) => btn.textContent.includes('×'));
		closeButton.click();

		flushSync();

		expect(mockOnClose).toHaveBeenCalled();

		unmount(component);
	});

	it('should call onClose when cancel button is clicked', async () => {
		const component = mount(MerchantSelectionModal, {
			target: document.body,
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		const cancelButton = Array.from(document.querySelectorAll('button')).find((btn) =>
			btn.textContent.includes('Cancel')
		);
		cancelButton.click();

		flushSync();

		expect(mockOnClose).toHaveBeenCalled();

		unmount(component);
	});

	it('should show loading state initially', () => {
		const component = mount(MerchantSelectionModal, {
			target: document.body,
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(document.body.textContent).toContain('Loading merchants...');

		unmount(component);
	});

	it('should show search input', () => {
		const component = mount(MerchantSelectionModal, {
			target: document.body,
			props: {
				isOpen: true,
				onClose: mockOnClose,
				onSelect: mockOnSelect
			}
		});

		expect(document.querySelector('input[placeholder="Search merchants..."]')).toBeTruthy();

		unmount(component);
	});
});
