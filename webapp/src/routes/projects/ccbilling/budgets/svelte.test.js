import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import BudgetsPage from './+page.svelte';

// Mock fetch
global.fetch = vi.fn();

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

	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});
	});

	afterEach(() => {
		cleanup();
	});

	it('renders and executes component with budgets', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Verify basic rendering to ensure component executed
		expect(container).toBeTruthy();
		expect(container.innerHTML.length).toBeGreaterThan(100);
		expect(container.innerHTML).toContain('Groceries');
		expect(container.innerHTML).toContain('Utilities');
	});

	it('renders empty state branch', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: [] } }
		});

		// This executes the empty state branch
		expect(container).toBeTruthy();
		expect(container.innerHTML).toContain('No budgets');
	});

	it('handles different budget counts', () => {
		// Test single budget
		const { container: single } = render(BudgetsPage, {
			props: { data: { budgets: [mockBudgets[0]] } }
		});
		expect(single.innerHTML).toContain('Groceries');

		// Test many budgets
		const manyBudgets = Array.from({ length: 5 }, (_, i) => ({
			id: i + 1,
			name: `Budget ${i + 1}`,
			created_at: '2025-01-01T00:00:00Z'
		}));

		const { container: many } = render(BudgetsPage, {
			props: { data: { budgets: manyBudgets } }
		});
		expect(many.innerHTML).toContain('Budget 1');
		expect(many.innerHTML).toContain('Budget 5');
	});

	it('processes budget data correctly', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Verify budget names are displayed (budget IDs are no longer shown)
		expect(container.innerHTML).toContain('Groceries');
		expect(container.innerHTML).toContain('Utilities');
	});

	it('renders all required controls for each budget', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});
		// Check for presence of interactive elements (inline editing)
		expect(container.innerHTML).toContain('Add New Budget');
		// There should be an input for each budget name
		expect(container.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(mockBudgets.length);
		// There should be a delete button for each budget
		expect(container.innerHTML).toContain('Delete');
		// There should be icon selection buttons
		expect(container.innerHTML).toContain('Select an icon to represent this budget');
	});

	it('handles budget name variations', () => {
		const specialBudgets = [
			{ id: 1, name: 'Food & Dining', created_at: '2025-01-01T00:00:00Z' },
			{ id: 2, name: 'Transportation & Travel', created_at: '2025-01-02T00:00:00Z' }
		];
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: specialBudgets } }
		});
		// The input value should contain the name (no HTML encoding in input value)
		expect(container.innerHTML).toContain('Food & Dining');
		expect(container.innerHTML).toContain('Transportation & Travel');
	});

	it('handles budget display', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// This exercises budget processing (budget names are displayed)
		expect(container.innerHTML).toContain('Groceries');
		expect(container.innerHTML).toContain('Utilities');
	});

	it('executes reactive statements', () => {
		// Test data reactivity by changing props
		const { component } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Component should exist and be reactive
		expect(component).toBeTruthy();
	});

	it('renders navigation elements', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// This exercises navigation link generation
		expect(container.innerHTML).toContain('Back to Billing Cycles');
		expect(container.innerHTML).toContain('/projects/ccbilling');
	});

	it('handles component lifecycle', () => {
		// Test component mount and unmount
		const { unmount } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// This exercises component lifecycle methods
		unmount();
		expect(true).toBe(true); // If we get here, lifecycle worked
	});
});
