import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	listCreditCards: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

// Import the mocked functions
import { listCreditCards } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/cards page server', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});

	describe('load function', () => {
		it('should return credit cards data', async () => {
			const mockCards = [
				{ id: 1, name: 'Chase Freedom', last4: '1234', created_at: '2024-01-01' },
				{ id: 2, name: 'Amex Gold', last4: '5678', created_at: '2024-01-02' },
				{ id: 3, name: 'Discover It', last4: '9012', created_at: '2024-01-03' }
			];
			listCreditCards.mockResolvedValue(mockCards);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: mockCards
			});
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			await expect(load(mockEvent)).rejects.toThrow();
		});

		it('should handle empty credit card list', async () => {
			listCreditCards.mockResolvedValue([]);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: []
			});
		});

		it('should handle database errors gracefully', async () => {
			listCreditCards.mockRejectedValue(new Error('Database connection failed'));

			await expect(load(mockEvent)).rejects.toThrow('Database connection failed');
		});

		it('should handle single credit card', async () => {
			const mockCards = [
				{ id: 1, name: 'Chase Freedom', last4: '1234', created_at: '2024-01-01' }
			];
			listCreditCards.mockResolvedValue(mockCards);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: mockCards
			});
		});

		it('should handle large number of credit cards', async () => {
			const mockCards = Array.from({ length: 100 }, (_, i) => ({
				id: i + 1,
				name: `Card ${i + 1}`,
				last4: String(1000 + i).slice(-4),
				created_at: '2024-01-01'
			}));
			listCreditCards.mockResolvedValue(mockCards);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: mockCards
			});
		});

		it('should handle credit cards with special characters in names', async () => {
			const mockCards = [
				{ id: 1, name: 'Chase Freedom & Unlimited', last4: '1234', created_at: '2024-01-01' },
				{ id: 2, name: 'Amex Gold & Platinum', last4: '5678', created_at: '2024-01-02' }
			];
			listCreditCards.mockResolvedValue(mockCards);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: mockCards
			});
		});

		it('should handle credit cards with long names', async () => {
			const longName = 'A'.repeat(200);
			const mockCards = [
				{ id: 1, name: longName, last4: '1234', created_at: '2024-01-01' }
			];
			listCreditCards.mockResolvedValue(mockCards);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: mockCards
			});
		});

		it('should handle credit cards with various last4 formats', async () => {
			const mockCards = [
				{ id: 1, name: 'Card 1', last4: '1234', created_at: '2024-01-01' },
				{ id: 2, name: 'Card 2', last4: '567', created_at: '2024-01-02' },
				{ id: 3, name: 'Card 3', last4: '89', created_at: '2024-01-03' },
				{ id: 4, name: 'Card 4', last4: '0', created_at: '2024-01-04' }
			];
			listCreditCards.mockResolvedValue(mockCards);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: mockCards
			});
		});

		it('should handle credit cards with missing optional fields', async () => {
			const mockCards = [
				{ id: 1, name: 'Card 1', last4: '1234' },
				{ id: 2, name: 'Card 2', last4: '5678', created_at: '2024-01-02' },
				{ id: 3, name: 'Card 3', last4: '9012', updated_at: '2024-01-03' }
			];
			listCreditCards.mockResolvedValue(mockCards);

			const result = await load(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual({
				creditCards: mockCards
			});
		});
	});
});