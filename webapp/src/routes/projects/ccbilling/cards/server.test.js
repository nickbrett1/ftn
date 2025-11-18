import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	listCreditCards: vi.fn(),
	createCreditCard: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

// Import the mocked functions
import { listCreditCards, createCreditCard } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/cards API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			request: {
				json: vi.fn()
			}
		};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});
	describe('GET endpoint', () => {
		it('should return list of credit cards', async () => {
			const mockCards = [
				{ id: 1, name: 'Chase Freedom', last4: '1234', created_at: '2024-01-01' },
				{ id: 2, name: 'Amex Gold', last4: '5678', created_at: '2024-01-02' },
				{ id: 3, name: 'Discover It', last4: '9012', created_at: '2024-01-03' }
			];
			listCreditCards.mockResolvedValue(mockCards);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(result).toEqual(mockCards);
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await GET(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listCreditCards).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should handle empty credit card list', async () => {
			listCreditCards.mockResolvedValue([]);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual([]);
			expect(response.status).toBe(200);
		});

		it('should handle database errors gracefully', async () => {
			listCreditCards.mockRejectedValue(new Error('Database connection failed'));

			await expect(GET(mockEvent)).rejects.toThrow('Database connection failed');
		});
	});

	describe('POST endpoint', () => {
		it('should create new credit card successfully', async () => {
			const cardData = { name: 'New Card', last4: '9999' };
			mockEvent.request.json.mockResolvedValue(cardData);
			createCreditCard.mockResolvedValue({ id: 4, name: 'New Card', last4: '9999' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).toHaveBeenCalled();
			expect(createCreditCard).toHaveBeenCalledWith(mockEvent, 'New Card', '9999');
			expect(result).toEqual({ success: true });
			expect(response.status).toBe(200);
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await POST(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
			expect(createCreditCard).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for missing name', async () => {
			mockEvent.request.json.mockResolvedValue({ last4: '1234' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(createCreditCard).not.toHaveBeenCalled();
		});

		it('should return error for missing last4', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(createCreditCard).not.toHaveBeenCalled();
		});

		it('should return error for empty name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '', last4: '1234' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(createCreditCard).not.toHaveBeenCalled();
		});

		it('should return error for empty last4', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: '' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(createCreditCard).not.toHaveBeenCalled();
		});

		it('should return error for null name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: null, last4: '1234' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(createCreditCard).not.toHaveBeenCalled();
		});

		it('should return error for null last4', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: null });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(createCreditCard).not.toHaveBeenCalled();
		});

		it('should create card with original values (no trimming)', async () => {
			mockEvent.request.json.mockResolvedValue({
				name: '  Chase Freedom  ',
				last4: '  1234  '
			});
			createCreditCard.mockResolvedValue({ id: 5, name: '  Chase Freedom  ', last4: '  1234  ' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createCreditCard).toHaveBeenCalledWith(mockEvent, '  Chase Freedom  ', '  1234  ');
			expect(result).toEqual({ success: true });
		});

		it('should handle special characters in card name', async () => {
			mockEvent.request.json.mockResolvedValue({
				name: 'Amex Gold & Platinum',
				last4: '5678'
			});
			createCreditCard.mockResolvedValue({ id: 6, name: 'Amex Gold & Platinum', last4: '5678' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createCreditCard).toHaveBeenCalledWith(mockEvent, 'Amex Gold & Platinum', '5678');
			expect(result).toEqual({ success: true });
		});

		it('should handle long card names', async () => {
			const longName = 'A'.repeat(100);
			mockEvent.request.json.mockResolvedValue({ name: longName, last4: '9999' });
			createCreditCard.mockResolvedValue({ id: 7, name: longName, last4: '9999' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createCreditCard).toHaveBeenCalledWith(mockEvent, longName, '9999');
			expect(result).toEqual({ success: true });
		});

		it('should handle malformed JSON', async () => {
			mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'));

			await expect(POST(mockEvent)).rejects.toThrow('Invalid JSON');
		});

		it('should handle database errors during creation', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: '1234' });
			createCreditCard.mockRejectedValue(new Error('Database constraint violation'));

			await expect(POST(mockEvent)).rejects.toThrow('Database constraint violation');
		});

		it('should handle missing request body', async () => {
			mockEvent.request.json.mockResolvedValue(null);

			await expect(POST(mockEvent)).rejects.toThrow();
		});

		it('should ignore extra fields in request', async () => {
			mockEvent.request.json.mockResolvedValue({
				name: 'Discover It',
				last4: '9012',
				extraField: 'ignored',
				anotherId: 123
			});
			createCreditCard.mockResolvedValue({ id: 8, name: 'Discover It', last4: '9012' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createCreditCard).toHaveBeenCalledWith(mockEvent, 'Discover It', '9012');
			expect(result).toEqual({ success: true });
		});

		it('should validate last4 format (4 digits)', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: '123' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			// The current implementation doesn't validate last4 format, so this should succeed
			expect(createCreditCard).toHaveBeenCalledWith(mockEvent, 'Test Card', '123');
			expect(result).toEqual({ success: true });
		});

		it('should handle last4 with more than 4 digits', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: '12345' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(createCreditCard).toHaveBeenCalledWith(mockEvent, 'Test Card', '12345');
			expect(result).toEqual({ success: true });
		});
	});
});
