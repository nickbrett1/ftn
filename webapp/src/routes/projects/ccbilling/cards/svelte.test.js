import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
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

	beforeEach(() => {
		vi.clearAllMocks();
		fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});
		confirm.mockReturnValue(true);
	});

	afterEach(() => {
		cleanup();
	});

	describe('Basic Rendering', () => {
		it('renders and executes component with credit cards', () => {
			const { container, getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Verify basic rendering to ensure component executed
			expect(container).toBeTruthy();
			expect(container.innerHTML.length).toBeGreaterThan(100);
			// Check for card names and last4
			expect(container.innerHTML).toContain('Chase Freedom');
			expect(container.innerHTML).toContain('Amex Gold');
			expect(container.innerHTML).toContain('Discover It');
			// Check for Edit / Delete button for each card
			const editButtons = getAllByText('Edit / Delete');
			expect(editButtons.length).toBe(mockCreditCards.length);
		});

		it('renders empty state branch', () => {
			const { container } = render(CardsPage, {
				props: { data: { creditCards: [] } }
			});

			// This executes the empty state branch
			expect(container).toBeTruthy();
			expect(container.innerHTML).toContain('No credit cards added yet');
			expect(container.innerHTML).toContain('Add your first credit card');
		});
	});

	describe('Add Card Functionality', () => {
		it('shows add form when Add Credit Card button is clicked', async () => {
			const { container, getByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Verify form is shown
			expect(container.innerHTML).toContain('Add New Credit Card');
			expect(container.innerHTML).toContain('Card Name:');
			expect(container.innerHTML).toContain('Last 4 Digits:');
		});

		it('hides add form when Cancel is clicked', async () => {
			const { container, getByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form first
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);
			expect(container.innerHTML).toContain('Add New Credit Card');

			// Cancel form
			const cancelButton = getByText('Cancel');
			await fireEvent.click(cancelButton);

			// Verify form is hidden
			expect(container.innerHTML).not.toContain('Add New Credit Card');
		});

		it('validates card name is required', async () => {
			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Fill only last4, leave name empty
			const last4Input = getByLabelText('Last 4 Digits:');
			await fireEvent.input(last4Input, { target: { value: '1234' } });

			// Try to add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Verify error message
			expect(container.innerHTML).toContain('Please enter both card name and last 4 digits');
		});

		it('validates last4 is required', async () => {
			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Fill only name, leave last4 empty
			const nameInput = getByLabelText('Card Name:');
			await fireEvent.input(nameInput, { target: { value: 'Test Card' } });

			// Try to add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Verify error message
			expect(container.innerHTML).toContain('Please enter both card name and last 4 digits');
		});

		it('validates last4 must be exactly 4 digits', async () => {
			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Fill form with invalid last4
			const nameInput = getByLabelText('Card Name:');
			const last4Input = getByLabelText('Last 4 Digits:');
			await fireEvent.input(nameInput, { target: { value: 'Test Card' } });
			await fireEvent.input(last4Input, { target: { value: '123' } });

			// Try to add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Verify error message
			expect(container.innerHTML).toContain('Last 4 digits must be exactly 4 numbers');
		});

		it('validates last4 must be numeric', async () => {
			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Fill form with non-numeric last4
			const nameInput = getByLabelText('Card Name:');
			const last4Input = getByLabelText('Last 4 Digits:');
			await fireEvent.input(nameInput, { target: { value: 'Test Card' } });
			await fireEvent.input(last4Input, { target: { value: 'abcd' } });

			// Try to add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Verify error message
			expect(container.innerHTML).toContain('Last 4 digits must be exactly 4 numbers');
		});

		it('successfully adds a card with valid data', async () => {
			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Fill form with valid data
			const nameInput = getByLabelText('Card Name:');
			const last4Input = getByLabelText('Last 4 Digits:');
			await fireEvent.input(nameInput, { target: { value: 'New Card' } });
			await fireEvent.input(last4Input, { target: { value: '9999' } });

			// Add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Verify API call
			expect(fetch).toHaveBeenCalledWith('/projects/ccbilling/cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'New Card',
					last4: '9999'
				})
			});
		});

		it('handles API error when adding card', async () => {
			fetch.mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: 'Card already exists' })
			});

			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Fill form with valid data
			const nameInput = getByLabelText('Card Name:');
			const last4Input = getByLabelText('Last 4 Digits:');
			await fireEvent.input(nameInput, { target: { value: 'New Card' } });
			await fireEvent.input(last4Input, { target: { value: '9999' } });

			// Add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Wait for error to be displayed
			await waitFor(() => {
				expect(container.innerHTML).toContain('Card already exists');
			});
		});
	});

	describe('Error Handling', () => {
		it('handles network errors gracefully', async () => {
			fetch.mockRejectedValue(new Error('Network error'));

			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Wait for form to appear and fill form
			await waitFor(() => {
				expect(getByLabelText('Card Name:')).toBeTruthy();
			});

			const nameInput = getByLabelText('Card Name:');
			const last4Input = getByLabelText('Last 4 Digits:');
			await fireEvent.input(nameInput, { target: { value: 'New Card' } });
			await fireEvent.input(last4Input, { target: { value: '9999' } });

			// Try to add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Wait for error to be displayed
			await waitFor(() => {
				expect(container.innerHTML).toContain('Network error');
			});
		});

		it('handles malformed JSON responses', async () => {
			fetch.mockResolvedValue({
				ok: false,
				json: () => Promise.reject(new Error('Invalid JSON'))
			});

			const { container, getByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Show form
			const addButton = getByText('Add Credit Card');
			await fireEvent.click(addButton);

			// Wait for form to appear and fill form
			await waitFor(() => {
				expect(getByLabelText('Card Name:')).toBeTruthy();
			});

			const nameInput = getByLabelText('Card Name:');
			const last4Input = getByLabelText('Last 4 Digits:');
			await fireEvent.input(nameInput, { target: { value: 'New Card' } });
			await fireEvent.input(last4Input, { target: { value: '9999' } });

			// Try to add card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Wait for error to be displayed
			await waitFor(() => {
				expect(container.innerHTML).toContain('Invalid JSON');
			});
		});
	});
});