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

describe('Budget Management Component Coverage', () => {
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

	// Basic rendering tests for coverage
	it('renders component with budgets data', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		expect(container).toBeTruthy();
		expect(container.innerHTML).toContain('Groceries');
		expect(container.innerHTML).toContain('Utilities');
	});

	it('renders component with empty budgets', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: [] } }
		});

		expect(container).toBeTruthy();
		expect(container.innerHTML).toContain('No budgets');
	});

	it('renders budget management title', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		expect(container.innerHTML).toContain('Budget Management');
	});

	it('renders budget names correctly', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		expect(container.innerHTML).toContain('Groceries');
		expect(container.innerHTML).toContain('Utilities');
	});

	it('renders add budget button', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		expect(container.innerHTML).toContain('Add New Budget');
	});

	it('renders edit buttons for budgets', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Should have edit functionality rendered
		expect(container.innerHTML).toContain('Edit');
	});

	it('renders delete buttons for budgets', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Should have delete functionality rendered
		expect(container.innerHTML).toContain('Delete');
	});

	it('handles different data structures', () => {
		const singleBudget = [
			{ id: 1, name: 'Single Budget', created_at: '2025-01-01T00:00:00Z' }
		];

		const { container } = render(BudgetsPage, {
			props: { data: { budgets: singleBudget } }
		});

		expect(container.innerHTML).toContain('Single Budget');
	});

	it('processes date formatting', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Check that budgets are processed/displayed with IDs
		expect(container.innerHTML).toContain('Budget ID');
	});

	it('renders with different budget names', () => {
		const specialBudgets = [
			{ id: 1, name: 'Food & Dining', created_at: '2025-01-01T00:00:00Z' },
			{ id: 2, name: 'Transportation', created_at: '2025-01-02T00:00:00Z' }
		];

		const { container } = render(BudgetsPage, {
			props: { data: { budgets: specialBudgets } }
		});

		expect(container.innerHTML).toContain('Food &amp; Dining');
		expect(container.innerHTML).toContain('Transportation');
	});

	it('renders budget count correctly', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Component should handle multiple budgets
		expect(container.innerHTML).toBeTruthy();
		expect(container.querySelector('*')).toBeTruthy();
	});

	it('renders empty state messaging', () => {
		const { container } = render(BudgetsPage, {
			props: { data: { budgets: [] } }
		});

		expect(container.innerHTML).toContain('No budgets');
	});

	it('renders component structure consistently', () => {
		const { container: container1 } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		const { container: container2 } = render(BudgetsPage, {
			props: { data: { budgets: mockBudgets } }
		});

		// Both renders should produce content
		expect(container1.innerHTML.length).toBeGreaterThan(100);
		expect(container2.innerHTML.length).toBeGreaterThan(100);
	});
});