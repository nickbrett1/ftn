import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	GET,
	POST,
	DELETE
} from '../../../../../../../src/routes/projects/ccbilling/budgets/[id]/merchants/+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getBudgetMerchants: vi.fn(),
	addBudgetMerchant: vi.fn(),
	removeBudgetMerchant: vi.fn(),
	getBudgetByMerchant: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

// Import the mocked functions
import {
	getBudgetMerchants,
	addBudgetMerchant,
	removeBudgetMerchant,
	getBudgetByMerchant
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/budgets/[id]/merchants API', () => {
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
		it('should return list of merchants for budget', async () => {
			const mockMerchants = [
				{ merchant: 'Whole Foods', budget_id: 1 },
				{ merchant: 'Kroger', budget_id: 1 },
				{ merchant: 'Trader Joes', budget_id: 1 }
			];
			getBudgetMerchants.mockResolvedValue(mockMerchants);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getBudgetMerchants).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual(mockMerchants);
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await GET(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getBudgetMerchants).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for invalid budget id', async () => {
			mockEvent.params.id = 'invalid';

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid budget id' });
			expect(response.status).toBe(400);
			expect(getBudgetMerchants).not.toHaveBeenCalled();
		});

		it('should return error for missing budget id', async () => {
			mockEvent.params.id = '';

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid budget id' });
			expect(response.status).toBe(400);
			expect(getBudgetMerchants).not.toHaveBeenCalled();
		});

		it('should handle zero budget id', async () => {
			mockEvent.params.id = '0';

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid budget id' });
			expect(response.status).toBe(400);
			expect(getBudgetMerchants).not.toHaveBeenCalled();
		});

		it('should handle empty merchant list', async () => {
			getBudgetMerchants.mockResolvedValue([]);

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual([]);
			expect(response.status).toBe(200);
		});

		it('should handle database errors', async () => {
			getBudgetMerchants.mockRejectedValue(new Error('Database connection failed'));

			await expect(GET(mockEvent)).rejects.toThrow('Database connection failed');
		});

		it('should handle negative budget id', async () => {
			mockEvent.params.id = '-1';
			getBudgetMerchants.mockResolvedValue([]); // Reset the mock

			const response = await GET(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid budget id' });
			expect(response.status).toBe(400);
		});
	});

	describe('POST endpoint', () => {
		it('should add merchant to budget successfully', async () => {
			const merchantData = { merchant: 'Amazon' };
			mockEvent.request.json.mockResolvedValue(merchantData);
			addBudgetMerchant.mockResolvedValue();
			getBudgetByMerchant.mockResolvedValue(null);

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).toHaveBeenCalled();
			expect(addBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, 'Amazon');
			expect(result).toEqual({ success: true });
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await POST(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for invalid budget id', async () => {
			mockEvent.params.id = 'invalid';

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid budget id' });
			expect(response.status).toBe(400);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
		});

		it('should return error for missing merchant name', async () => {
			mockEvent.request.json.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing merchant name' });
			expect(response.status).toBe(400);
			expect(addBudgetMerchant).not.toHaveBeenCalled();
		});

		it('should return error for empty merchant name', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: '' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing merchant name' });
			expect(response.status).toBe(400);
			expect(addBudgetMerchant).not.toHaveBeenCalled();
		});

		it('should return error for null merchant name', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: null });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing merchant name' });
			expect(response.status).toBe(400);
			expect(addBudgetMerchant).not.toHaveBeenCalled();
		});

		it('should handle whitespace-only merchant names', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: '   ' });

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing merchant name' });
			expect(response.status).toBe(400);
			expect(addBudgetMerchant).not.toHaveBeenCalled();
		});

		it('should add merchant with trimmed name', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: '  Target  ' });
			addBudgetMerchant.mockResolvedValue();
			getBudgetByMerchant.mockResolvedValue(null);

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(addBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, 'Target');
			expect(result).toEqual({ success: true });
		});

		it('should handle special characters in merchant names', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: "McDonald's" });
			addBudgetMerchant.mockResolvedValue();
			getBudgetByMerchant.mockResolvedValue(null);

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(addBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, "McDonald's");
			expect(result).toEqual({ success: true });
		});

		it('should handle merchant names with numbers and symbols', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: '7-Eleven Store #1234' });
			addBudgetMerchant.mockResolvedValue();
			getBudgetByMerchant.mockResolvedValue(null);

			await POST(mockEvent);

			expect(addBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, '7-Eleven Store #1234');
		});

		it('should handle very long merchant names', async () => {
			const longName = 'A'.repeat(100);
			mockEvent.request.json.mockResolvedValue({ merchant: longName });
			addBudgetMerchant.mockResolvedValue();
			getBudgetByMerchant.mockResolvedValue(null);

			await POST(mockEvent);

			expect(addBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, longName);
		});

		it('should handle database errors during addition', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: 'Test Merchant' });
			getBudgetByMerchant.mockResolvedValue(null);
			addBudgetMerchant.mockRejectedValue(new Error('Duplicate key violation'));

			await expect(POST(mockEvent)).rejects.toThrow('Duplicate key violation');
		});

		it('should ignore extra fields in request', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Walmart',
				extraField: 'ignored',
				budgetId: 999
			});
			addBudgetMerchant.mockResolvedValue();
			getBudgetByMerchant.mockResolvedValue(null);

			const response = await POST(mockEvent);
			const result = JSON.parse(await response.text());

			expect(addBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, 'Walmart');
			expect(result).toEqual({ success: true });
		});
	});

	describe('DELETE endpoint', () => {
		it('should remove merchant from budget successfully', async () => {
			const merchantData = { merchant: 'Amazon' };
			mockEvent.request.json.mockResolvedValue(merchantData);
			removeBudgetMerchant.mockResolvedValue();

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).toHaveBeenCalled();
			expect(removeBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, 'Amazon');
			expect(result).toEqual({ success: true });
		});

		it('should redirect if user not authenticated', async () => {
			const redirectResponse = new Response(null, { status: 302 });
			requireUser.mockResolvedValue(redirectResponse);

			const response = await DELETE(mockEvent);

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
			expect(response).toBe(redirectResponse);
		});

		it('should return error for invalid budget id', async () => {
			mockEvent.params.id = 'invalid';

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid budget id' });
			expect(response.status).toBe(400);
			expect(mockEvent.request.json).not.toHaveBeenCalled();
		});

		it('should return error for missing merchant name', async () => {
			mockEvent.request.json.mockResolvedValue({});

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing merchant name' });
			expect(response.status).toBe(400);
			expect(removeBudgetMerchant).not.toHaveBeenCalled();
		});

		it('should return error for empty merchant name', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: '' });

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing merchant name' });
			expect(response.status).toBe(400);
			expect(removeBudgetMerchant).not.toHaveBeenCalled();
		});

		it('should handle special characters in merchant names for deletion', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: "Trader Joe's" });
			removeBudgetMerchant.mockResolvedValue();

			await DELETE(mockEvent);

			expect(removeBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, "Trader Joe's");
		});

		it('should remove merchant with trimmed name', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: '  Costco  ' });
			removeBudgetMerchant.mockResolvedValue();

			await DELETE(mockEvent);

			expect(removeBudgetMerchant).toHaveBeenCalledWith(mockEvent, 1, 'Costco');
		});

		it('should handle database errors during removal', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: 'Test Merchant' });
			removeBudgetMerchant.mockRejectedValue(new Error('Foreign key constraint'));

			await expect(DELETE(mockEvent)).rejects.toThrow('Foreign key constraint');
		});

		it('should handle removal of non-existent merchant gracefully', async () => {
			mockEvent.request.json.mockResolvedValue({ merchant: 'Non-existent Merchant' });
			removeBudgetMerchant.mockResolvedValue(); // DB function handles this gracefully

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ success: true });
		});

		it('should handle zero budget id for deletion', async () => {
			mockEvent.params.id = '0';

			const response = await DELETE(mockEvent);
			const result = JSON.parse(await response.text());

			expect(result).toEqual({ error: 'Missing or invalid budget id' });
			expect(response.status).toBe(400);
		});

		it('should handle malformed JSON in DELETE request', async () => {
			mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'));

			await expect(DELETE(mockEvent)).rejects.toThrow('Invalid JSON');
		});
	});
});
