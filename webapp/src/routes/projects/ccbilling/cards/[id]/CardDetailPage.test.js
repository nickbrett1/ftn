import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import CardDetailPage from './+page.svelte';

const mockCard = { id: 1, name: 'Chase Freedom', last4: '1234', created_at: '2024-01-01T00:00:00Z' };

global.fetch = vi.fn();
Object.defineProperty(window, 'location', { value: { reload: vi.fn(), href: '' }, writable: true });

describe('Card Detail Page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
	});
	afterEach(() => cleanup());

	it('renders card info and buttons', () => {
		const { getByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		expect(getByTestId('edit-card-name-input').value).toBe('Chase Freedom');
		expect(getByTestId('edit-card-last4-input').value).toBe('1234');
		expect(getByTestId('save-card-btn')).toBeTruthy();
		expect(getByTestId('delete-card-btn')).toBeTruthy();
	});

	it('shows validation error if fields are empty', async () => {
		const { getByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		await fireEvent.input(getByTestId('edit-card-name-input'), { target: { value: '' } });
		await fireEvent.input(getByTestId('edit-card-last4-input'), { target: { value: '' } });
		await fireEvent.click(getByTestId('save-card-btn'));
		expect(getByTestId('save-error').textContent).toContain('Please enter both card name and last 4 digits');
	});

	it('shows validation error if last4 is not 4 digits', async () => {
		const { getByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		await fireEvent.input(getByTestId('edit-card-last4-input'), { target: { value: '12' } });
		await fireEvent.click(getByTestId('save-card-btn'));
		expect(getByTestId('save-error').textContent).toContain('Last 4 digits must be exactly 4 numbers');
	});

	it('calls fetch to save card', async () => {
		const { getByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		await fireEvent.input(getByTestId('edit-card-name-input'), { target: { value: 'New Name' } });
		await fireEvent.input(getByTestId('edit-card-last4-input'), { target: { value: '5678' } });
		await fireEvent.click(getByTestId('save-card-btn'));
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith('/projects/ccbilling/cards/1', expect.objectContaining({ method: 'PUT' }));
		});
	});

	it('shows and cancels delete dialog', async () => {
		const { getByTestId, queryByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		await fireEvent.click(getByTestId('delete-card-btn'));
		expect(getByTestId('delete-dialog')).toBeTruthy();
		await fireEvent.click(getByTestId('cancel-delete-btn'));
		expect(queryByTestId('delete-dialog')).toBeNull();
	});

	it('calls fetch to delete card when confirmed', async () => {
		const { getByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		await fireEvent.click(getByTestId('delete-card-btn'));
		await fireEvent.click(getByTestId('confirm-delete-btn'));
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith('/projects/ccbilling/cards/1', expect.objectContaining({ method: 'DELETE' }));
		});
	});

	it('shows error if save fails', async () => {
		fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Save failed' }) });
		const { getByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		await fireEvent.input(getByTestId('edit-card-name-input'), { target: { value: 'New Name' } });
		await fireEvent.input(getByTestId('edit-card-last4-input'), { target: { value: '5678' } });
		await fireEvent.click(getByTestId('save-card-btn'));
		await waitFor(() => {
			expect(getByTestId('save-error').textContent).toContain('Save failed');
		});
	});

	it('shows error if delete fails', async () => {
		fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'Delete failed' }) });
		const { getByTestId } = render(CardDetailPage, { props: { data: { card: mockCard } } });
		await fireEvent.click(getByTestId('delete-card-btn'));
		await fireEvent.click(getByTestId('confirm-delete-btn'));
		await waitFor(() => {
			expect(getByTestId('delete-error').textContent).toContain('Delete failed');
		});
	});
});