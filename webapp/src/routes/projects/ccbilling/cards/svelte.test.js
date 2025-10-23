import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import CardsPage from './+page.svelte';

// Mock fetch
global.fetch = vi.fn();

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

// Mock location.reload
Object.defineProperty(window, 'location', {
	value: { reload: vi.fn() },
	writable: true
});

// Mock confirm
global.confirm = vi.fn();

// Mock alert
global.alert = vi.fn();

describe('Credit Cards Page - Svelte Coverage', () => {
	const mockCreditCards = [
		{ id: 1, name: 'Chase Freedom', last4: '1234', created_at: '2024-01-01T00:00:00Z' },
		{ id: 2, name: 'Amex Gold', last4: '5678', created_at: '2024-01-02T00:00:00Z' },
		{ id: 3, name: 'Discover It', last4: '9012', created_at: '2024-01-03T00:00:00Z' }
	];
	let component;

	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});
		confirm.mockReturnValue(true);
	});

	afterEach(() => {
		if (component) {
			unmount(component);
			component = null;
		}
	});

	describe('Basic Rendering', () => {
		it('renders and executes component with credit cards', () => {
			component = mount(CardsPage, {
				target: document.body,
				props: { data: { creditCards: mockCreditCards } }
			});

			// Verify basic rendering to ensure component executed
			expect(document.body).toBeTruthy();
			expect(document.body.innerHTML.length).toBeGreaterThan(100);
			// Check for card names and last4
			expect(document.body.innerHTML).toContain('Chase Freedom');
			expect(document.body.innerHTML).toContain('Amex Gold');
			expect(document.body.innerHTML).toContain('Discover It');
			// Check that there are as many card rows as cards
			const cardRows = document.querySelectorAll('.bg-gray-800.border-gray-700.rounded-lg.p-6');
			expect(cardRows.length).toBe(mockCreditCards.length);
		});

		it('renders empty state branch', () => {
			component = mount(CardsPage, {
				target: document.body,
				props: { data: { creditCards: [] } }
			});

			// This executes the empty state branch
			expect(document.body).toBeTruthy();
			expect(document.body.innerHTML).toContain('No credit cards added yet');
			expect(document.body.innerHTML).toContain('Add your first credit card');
		});
	});

	describe('Add Card Functionality', () => {
		it('shows add form when Add Credit Card button is clicked', async () => {
			component = mount(CardsPage, {
				target: document.body,
				props: { data: { creditCards: mockCreditCards } }
			});

			const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
				btn.textContent.includes('Add Credit Card')
			);
			addButton.click();
			flushSync();

			// Verify form is shown
			expect(document.body.innerHTML).toContain('Add New Credit Card');
			expect(document.body.innerHTML).toContain('Card Name:');
			expect(document.body.innerHTML).toContain('Last 4 Digits:');
		});

		it('hides add form when Cancel is clicked', async () => {
			component = mount(CardsPage, {
				target: document.body,
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form first
			const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
				btn.textContent.includes('Add Credit Card')
			);
			addButton.click();
			flushSync();
			expect(document.body.innerHTML).toContain('Add New Credit Card');

			// Click cancel
			const cancelButton = Array.from(document.querySelectorAll('button')).find(btn => 
				btn.textContent === 'Cancel'
			);
			cancelButton.click();
			flushSync();

			// Form should be hidden
			expect(document.body.innerHTML).not.toContain('Add New Credit Card');
		});

		it('validates form submission with empty fields', async () => {
			component = mount(CardsPage, {
				target: document.body,
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
				btn.textContent.includes('Add Credit Card')
			);
			addButton.click();
			flushSync();

			// Try to submit without filling fields
			const submitButton = Array.from(document.querySelectorAll('button')).find(btn => 
				btn.textContent === 'Add Card'
			);
			submitButton.click();
			flushSync();

			// Form should still be visible (not submitted)
			expect(document.body.innerHTML).toContain('Add New Credit Card');
		});

		it('submits form with valid data', async () => {
			component = mount(CardsPage, {
				target: document.body,
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
				btn.textContent.includes('Add Credit Card')
			);
			addButton.click();
			flushSync();

			// Fill in form fields
			const nameInput = document.querySelector('input[placeholder="e.g., Chase Sapphire"]');
			const last4Input = document.querySelector('input[placeholder="1234"]');
			
			if (nameInput && last4Input) {
				nameInput.value = 'Test Card';
				nameInput.dispatchEvent(new Event('input', { bubbles: true }));
				
				last4Input.value = '4321';
				last4Input.dispatchEvent(new Event('input', { bubbles: true }));
				
				flushSync();

				// Submit form
				const submitButton = Array.from(document.querySelectorAll('button')).find(btn => 
					btn.textContent === 'Add Card'
				);
				submitButton.click();
				flushSync();

				// Wait for API call
				await vi.waitFor(() => {
					expect(fetch).toHaveBeenCalled();
				}, { timeout: 1000 });
			}
		});
	});

	describe('Delete Functionality', () => {
		it('triggers delete confirmation', async () => {
			component = mount(CardsPage, {
				target: document.body,
				props: { data: { creditCards: mockCreditCards } }
			});

			// Find a delete button
			const deleteButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
				btn.textContent.includes('Delete')
			);
			
			if (deleteButtons.length > 0) {
				deleteButtons[0].click();
				flushSync();

				// Confirm should have been called
				expect(confirm).toHaveBeenCalled();
			}
		});
	});
});
