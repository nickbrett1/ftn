import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../../../../../../src/routes/projects/ccbilling/cards/[id]/+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getCreditCard: vi.fn(),
	updateCreditCard: vi.fn(),
	deleteCreditCard: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

// Import the mocked functions
import { getCreditCard, updateCreditCard, deleteCreditCard } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/cards/[id] API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			params: { id: '1' },
			request: {
				json: vi.fn()
			}
		};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});
	describe('GET endpoint', () => {
		it('should return credit card by id', async () => {
			const mockCard = { id: 1, name: 'Chase Freedom', last4: '1234', created_at: '2024-01-01' };
			getCreditCard.mockResolvedValue(mockCard);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getCreditCard).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual(mockCard);
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await GET(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getCreditCard).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return 400 for missing id', async () => {
			mockEvent.params = {};

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for invalid id', async () => {
			mockEvent.params = { id: 'invalid' };

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for null id', async () => {
			mockEvent.params = { id: null };

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getCreditCard).not.toHaveBeenCalled();
		});

		it('should return 404 for non-existent card', async () => {
			getCreditCard.mockResolvedValue(null);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(getCreditCard).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual({ error: 'Credit card not found' });
			expect(response.status).toBe(404);
		});

		it('should handle database errors gracefully', async () => {
			getCreditCard.mockRejectedValue(new Error('Database connection failed'));

			await expect(GET(mockEvent)).rejects.toThrow('Database connection failed');
		});

		it('should handle zero id', async () => {
			mockEvent.params = { id: '0' };

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
		});

		it('should return 400 for negative id', async () => {
			mockEvent.params = { id: '-1' };

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getCreditCard).not.toHaveBeenCalled();
		});
	});

	describe('PUT endpoint', () => {
		it('should update credit card successfully', async () => {
			const existingCard = { id: 1, name: 'Old Name', last4: '1234' };
			const updateData = { name: 'New Name', last4: '5678' };

			getCreditCard.mockResolvedValue(existingCard);
			mockEvent.request.json.mockResolvedValue(updateData);
			updateCreditCard.mockResolvedValue({ id: 1, name: 'New Name', last4: '5678' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getCreditCard).toHaveBeenCalledWith(mockEvent, 1);
			expect(mockEvent.request.json).toHaveBeenCalled();
			expect(updateCreditCard).toHaveBeenCalledWith(mockEvent, 1, 'New Name', '5678');
			expect(result).toEqual({ success: true });
			expect(response.status).toBe(200);
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await PUT(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getCreditCard).not.toHaveBeenCalled();
			expect(mockEvent.request.json).not.toHaveBeenCalled();
			expect(updateCreditCard).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return 400 for missing id', async () => {
			mockEvent.params = {};

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for invalid id', async () => {
			mockEvent.params = { id: 'invalid' };

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for negative id', async () => {
			mockEvent.params = { id: '-1' };

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(getCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for missing name', async () => {
			mockEvent.request.json.mockResolvedValue({ last4: '1234' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(updateCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for missing last4', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(updateCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for empty name', async () => {
			mockEvent.request.json.mockResolvedValue({ name: '', last4: '1234' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(updateCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for empty last4', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: '' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing name or last4' });
			expect(response.status).toBe(400);
			expect(updateCreditCard).not.toHaveBeenCalled();
		});

		it('should return 404 for non-existent card', async () => {
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: '1234' });
			getCreditCard.mockResolvedValue(null);

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(getCreditCard).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual({ error: 'Credit card not found' });
			expect(response.status).toBe(404);
			expect(updateCreditCard).not.toHaveBeenCalled();
		});

		it('should update card with original values (no trimming)', async () => {
			const existingCard = { id: 1, name: 'Old Name', last4: '1234' };
			mockEvent.request.json.mockResolvedValue({
				name: '  New Name  ',
				last4: '  5678  '
			});
			getCreditCard.mockResolvedValue(existingCard);
			updateCreditCard.mockResolvedValue({ id: 1, name: '  New Name  ', last4: '  5678  ' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(updateCreditCard).toHaveBeenCalledWith(mockEvent, 1, '  New Name  ', '  5678  ');
			expect(result).toEqual({ success: true });
		});

		it('should handle special characters in card name', async () => {
			const existingCard = { id: 1, name: 'Old Name', last4: '1234' };
			mockEvent.request.json.mockResolvedValue({
				name: 'Amex Gold & Platinum',
				last4: '5678'
			});
			getCreditCard.mockResolvedValue(existingCard);
			updateCreditCard.mockResolvedValue({ id: 1, name: 'Amex Gold & Platinum', last4: '5678' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(updateCreditCard).toHaveBeenCalledWith(mockEvent, 1, 'Amex Gold & Platinum', '5678');
			expect(result).toEqual({ success: true });
		});

		it('should handle malformed JSON', async () => {
			mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'));

			await expect(PUT(mockEvent)).rejects.toThrow('Invalid JSON');
		});

		it('should handle database errors during update', async () => {
			const existingCard = { id: 1, name: 'Old Name', last4: '1234' };
			mockEvent.request.json.mockResolvedValue({ name: 'Test Card', last4: '1234' });
			getCreditCard.mockResolvedValue(existingCard);
			updateCreditCard.mockRejectedValue(new Error('Database constraint violation'));

			await expect(PUT(mockEvent)).rejects.toThrow('Database constraint violation');
		});

		it('should ignore extra fields in request', async () => {
			const existingCard = { id: 1, name: 'Old Name', last4: '1234' };
			mockEvent.request.json.mockResolvedValue({
				name: 'Updated Card',
				last4: '9999',
				extraField: 'ignored',
				anotherId: 123
			});
			getCreditCard.mockResolvedValue(existingCard);
			updateCreditCard.mockResolvedValue({ id: 1, name: 'Updated Card', last4: '9999' });

			const response = await PUT(mockEvent);
			const result = JSON.parse(await response.text());

			expect(updateCreditCard).toHaveBeenCalledWith(mockEvent, 1, 'Updated Card', '9999');
			expect(result).toEqual({ success: true });
		});
	});

	describe('DELETE endpoint', () => {
		it('should delete credit card successfully', async () => {
			deleteCreditCard.mockResolvedValue();

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(deleteCreditCard).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual({ success: true });
			expect(response.status).toBe(200);
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await DELETE(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(deleteCreditCard).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return 400 for missing id', async () => {
			mockEvent.params = {};

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(deleteCreditCard).not.toHaveBeenCalled();
		});

		it('should return 400 for invalid id', async () => {
			mockEvent.params = { id: 'invalid' };

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(deleteCreditCard).not.toHaveBeenCalled();
		});

		it('should handle database errors during deletion', async () => {
			deleteCreditCard.mockRejectedValue(new Error('Database constraint violation'));

			await expect(DELETE(mockEvent)).rejects.toThrow('Database constraint violation');
		});

		it('should handle zero id', async () => {
			mockEvent.params = { id: '0' };

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
		});

		it('should return 400 for negative id', async () => {
			mockEvent.params = { id: '-1' };

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
			expect(deleteCreditCard).not.toHaveBeenCalled();
		});

		it('should handle null id', async () => {
			mockEvent.params = { id: null };

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid id' });
			expect(response.status).toBe(400);
		});
	});
});