import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import AdminPage from './+page.svelte';

// Mock the fetch API
global.fetch = vi.fn();

describe('Admin Page', () => {
	it('renders admin panel title', () => {
		render(AdminPage);
		expect(screen.getByText('Admin Panel')).toBeInTheDocument();
	});

	it('renders back button', () => {
		render(AdminPage);
		expect(screen.getByText('Back to CCBilling')).toBeInTheDocument();
	});

	it('renders action buttons', () => {
		render(AdminPage);
		expect(screen.getByText('Run Single Batch')).toBeInTheDocument();
		expect(screen.getByText('Run Full Normalization')).toBeInTheDocument();
		expect(screen.getByText('Refresh Stats')).toBeInTheDocument();
	});

	it('renders statistics section when stats are available', async () => {
		// Mock successful API response
		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				payments: {
					total: 100,
					normalized: 80,
					pending: 20,
					uniqueMerchants: 50,
					uniqueNormalized: 45
				},
				budgetMerchants: {
					total: 30,
					normalized: 25
				},
				samples: [
					{
						merchant: 'AMAZON.COM',
						merchant_normalized: 'AMAZON',
						merchant_details: '',
						count: 15
					}
				],
				message: '20 payments need normalization'
			})
		});

		render(AdminPage);
		
		// Wait for stats to load
		await screen.findByText('Merchant Normalization Status');
		expect(screen.getByText('100')).toBeInTheDocument();
		expect(screen.getByText('80')).toBeInTheDocument();
		expect(screen.getByText('20')).toBeInTheDocument();
	});

	it('shows error when API call fails', async () => {
		// Mock failed API response
		global.fetch.mockRejectedValueOnce(new Error('Network error'));

		render(AdminPage);
		
		// Wait for error to appear
		await screen.findByText('Failed to load statistics: Network error');
	});
});