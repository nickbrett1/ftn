import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CardDetailPage from './+page.svelte';

const mockCard = {
	id: 1,
	name: 'Chase Freedom',
	last4: '1234',
	created_at: '2024-01-01T00:00:00Z'
};

globalThis.fetch = vi.fn();
Object.defineProperty(globalThis, 'location', {
	value: { reload: vi.fn(), href: '' },
	writable: true
});

describe('Card Detail Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
	});
	afterEach(() => {
		// Clean up any remaining components
		document.body.innerHTML = '';
	});

	it('renders card info and buttons', () => {
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		expect(document.querySelector('[data-testid="edit-card-name-input"]').value).toBe(
			'Chase Freedom'
		);
		expect(document.querySelector('[data-testid="edit-card-last4-input"]').value).toBe('1234');
		expect(document.querySelector('[data-testid="delete-card-btn"]')).toBeTruthy();

		unmount(component);
	});

	it('shows validation error if fields are empty', async () => {
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		const nameInput = document.querySelector('[data-testid="edit-card-name-input"]');
		const last4Input = document.querySelector('[data-testid="edit-card-last4-input"]');

		// Simulate input events
		nameInput.value = '';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));

		last4Input.value = '';
		last4Input.dispatchEvent(new Event('input', { bubbles: true }));

		flushSync();

		expect(document.querySelector('[data-testid="save-error"]').textContent).toContain(
			'Please enter both card name and last 4 digits'
		);

		unmount(component);
	});

	it('shows validation error if last4 is not 4 digits', async () => {
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		const last4Input = document.querySelector('[data-testid="edit-card-last4-input"]');
		last4Input.value = '12';
		last4Input.dispatchEvent(new Event('input', { bubbles: true }));

		flushSync();

		expect(document.querySelector('[data-testid="save-error"]').textContent).toContain(
			'Last 4 digits must be exactly 4 numbers'
		);

		unmount(component);
	});

	it('calls fetch to save card', async () => {
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		const nameInput = document.querySelector('[data-testid="edit-card-name-input"]');
		const last4Input = document.querySelector('[data-testid="edit-card-last4-input"]');

		nameInput.value = 'New Name';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));

		last4Input.value = '5678';
		last4Input.dispatchEvent(new Event('input', { bubbles: true }));

		flushSync();

		// Wait for the fetch call
		await new Promise((resolve) => setTimeout(resolve, 100));
		flushSync();

		expect(fetch).toHaveBeenCalledWith(
			'/projects/ccbilling/cards/1',
			expect.objectContaining({ method: 'PUT' })
		);

		unmount(component);
	});

	it('shows and cancels delete dialog', async () => {
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		const deleteButton = document.querySelector('[data-testid="delete-card-btn"]');
		deleteButton.click();

		flushSync();

		expect(document.querySelector('[data-testid="delete-dialog"]')).toBeTruthy();

		const cancelButton = document.querySelector('[data-testid="cancel-delete-btn"]');
		cancelButton.click();

		flushSync();

		expect(document.querySelector('[data-testid="delete-dialog"]')).toBeNull();

		unmount(component);
	});

	it('calls fetch to delete card when confirmed', async () => {
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		const deleteButton = document.querySelector('[data-testid="delete-card-btn"]');
		deleteButton.click();

		flushSync();

		const confirmButton = document.querySelector('[data-testid="confirm-delete-btn"]');
		confirmButton.click();

		flushSync();

		// Wait for the fetch call
		await new Promise((resolve) => setTimeout(resolve, 100));
		flushSync();

		expect(fetch).toHaveBeenCalledWith(
			'/projects/ccbilling/cards/1',
			expect.objectContaining({ method: 'DELETE' })
		);

		unmount(component);
	});

	it('shows error if save fails', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Save failed' })
		});
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		const nameInput = document.querySelector('[data-testid="edit-card-name-input"]');
		const last4Input = document.querySelector('[data-testid="edit-card-last4-input"]');

		nameInput.value = 'New Name';
		nameInput.dispatchEvent(new Event('input', { bubbles: true }));

		last4Input.value = '5678';
		last4Input.dispatchEvent(new Event('input', { bubbles: true }));

		flushSync();

		// Wait for the error to appear
		await new Promise((resolve) => setTimeout(resolve, 100));
		flushSync();

		expect(document.querySelector('[data-testid="save-error"]').textContent).toContain(
			'Save failed'
		);

		unmount(component);
	});

	it('shows error if delete fails', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			json: () => Promise.resolve({ error: 'Delete failed' })
		});
		const component = mount(CardDetailPage, {
			target: document.body,
			props: { data: { card: mockCard } }
		});

		const deleteButton = document.querySelector('[data-testid="delete-card-btn"]');
		deleteButton.click();

		flushSync();

		const confirmButton = document.querySelector('[data-testid="confirm-delete-btn"]');
		confirmButton.click();

		flushSync();

		// Wait for the error to appear
		await new Promise((resolve) => setTimeout(resolve, 100));
		flushSync();

		expect(document.querySelector('[data-testid="delete-error"]').textContent).toContain(
			'Delete failed'
		);

		unmount(component);
	});
});
