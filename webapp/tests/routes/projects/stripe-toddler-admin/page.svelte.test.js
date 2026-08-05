// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Page from '../../../../src/routes/projects/stripe-toddler-admin/+page.svelte';

vi.mock('$lib/components/Footer.svelte', () => ({ default: vi.fn() }));

describe('Stripe Toddler Admin Page Component', () => {
	it('renders page header and navigation tabs', () => {
		const { getByText } = render(Page, {
			data: { workerUrl: 'https://stripe-toddler.nick-brett1.workers.dev' }
		});

		expect(getByText('Stripe Toddler Admin')).toBeDefined();
		expect(getByText('Inventory')).toBeDefined();
		expect(getByText('Sales History')).toBeDefined();
		expect(getByText('Settings')).toBeDefined();
	});

	it('renders add new item form and print preview section by default', () => {
		const { getByText, getByPlaceholderText } = render(Page, {
			data: { workerUrl: 'https://stripe-toddler.nick-brett1.workers.dev' }
		});

		expect(getByText('Add New Inventory Item')).toBeDefined();
		expect(getByText('Print Preview (Avery 1" x 2-5/8" Labels)')).toBeDefined();
		expect(getByPlaceholderText('e.g. Red Fire Engine Truck')).toBeDefined();
	});
});
