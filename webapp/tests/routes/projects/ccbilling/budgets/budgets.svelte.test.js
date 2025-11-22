import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import BudgetsPage from '../../../../../src/routes/projects/ccbilling/budgets/+page.svelte';

// Mock fetch
globalThis.fetch = vi.fn();

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

describe('Budget Management Page - Svelte Coverage', () => {
	const mockBudgets = [
		{ id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
		{ id: 2, name: 'Utilities', created_at: '2025-01-02T00:00:00Z' }
	];
	let component;

	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
	});

	it('renders and executes component with budgets', () => {
		component = mount(BudgetsPage, {
			target: document.body,
			props: { data: { budgets: mockBudgets } }
		});

		// Verify basic rendering to ensure component executed
		expect(document.body).toBeTruthy();
		expect(document.body.innerHTML.length).toBeGreaterThan(100);
		expect(document.body.innerHTML).toContain('Groceries');
		expect(document.body.innerHTML).toContain('Utilities');
	});

	it('renders empty state branch', () => {
		component = mount(BudgetsPage, {
			target: document.body,
			props: { data: { budgets: [] } }
		});

		// This executes the empty state branch
		expect(document.body).toBeTruthy();
		expect(document.body.innerHTML).toContain('No budgets');
	});

	it('handles different budget counts', () => {
		// Test single budget
		component = mount(BudgetsPage, {
			target: document.body,
			props: { data: { budgets: [mockBudgets[0]] } }
		});
		expect(document.body.innerHTML).toContain('Groceries');
		unmount(component);

		// Test many budgets
		const manyBudgets = Array.from({ length: 5 }, (_, index) => ({
			id: index + 1,
			name: `Budget ${index + 1}`,
			created_at: '2025-01-01T00:00:00Z'
		}));

		component = mount(BudgetsPage, {
			target: document.body,
			props: { data: { budgets: manyBudgets } }
		});
		const budgetLinks = document.querySelectorAll('a');
		expect([...budgetLinks].some((link) => link.textContent.includes('Budget 1'))).toBe(true);
		expect([...budgetLinks].some((link) => link.textContent.includes('Budget 5'))).toBe(true);
	});

	it('processes budget data correctly', () => {
		component = mount(BudgetsPage, {
			target: document.body,
			props: { data: { budgets: mockBudgets } }
		});

		// Verify budget names are displayed (budget IDs are no longer shown)
		expect(document.body.innerHTML).toContain('Groceries');
		expect(document.body.innerHTML).toContain('Utilities');
	});

	it('renders all required controls for each budget', () => {
		component = mount(BudgetsPage, {
			target: document.body,
			props: { data: { budgets: mockBudgets } }
		});
		// Check for presence of interactive elements (click-to-edit)
		expect(document.body.innerHTML).toContain('Add New Budget');
		// There should be a clickable card (anchor) for each budget
		expect(document.querySelectorAll('a').length).toBeGreaterThanOrEqual(mockBudgets.length);
	});

	it('handles budget name variations', () => {
		const specialBudgets = [
			{ id: 1, name: 'Food & Dining', created_at: '2025-01-01T00:00:00Z' },
			{ id: 2, name: 'Transportation & Travel', created_at: '2025-01-02T00:00:00Z' }
		];

		component = mount(BudgetsPage, {
			target: document.body,
			props: { data: { budgets: specialBudgets } }
		});

		// HTML encodes & as &amp;
		expect(document.body.innerHTML).toContain('Food &amp; Dining');
		expect(document.body.innerHTML).toContain('Transportation &amp; Travel');
	});
});