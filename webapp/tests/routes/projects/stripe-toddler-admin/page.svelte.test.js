// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import Page from '../../../../src/routes/projects/stripe-toddler-admin/+page.svelte';

vi.mock('$lib/components/Header.svelte', () => ({ default: vi.fn() }));
vi.mock('$lib/components/Footer.svelte', () => ({ default: vi.fn() }));

const WORKER_URL = 'https://stripe-toddler.nick-brett1.workers.dev';

describe('Stripe Toddler Admin Page Component', () => {
	it('renders page header and navigation tabs', () => {
		const { getByText } = render(Page, {
			data: { workerUrl: WORKER_URL }
		});

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

		const { getByText, getAllByText } = render(Page, {
			data: { workerUrl: WORKER_URL }
		});

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
		const { getByText, getByPlaceholderText } = render(Page, {
			data: { workerUrl: WORKER_URL }
		});

		expect(getByText('Add New Inventory Item')).toBeDefined();
		expect(getByText('Print Preview (Avery 1" x 2-5/8" Labels)')).toBeDefined();
		expect(getByPlaceholderText('e.g. Red Fire Engine Truck')).toBeDefined();
	});
});
