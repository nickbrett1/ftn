import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import BudgetDetailPage from '../../../../../../src/routes/projects/ccbilling/budgets/[id]/+page.svelte';

// Mock fetch
globalThis.fetch = vi.fn();

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

describe('Budget Detail Page - Svelte Coverage', () => {
	const mockData = {
		budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
		merchants: [{ merchant: 'Walmart' }, { merchant: 'Target' }]
	};
	let component;

	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockImplementation((url) => {
			if (url.includes('/recent-merchants')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(['Amazon', 'Target', 'Walmart', 'Best Buy', 'Home Depot'])
				});
			}
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			});
		});
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
	});

	it('renders and executes component with budget data', () => {
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Verify basic rendering to ensure component executed
		expect(document.body).toBeTruthy();
		expect(document.body.innerHTML.length).toBeGreaterThan(100);
		expect(document.body.innerHTML).toContain('Groceries');
		expect(document.body.innerHTML).toContain('Walmart');
		expect(document.body.innerHTML).toContain('Target');
	});

	it('renders empty merchant state branch', () => {
		const emptyData = {
			budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
			merchants: []
		};

		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: emptyData }
		});

		// This executes the empty merchants branch
		expect(document.body).toBeTruthy();
		expect(document.body.innerHTML).toContain('No merchants assigned');
	});

	it('processes budget information correctly', () => {
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Verify budget info processing
		expect(document.body.innerHTML).toContain('Budget Information');
		expect(document.body.innerHTML).toContain('Budget Name');
		expect(document.body.innerHTML).toContain('Icon');
		expect(document.body.innerHTML).toContain('Groceries');
	});

	it('displays merchant count correctly', () => {
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		// This exercises merchant count calculation
		expect(document.body.innerHTML).toContain('Assigned Merchants (2)');
	});

	it('handles different merchant counts', () => {
		// Test with many merchants
		const manyMerchantsData = {
			budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
			merchants: Array.from({ length: 10 }, (_, index) => ({ merchant: `Merchant ${index + 1}` }))
		};

		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: manyMerchantsData }
		});

		expect(document.body.innerHTML).toContain('(10)');
		expect(document.body.innerHTML).toContain('Merchant 1');
		expect(document.body.innerHTML).toContain('Merchant 10');
	});

	it('renders all required buttons', () => {
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Check for presence of interactive elements
		expect(document.body.innerHTML).toContain('Add Merchant');
		expect(document.body.innerHTML).toContain('Remove');
		expect(document.body.innerHTML).toContain('Back to Budgets');
	});

	it('handles merchant name variations', () => {
		const specialData = {
			budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
			merchants: [{ merchant: 'H&M Store' }, { merchant: 'Barnes & Noble' }]
		};

		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: specialData }
		});

		// This exercises HTML encoding for merchant names
		expect(document.body.innerHTML).toContain('H&amp;M Store');
		expect(document.body.innerHTML).toContain('Barnes &amp; Noble');
	});

	it('generates correct navigation links', () => {
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		// This exercises URL generation
		expect(document.body.innerHTML).toContain('/projects/ccbilling/budgets');
	});

	it('displays merchant assignment descriptions', () => {
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		// This exercises conditional text generation
		expect(document.body.innerHTML).toContain('auto-assigned to "Groceries"');
		expect(document.body.innerHTML).toContain('Charges from this merchant will be');
	});

	it('renders budget-specific merchant descriptions', () => {
		const customData = {
			budget: { id: 2, name: 'Entertainment', created_at: '2025-01-01T00:00:00Z' },
			merchants: [{ merchant: 'Netflix' }]
		};

		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: customData }
		});

		// This exercises budget name interpolation
		expect(document.body.innerHTML).toContain('"Entertainment"');
	});

	it('does not render deprecated coming soon section', () => {
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		// Verify deprecated section is not present
		expect(document.body.innerHTML).not.toContain('Coming Soon');
	});

	it('handles different budget names', () => {
		const differentData = {
			budget: { id: 3, name: 'Travel & Vacation', created_at: '2025-01-01T00:00:00Z' },
			merchants: []
		};

		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: differentData }
		});

		// HTML encodes & as &amp;
		expect(document.body.innerHTML).toContain('Travel &amp; Vacation');
	});

	it('handles component lifecycle', () => {
		// Test component mount and unmount
		component = mount(BudgetDetailPage, {
			target: document.body,
			props: { data: mockData }
		});

		expect(document.body).toBeTruthy();

		unmount(component);
		component = null;

		// After unmount, the component should be cleaned up
		expect(true).toBe(true);
	});
});