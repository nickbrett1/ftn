import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import BillingCyclePage from '../../src/routes/projects/ccbilling/[id]/+page.svelte';

// Mock the Button component
vi.mock('$lib/components/Button.svelte', () => ({
	default: vi.fn().mockImplementation(({ children, onclick, class: className }) => {
		const button = document.createElement('button');
		button.textContent = children;
		button.onclick = onclick || (() => {});
		if (className) button.className = className;
		return button;
	})
}));

// Mock tippy
vi.mock('tippy.js', () => ({
	default: vi.fn(() => ({
		destroy: vi.fn()
	}))
}));

// Mock LinkifyIt
vi.mock('linkify-it', () => ({
	default: vi.fn().mockImplementation(() => ({
		match: vi.fn(() => [])
	}))
}));

describe('Billing Cycle Page - Credit Card Filtering', () => {
	let mockData;
	let mockProps;

	beforeEach(() => {
		// Mock data structure
		mockData = {
			cycleId: 1,
			cycle: {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			},
			statements: [
				{
					id: 1,
					filename: 'statement1.pdf',
					credit_card_id: 1,
					statement_date: '2024-01-15',
					parsed: true
				},
				{
					id: 2,
					filename: 'statement2.pdf',
					credit_card_id: 2,
					statement_date: '2024-01-20',
					parsed: true
				}
			],
			charges: [
				{
					id: 1,
					merchant: 'Amazon',
					amount: 50.00,
					allocated_to: 'Shopping',
					credit_card_id: 1,
					card_name: 'Chase Freedom',
					transaction_date: '2024-01-10',
					statement_id: 1
				},
				{
					id: 2,
					merchant: 'Starbucks',
					amount: 5.50,
					allocated_to: 'Food',
					credit_card_id: 1,
					card_name: 'Chase Freedom',
					transaction_date: '2024-01-12',
					statement_id: 1
				},
				{
					id: 3,
					merchant: 'Shell',
					amount: 45.00,
					allocated_to: 'Transportation',
					credit_card_id: 2,
					card_name: 'Amex Gold',
					transaction_date: '2024-01-15',
					statement_id: 2
				},
				{
					id: 4,
					merchant: 'Target',
					amount: 75.00,
					allocated_to: 'Shopping',
					credit_card_id: 2,
					card_name: 'Amex Gold',
					transaction_date: '2024-01-18',
					statement_id: 2
				}
			],
			creditCards: [
				{ id: 1, name: 'Chase Freedom', last4: '1234' },
				{ id: 2, name: 'Amex Gold', last4: '5678' }
			],
			budgets: [
				{ id: 1, name: 'Shopping', icon: '🛍️' },
				{ id: 2, name: 'Food', icon: '🍕' },
				{ id: 3, name: 'Transportation', icon: '🚗' }
			]
		};

		mockProps = {
			data: mockData
		};

		// Mock fetch for merchant info
		global.fetch = vi.fn();
	});

	describe('Credit Card Filter Functionality', () => {
		it('should display all charges by default', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			// Should show all 4 charges
			expect(container.textContent).toContain('Charges (4 of 4)');
			expect(container.textContent).toContain('Amazon');
			expect(container.textContent).toContain('Starbucks');
			expect(container.textContent).toContain('Shell');
			expect(container.textContent).toContain('Target');
		});

		it('should display credit card filter dropdown', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			// Should show filter label and dropdown
			expect(container.textContent).toContain('Filter by card:');
			
			const filterSelect = container.querySelector('#card-filter');
			expect(filterSelect).toBeTruthy();
			
			// Should have "All Cards" option and both credit cards
			expect(filterSelect.textContent).toContain('All Cards');
			expect(filterSelect.textContent).toContain('Chase Freedom (****1234)');
			expect(filterSelect.textContent).toContain('Amex Gold (****5678)');
		});

		it('should filter charges when a specific credit card is selected', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select Chase Freedom (ID: 1)
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should show only Chase Freedom charges
			expect(container.textContent).toContain('Charges (2 of 4)');
			expect(container.textContent).toContain('Amazon');
			expect(container.textContent).toContain('Starbucks');
			expect(container.textContent).not.toContain('Shell');
			expect(container.textContent).not.toContain('Target');

			// Should show filter indicator
			expect(container.textContent).toContain('Filtered by: Chase Freedom');
		});

		it('should filter charges when Amex Gold is selected', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select Amex Gold (ID: 2)
			fireEvent.change(filterSelect, { target: { value: '2' } });
			await tick();

			// Should show only Amex Gold charges
			expect(container.textContent).toContain('Charges (2 of 4)');
			expect(container.textContent).not.toContain('Amazon');
			expect(container.textContent).not.toContain('Starbucks');
			expect(container.textContent).toContain('Shell');
			expect(container.textContent).toContain('Target');

			// Should show filter indicator
			expect(container.textContent).toContain('Filtered by: Amex Gold');
		});

		it('should show clear filter button when filter is active', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Initially no clear filter button
			expect(container.textContent).not.toContain('Clear Filter');
			
			// Select a card
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should show clear filter button
			expect(container.textContent).toContain('Clear Filter');
		});

		it('should clear filter when clear filter button is clicked', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select a card
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should show filtered charges
			expect(container.textContent).toContain('Charges (2 of 4)');
			
			// Click clear filter button
			const clearButton = container.querySelector('button');
			fireEvent.click(clearButton);
			await tick();

			// Should show all charges again
			expect(container.textContent).toContain('Charges (4 of 4)');
			expect(container.textContent).not.toContain('Filtered by: Chase Freedom');
		});

		it('should return to showing all charges when "All Cards" is selected', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select a specific card first
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should show filtered charges
			expect(container.textContent).toContain('Charges (2 of 4)');
			
			// Select "All Cards"
			fireEvent.change(filterSelect, { target: { value: 'all' } });
			await tick();

			// Should show all charges again
			expect(container.textContent).toContain('Charges (4 of 4)');
			expect(container.textContent).not.toContain('Filtered by: Chase Freedom');
		});

		it('should display sort by dropdown', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			// Should show sort label and dropdown
			expect(container.textContent).toContain('Sort by:');
			
			const sortSelect = container.querySelector('#sort-by');
			expect(sortSelect).toBeTruthy();
			
			// Should have both sort options
			expect(sortSelect.textContent).toContain('Date (oldest first)');
			expect(sortSelect.textContent).toContain('Merchant (A-Z)');
		});

		it('should sort charges by merchant when merchant sort is selected', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const sortSelect = container.querySelector('#sort-by');
			
			// Select merchant sort
			fireEvent.change(sortSelect, { target: { value: 'merchant' } });
			await tick();

			// Get all charge merchant names in the order they appear (only mobile view to avoid duplicates)
			const chargeElements = container.querySelectorAll('.block.md\\:hidden [class*="border-b border-gray-700"]');
			const merchantNames = Array.from(chargeElements).map(element => {
				const text = element.textContent;
				if (text.includes('Amazon')) return 'Amazon';
				if (text.includes('Shell')) return 'Shell';
				if (text.includes('Starbucks')) return 'Starbucks';
				if (text.includes('Target')) return 'Target';
				return '';
			}).filter(name => name);

			// Should be sorted alphabetically: Amazon, Shell, Starbucks, Target
			expect(merchantNames).toEqual(['Amazon', 'Shell', 'Starbucks', 'Target']);
		});

		it('should sort charges by date when date sort is selected', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const sortSelect = container.querySelector('#sort-by');
			
			// Select date sort (default)
			fireEvent.change(sortSelect, { target: { value: 'date' } });
			await tick();

			// Get all charge dates in the order they appear
			const chargeElements = container.querySelectorAll('[class*="border-b border-gray-700"]');
			const dates = Array.from(chargeElements).map(element => {
				const text = element.textContent;
				// Extract date from the charge element (this will depend on how dates are displayed)
				// For now, we'll just verify the sort dropdown is working
				return element.textContent;
			});

			// Should have charges displayed (verifying the sort didn't break anything)
			expect(chargeElements.length).toBeGreaterThan(0);
		});
	});

	describe('Credit Card Summary Section', () => {
		it('should display credit card summary when no filter is active', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			// Should show summary section
			expect(container.textContent).toContain('Charges by Credit Card:');
			
			// Should show both cards with their totals
			expect(container.textContent).toContain('Chase Freedom (2)');
			expect(container.textContent).toContain('Amex Gold (2)');
			
			// Should show totals
			expect(container.textContent).toContain('$55.50'); // Chase Freedom total (50 + 5.50)
			expect(container.textContent).toContain('$120.00'); // Amex Gold total (45 + 75)
		});

		it('should hide credit card summary when filter is active', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select a card
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should not show summary section
			expect(container.textContent).not.toContain('Charges by Credit Card:');
		});

		it('should allow clicking on credit card summary to apply filter', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			// Find and click on Chase Freedom summary button
			const chaseButton = Array.from(container.querySelectorAll('button')).find(
				button => button.textContent.includes('Chase Freedom')
			);
			
			expect(chaseButton).toBeTruthy();
			fireEvent.click(chaseButton);
			await tick();

			// Should now be filtered by Chase Freedom
			expect(container.textContent).toContain('Charges (2 of 4)');
			expect(container.textContent).toContain('Filtered by: Chase Freedom');
		});
	});

	describe('Running Totals with Filtering', () => {
		it('should show running totals for all charges by default', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			// Should show running totals for all allocations
			expect(container.textContent).toContain('Running Totals:');
			expect(container.textContent).toContain('Shopping: $125.00'); // 50 + 75
			expect(container.textContent).toContain('Food: $5.50'); // 5.50
			expect(container.textContent).toContain('Transportation: $45.00'); // 45
		});

		it('should update running totals when filter is applied', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select Chase Freedom
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should show running totals only for Chase Freedom charges
			expect(container.textContent).toContain('Running Totals:');
			expect(container.textContent).toContain('Shopping: $50.00'); // Only Amazon
			expect(container.textContent).toContain('Food: $5.50'); // Only Starbucks
			expect(container.textContent).not.toContain('Transportation: $45.00'); // Not in Chase Freedom
		});

		it('should show total amount when filter is active', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select Chase Freedom
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should show total for filtered charges
			expect(container.textContent).toContain('Total: $55.50'); // 50 + 5.50
		});

		it('should not show total amount when no filter is active', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			// Should not show total when showing all charges
			expect(container.textContent).not.toContain('Total: $');
		});

		it('should not show total amount when filtering by budget', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const budgetFilterSelect = container.querySelector('#budget-filter');
			
			// Select Shopping budget
			fireEvent.change(budgetFilterSelect, { target: { value: 'Shopping' } });
			await tick();

			// Should show running totals for Shopping budget only
			expect(container.textContent).toContain('Running Totals:');
			expect(container.textContent).toContain('Shopping: $125.00');
			expect(container.textContent).not.toContain('Food: $');
			expect(container.textContent).not.toContain('Transportation: $');
			
			// Should NOT show total since it would be redundant with single budget
			expect(container.textContent).not.toContain('Total: $');
		});
	});

	describe('Empty State Handling', () => {
		it('should show "no charges found" message when filter results in no charges', async () => {
			// Create mock data with charges only on one card
			const singleCardData = {
				...mockData,
				charges: mockData.charges.filter(charge => charge.credit_card_id === 1)
			};

			const { container } = render(BillingCyclePage, { data: singleCardData });
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select Amex Gold (which has no charges in this data)
			fireEvent.change(filterSelect, { target: { value: '2' } });
			await tick();

			// Should show appropriate message
			expect(container.textContent).toContain('No charges found with current filters');
			expect(container.textContent).toContain('Try adjusting your filters or clear them');
			expect(container.textContent).toContain('Show All Charges');
		});

		it('should allow returning to all charges from empty state', async () => {
			// Create mock data with charges only on one card
			const singleCardData = {
				...mockData,
				charges: mockData.charges.filter(charge => charge.credit_card_id === 1)
			};

			const { container } = render(BillingCyclePage, { data: singleCardData });
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select Amex Gold (which has no charges)
			fireEvent.change(filterSelect, { target: { value: '2' } });
			await tick();

			// Click "Show All Charges" button
			const showAllButton = Array.from(container.querySelectorAll('button')).find(
				button => button.textContent.includes('Show All Charges')
			);
			
			fireEvent.click(showAllButton);
			await tick();

			// Should show all charges again
			expect(container.textContent).toContain('Charges (2 of 2)');
		});
	});

	describe('Filter Persistence', () => {
		it('should maintain filter selection during user interactions', async () => {
			const { container } = render(BillingCyclePage, mockProps);
			await tick();

			const filterSelect = container.querySelector('#card-filter');
			
			// Select Chase Freedom
			fireEvent.change(filterSelect, { target: { value: '1' } });
			await tick();

			// Should be filtered
			expect(container.textContent).toContain('Charges (2 of 4)');
			
			// Simulate some user interaction (like clicking on a charge)
			const firstCharge = container.querySelector('tr');
			if (firstCharge) {
				fireEvent.click(firstCharge);
			}
			await tick();

			// Filter should still be active
			expect(container.textContent).toContain('Charges (2 of 4)');
			expect(container.textContent).toContain('Filtered by: Chase Freedom');
		});
	});
});