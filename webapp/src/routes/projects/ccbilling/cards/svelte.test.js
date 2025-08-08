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
			const { container } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Verify basic rendering to ensure component executed
			expect(container).toBeTruthy();
			expect(container.innerHTML.length).toBeGreaterThan(100);
			const cardInputs = container.querySelectorAll('input[type="text"]');
			expect(Array.from(cardInputs).some(input => input.value === 'Chase Freedom')).toBe(true);
			expect(Array.from(cardInputs).some(input => input.value === 'Amex Gold')).toBe(true);
			expect(Array.from(cardInputs).some(input => input.value === 'Discover It')).toBe(true);
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

		it('handles different credit card counts', () => {
			// Test single card
			const { container: single } = render(CardsPage, {
				props: { data: { creditCards: [mockCreditCards[0]] } }
			});
			const singleInputs = single.querySelectorAll('input[type="text"]');
			expect(Array.from(singleInputs).some(input => input.value === 'Chase Freedom')).toBe(true);

			// Test many cards
			const manyCards = Array.from({ length: 5 }, (_, i) => ({
				id: i + 1,
				name: `Card ${i + 1}`,
				last4: String(1000 + i).slice(-4),
				created_at: '2024-01-01T00:00:00Z'
			}));

			const { container: many } = render(CardsPage, {
				props: { data: { creditCards: manyCards } }
			});
			const manyInputs = many.querySelectorAll('input[type="text"]');
			expect(Array.from(manyInputs).some(input => input.value === 'Card 1')).toBe(true);
			expect(Array.from(manyInputs).some(input => input.value === 'Card 5')).toBe(true);
		});

		it('displays credit card information correctly', () => {
			const { container } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Verify card information is displayed
			const infoInputs = container.querySelectorAll('input[type="text"]');
			expect(Array.from(infoInputs).some(input => input.value === 'Chase Freedom')).toBe(true);
			expect(Array.from(infoInputs).some(input => input.value === 'Amex Gold')).toBe(true);
		});

		it('renders all required controls for each card', () => {
			const { container } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});
			// Check for presence of interactive elements (inline editing)
			expect(container.innerHTML).toContain('Add Credit Card');
			// There should be an input for each card name and last4
			expect(container.querySelectorAll('input[type="text"]').length).toBeGreaterThanOrEqual(mockCreditCards.length * 2);
			// There should be a delete button for each card
			expect(container.innerHTML).toContain('Delete');
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

	describe('Edit Card Functionality', () => {
		it('shows edit form when Edit button is clicked', async () => {
			const { container, getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			const editButtons = getAllByText('Edit');
			await fireEvent.click(editButtons[0]);

			// Verify edit form is shown
			expect(container.innerHTML).toContain('Edit Credit Card');
			// The card name and last4 are in the input values, not visible text
			expect(container.innerHTML).toContain('edit-card-name');
			expect(container.innerHTML).toContain('edit-card-last4');
		});

		it('cancels edit when Cancel button is clicked', async () => {
			const { container, getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Start edit
			const editButtons = getAllByText('Edit');
			await fireEvent.click(editButtons[0]);
			expect(container.innerHTML).toContain('Edit Credit Card');

			// Cancel edit
			const cancelButton = getAllByText('Cancel')[0];
			await fireEvent.click(cancelButton);

			// Verify edit form is hidden
			expect(container.innerHTML).not.toContain('Edit Credit Card');
		});

		it('validates edit form fields', async () => {
			const { container, getAllByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Start edit
			const editButtons = getAllByText('Edit');
			await fireEvent.click(editButtons[0]);

			// Clear the name field
			const nameInput = getByLabelText('Card Name:');
			await fireEvent.input(nameInput, { target: { value: '' } });

			// Try to save
			const saveButton = getAllByText('Save')[0];
			await fireEvent.click(saveButton);

			// Verify error message
			expect(container.innerHTML).toContain('Please enter both card name and last 4 digits');
		});

		it('successfully updates a card with valid data', async () => {
			const { container, getAllByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Start edit
			const editButtons = getAllByText('Edit');
			await fireEvent.click(editButtons[0]);

			// Update the card name
			const nameInput = getByLabelText('Card Name:');
			await fireEvent.input(nameInput, { target: { value: 'Updated Card Name' } });

			// Save changes
			const saveButton = getAllByText('Save')[0];
			await fireEvent.click(saveButton);

			// Verify API call
			expect(fetch).toHaveBeenCalledWith('/projects/ccbilling/cards/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Updated Card Name',
					last4: '1234'
				})
			});
		});

		it('handles API error when updating card', async () => {
			fetch.mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: 'Card not found' })
			});

			const { container, getAllByText, getByLabelText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Start edit
			const editButtons = getAllByText('Edit');
			await fireEvent.click(editButtons[0]);

			// Update the card name
			const nameInput = getByLabelText('Card Name:');
			await fireEvent.input(nameInput, { target: { value: 'Updated Card Name' } });

			// Save changes
			const saveButton = getAllByText('Save')[0];
			await fireEvent.click(saveButton);

			// Wait for error to be displayed
			await waitFor(() => {
				expect(container.innerHTML).toContain('Card not found');
			});
		});
	});

	describe('Delete Card Functionality', () => {
		it('shows confirmation dialog when Delete button is clicked', async () => {
			const { getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			const deleteButtons = getAllByText('Delete');
			await fireEvent.click(deleteButtons[0]);

			// Verify confirmation dialog was called
			expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete "Chase Freedom" (****1234)?');
		});

		it('does not delete when confirmation is cancelled', async () => {
			confirm.mockReturnValue(false);

			const { getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			const deleteButtons = getAllByText('Delete');
			await fireEvent.click(deleteButtons[0]);

			// Verify no API call was made
			expect(fetch).not.toHaveBeenCalled();
		});

		it('successfully deletes a card when confirmed', async () => {
			const { getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			const deleteButtons = getAllByText('Delete');
			await fireEvent.click(deleteButtons[0]);

			// Verify API call
			expect(fetch).toHaveBeenCalledWith('/projects/ccbilling/cards/1', {
				method: 'DELETE'
			});
		});

		it('handles API error when deleting card', async () => {
			fetch.mockResolvedValue({
				ok: false,
				json: () => Promise.resolve({ error: 'Cannot delete card' })
			});

			const { getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			const deleteButtons = getAllByText('Delete');
			await fireEvent.click(deleteButtons[0]);

			// Verify API call was made
			expect(fetch).toHaveBeenCalledWith('/projects/ccbilling/cards/1', {
				method: 'DELETE'
			});
		});
	});

	describe('Loading States', () => {
		it('shows loading state when adding card', async () => {
			// Mock a slow response
			fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			}), 100)));

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

			// Start adding card
			const addCardButton = getByText('Add Card');
			await fireEvent.click(addCardButton);

			// Verify loading state
			expect(container.innerHTML).toContain('Adding...');
		});

		it('shows loading state when editing card', async () => {
			// Mock a slow response
			fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			}), 100)));

			const { container, getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Start edit
			const editButtons = getAllByText('Edit');
			await fireEvent.click(editButtons[0]);

			// Wait for edit form to appear
			await waitFor(() => {
				expect(getAllByText('Save')[0]).toBeTruthy();
			});

			// Start saving
			const saveButton = getAllByText('Save')[0];
			await fireEvent.click(saveButton);

			// Verify loading state
			expect(container.innerHTML).toContain('Saving...');
		});

		it('shows loading state when deleting card', async () => {
			// Mock a slow response
			fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
				ok: true,
				json: () => Promise.resolve({ success: true })
			}), 100)));

			const { container, getAllByText } = render(CardsPage, {
				props: { data: { creditCards: mockCreditCards } }
			});

			// Start delete
			const deleteButtons = getAllByText('Delete');
			await fireEvent.click(deleteButtons[0]);

			// Verify loading state
			expect(container.innerHTML).toContain('Deleting...');
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

	describe('Data Processing', () => {
		it('handles credit cards with different date formats', () => {
			const cardsWithDifferentDates = [
				{ id: 1, name: 'Card 1', last4: '1234', created_at: '2024-01-01' },
				{ id: 2, name: 'Card 2', last4: '5678', created_at: '2024-01-02T00:00:00Z' },
				{ id: 3, name: 'Card 3', last4: '9012', created_at: '2024-01-03T12:30:45.123Z' }
			];

			const { container } = render(CardsPage, {
				props: { data: { creditCards: cardsWithDifferentDates } }
			});

			// Verify all cards are displayed
			expect(container.innerHTML).toContain('Card 1');
			expect(container.innerHTML).toContain('Card 2');
			expect(container.innerHTML).toContain('Card 3');
		});

		it('handles credit cards with special characters in names', () => {
			const cardsWithSpecialChars = [
				{ id: 1, name: 'Chase Freedom®', last4: '1234', created_at: '2024-01-01' },
				{ id: 2, name: 'Amex Gold Card™', last4: '5678', created_at: '2024-01-02' },
				{ id: 3, name: 'Discover It® Cash Back', last4: '9012', created_at: '2024-01-03' }
			];

			const { container } = render(CardsPage, {
				props: { data: { creditCards: cardsWithSpecialChars } }
			});

			// Verify special characters are handled
			expect(container.innerHTML).toContain('Chase Freedom®');
			expect(container.innerHTML).toContain('Amex Gold Card™');
			expect(container.innerHTML).toContain('Discover It® Cash Back');
		});
	});
});