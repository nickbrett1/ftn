// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import Page from '../../../../src/routes/projects/stripe-toddler-admin/+page.svelte';

vi.mock('$lib/components/Header.svelte', () => ({ default: vi.fn() }));
vi.mock('$lib/components/Footer.svelte', () => ({ default: vi.fn() }));

const EMPTY_CELL_SELECTOR = '.avery-empty';
const START_PLACEHOLDER_SELECTOR = '.print-start-placeholder';

describe('Stripe Toddler Admin Page Component', () => {
	it('renders page header and navigation tabs', () => {
		const { getByText } = render(Page, { data: {} });

		expect(getByText('Stripe Toddler Admin')).toBeDefined();
		expect(getByText('Inventory')).toBeDefined();
		expect(getByText('Sales History')).toBeDefined();
	});

	it('loads sales history through the server proxy, not the worker URL directly', async () => {
		const transactions = [
			{
				transaction_id: '11111111-2222-3333-4444-555555555555',
				payment_intent_id: 'pi_123',
				amount_cents: 500,
				status: 'succeeded',
				created_at: 1700000000,
				items: [{ name: 'Red Fire Truck', quantity: 1, price_cents: 500 }]
			}
		];
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => transactions
		});
		vi.stubGlobal('fetch', fetchMock);

		const { getByText, getAllByText } = render(Page, { data: {} });

		await fireEvent.click(getByText('Sales History'));
		await fireEvent.click(getByText('Reload Data'));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				'/projects/stripe-toddler-admin/api/analytics?limit=100&offset=0'
			);
		});
		expect(
			fetchMock.mock.calls.some(([url]) =>
				String(url).includes('stripe-toddler.nick-brett1.workers.dev/api/admin/analytics')
			)
		).toBe(false);
		expect(getByText('pi_123')).toBeDefined();
		expect(getAllByText('$5.00').length).toBeGreaterThan(0);

		vi.unstubAllGlobals();
	});

	it('renders add new item form and print preview section by default', () => {
		const { getByText, getByPlaceholderText } = render(Page, { data: {} });

		expect(getByText('Add New Inventory Item')).toBeDefined();
		expect(getByText('Print Preview (Avery 1" x 2-5/8" Labels)')).toBeDefined();
		expect(getByPlaceholderText('e.g. Red Fire Engine Truck')).toBeDefined();
	});

	it('uploads images through the server proxy, not the worker URL directly', async () => {
		const fetchMock = vi.fn().mockImplementation(async (url) => {
			const path = String(url);
			if (path.includes('/api/inventory/upload')) {
				return {
					ok: true,
					json: async () => ({
						image_url:
							'https://stripe-toddler-images.example.r2.dev/images/TOY-RED-FIRE-ENGINE-TRUCK-001.jpg',
						barcode: 'TOY-RED-FIRE-ENGINE-TRUCK-001'
					})
				};
			}
			return { ok: true, json: async () => [] };
		});
		vi.stubGlobal('fetch', fetchMock);

		// jsdom does not implement URL.createObjectURL
		URL.createObjectURL = vi.fn(() => 'blob:preview');

		const { getByPlaceholderText, getByText, container } = render(Page, { data: {} });

		await fireEvent.input(getByPlaceholderText('e.g. Red Fire Engine Truck'), {
			target: { value: 'Red Fire Engine Truck' }
		});

		const fileInput = container.querySelector('#image-file');
		const file = new File(['fake-image-bytes'], 'toy.jpg', { type: 'image/jpeg' });
		await fireEvent.change(fileInput, { target: { files: [file] } });

		await fireEvent.click(getByText('Save & Generate Item'));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				'/projects/stripe-toddler-admin/api/inventory/upload',
				expect.objectContaining({ method: 'POST' })
			);
		});
		expect(
			fetchMock.mock.calls.some(([url]) =>
				String(url).includes('stripe-toddler.nick-brett1.workers.dev/api/admin/inventory/upload')
			)
		).toBe(false);
		// The inventory save should also go through the local proxy.
		expect(
			fetchMock.mock.calls.some(
				([url]) => String(url) === '/projects/stripe-toddler-admin/api/inventory'
			)
		).toBe(true);

		vi.unstubAllGlobals();
	});

	it('starts the print sheet at sticker 1 by default (no offset)', () => {
		const { container } = render(Page, {
			data: {
				initialInventory: [
					{
						barcode: 'TOY-001',
						name: 'Green Dinosaur',
						price_cents: 500,
						image_url: '',
						created_at: 1
					},
					{
						barcode: 'TOY-002',
						name: 'Purple Unicorn',
						price_cents: 300,
						image_url: '',
						created_at: 2
					}
				]
			}
		});

		expect(container.querySelectorAll(EMPTY_CELL_SELECTOR)).toHaveLength(0);
		expect(container.querySelectorAll(START_PLACEHOLDER_SELECTOR)).toHaveLength(0);
	});

	it('offsets labels to start at a chosen sticker position to reuse partial sheets', async () => {
		const { getByText, getAllByText, container } = render(Page, {
			data: {
				initialInventory: [
					{
						barcode: 'TOY-001',
						name: 'Blue Rocket',
						price_cents: 500,
						image_url: '',
						created_at: 1
					}
				]
			}
		});

		const input = container.querySelector('#print-start-position');
		await fireEvent.input(input, { target: { value: '4' } });

		// Print sheet skips stickers 1-3 before the first real label
		expect(container.querySelectorAll(EMPTY_CELL_SELECTOR)).toHaveLength(3);
		// On-screen preview mirrors the offset with dashed "used" cells
		expect(container.querySelectorAll(START_PLACEHOLDER_SELECTOR)).toHaveLength(3);
		expect(getByText('Sticker 1')).toBeDefined();
		expect(getByText('Sticker 3')).toBeDefined();
		// The item is still rendered (appears in preview + catalog + print sheet)
		expect(getAllByText('Blue Rocket').length).toBeGreaterThan(0);
	});

	it('clamps the start sticker position to the 1-30 sheet range', async () => {
		const { container } = render(Page, { data: {} });

		const input = container.querySelector('#print-start-position');

		await fireEvent.input(input, { target: { value: '35' } });
		expect(container.querySelectorAll(EMPTY_CELL_SELECTOR)).toHaveLength(29);

		await fireEvent.input(input, { target: { value: '0' } });
		expect(container.querySelectorAll(EMPTY_CELL_SELECTOR)).toHaveLength(0);
	});
});
