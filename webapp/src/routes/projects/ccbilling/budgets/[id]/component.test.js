import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import BudgetDetailPage from './+page.svelte';

// Mock fetch
global.fetch = vi.fn();

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

describe('Budget Detail Component Coverage', () => {
	const mockData = {
		budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
		merchants: [
			{ merchant: 'Walmart' },
			{ merchant: 'Target' }
		]
	};

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
	it('renders component with budget and merchant data', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container).toBeTruthy();
		expect(container.innerHTML).toContain('Groceries');
		expect(container.innerHTML).toContain('Walmart');
		expect(container.innerHTML).toContain('Target');
	});

	it('renders component with empty merchants', () => {
		const emptyData = {
			budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
			merchants: []
		};

		const { container } = render(BudgetDetailPage, {
			props: { data: emptyData }
		});

		expect(container).toBeTruthy();
		expect(container.innerHTML).toContain('Groceries');
		expect(container.innerHTML).toContain('No merchants');
	});

	it('renders budget name as title', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('Groceries');
	});

	it('renders merchant auto-assignment section', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('Auto-Assignment');
	});

	it('renders add merchant button', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('Add Merchant');
	});

	it('renders merchant list', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('Walmart');
		expect(container.innerHTML).toContain('Target');
	});

	it('renders remove buttons for merchants', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('Remove');
	});

	it('renders back to budgets link', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('Back');
	});

	it('handles different budget names', () => {
		const customData = {
			budget: { id: 2, name: 'Entertainment & Dining', created_at: '2025-01-01T00:00:00Z' },
			merchants: []
		};

		const { container } = render(BudgetDetailPage, {
			props: { data: customData }
		});

		expect(container.innerHTML).toContain('Entertainment &amp; Dining');
	});

	it('renders merchant count correctly', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		// Should show that there are 2 merchants
		expect(container.innerHTML).toContain('(2)');
	});

	it('renders empty merchant state', () => {
		const emptyData = {
			budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
			merchants: []
		};

		const { container } = render(BudgetDetailPage, {
			props: { data: emptyData }
		});

		expect(container.innerHTML).toContain('No merchants');
	});

	it('renders budget information section', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('Budget Information');
		expect(container.innerHTML).toContain('Budget Name');
		expect(container.innerHTML).toContain('Budget ID');
	});

	it('displays merchant explanatory text', () => {
		const { container } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		expect(container.innerHTML).toContain('auto-assigned');
	});

	it('renders component structure consistently', () => {
		const { container: container1 } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		const { container: container2 } = render(BudgetDetailPage, {
			props: { data: mockData }
		});

		// Both renders should produce substantial content
		expect(container1.innerHTML.length).toBeGreaterThan(200);
		expect(container2.innerHTML.length).toBeGreaterThan(200);
	});

	it('handles different merchant configurations', () => {
		const manyMerchants = {
			budget: { id: 1, name: 'Groceries', created_at: '2025-01-01T00:00:00Z' },
			merchants: [
				{ merchant: 'Walmart' },
				{ merchant: 'Target' },
				{ merchant: 'Costco' },
				{ merchant: 'Kroger' }
			]
		};

		const { container } = render(BudgetDetailPage, {
			props: { data: manyMerchants }
		});

		expect(container.innerHTML).toContain('Walmart');
		expect(container.innerHTML).toContain('Costco');
		expect(container.innerHTML).toContain('(4)');
	});
});