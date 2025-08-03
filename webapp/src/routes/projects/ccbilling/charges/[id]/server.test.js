import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getPayment: vi.fn(),
	updatePayment: vi.fn(),
	listBudgets: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('@sveltejs/kit', () => ({ json: vi.fn((data, opts) => new Response(JSON.stringify(data), opts)) }));

// Import the mocked functions
import { getPayment, updatePayment, listBudgets } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';



describe('/projects/ccbilling/charges/[id] API', () => {
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
		
		// Mock listBudgets to return test budgets
		listBudgets.mockResolvedValue([
			{ id: 1, name: 'Nick' },
			{ id: 2, name: 'Tas' },
			{ id: 3, name: 'Both' }
		]);
	});

	describe('GET endpoint', () => {
		it('should return a specific charge', async () => {
			const mockCharge = {
				id: 1,
				merchant: 'Amazon',
				amount: 85.67,
				allocated_to: 'Both',
				card_name: 'Chase Freedom',
				last4: '1234'
			};
			getPayment.mockResolvedValue(mockCharge);

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(getPayment).toHaveBeenCalledWith(mockEvent, 1);
			expect(result.charge).toEqual(mockCharge);
		});

		it('should return 400 for invalid charge ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid charge ID');
		});

		it('should return 404 when charge not found', async () => {
			getPayment.mockResolvedValue(null);

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.error).toBe('Charge not found');
		});

		it('should handle database errors', async () => {
			getPayment.mockRejectedValue(new Error('Database error'));

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to get charge');
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			expect(await GET(mockEvent)).toEqual(expect.any(Response));
			expect(getPayment).not.toHaveBeenCalled();
		});
	});

	describe('PUT endpoint', () => {
		beforeEach(() => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Updated Merchant',
				amount: 99.99,
				allocated_to: 'Nick'
			});
		});

		it('should successfully update a charge', async () => {
			updatePayment.mockResolvedValue({});

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Updated Merchant', 99.99, 'Nick');
			expect(result.success).toBe(true);
		});

		it('should return 400 for invalid charge ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid charge ID');
		});

		it('should return 400 for missing required fields', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Test Merchant'
				// Missing amount and allocated_to
			});

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing required fields: merchant, amount, allocated_to');
		});

		it('should return 400 for invalid allocated_to value', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Test Merchant',
				amount: 99.99,
				allocated_to: 'Invalid'
			});

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('allocated_to must be one of the available budgets: Nick, Tas, Both');
		});

		it('should return 400 for invalid amount', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Test Merchant',
				amount: 'not-a-number',
				allocated_to: 'Nick'
			});

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Amount must be a valid number');
		});

		it('should handle database errors', async () => {
			updatePayment.mockRejectedValue(new Error('Database error'));

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to update charge');
		});

		it('should validate all allocation options', async () => {
			const validOptions = ['Nick', 'Tas', 'Both'];

			for (const option of validOptions) {
				mockEvent.request.json.mockResolvedValue({
					merchant: 'Test Merchant',
					amount: 99.99,
					allocated_to: option
				});
				updatePayment.mockResolvedValue({});

				const response = await PUT(mockEvent);
				const result = await response.json();

				expect(response.status).toBe(200);
				expect(result.success).toBe(true);
				expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Test Merchant', 99.99, option);
			}
		});

		it('should handle zero amount', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Refund',
				amount: 0,
				allocated_to: 'Both'
			});
			updatePayment.mockResolvedValue({});

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Refund', 0, 'Both');
		});

		it('should handle negative amounts', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Credit',
				amount: -50.00,
				allocated_to: 'Nick'
			});
			updatePayment.mockResolvedValue({});

			const response = await PUT(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Credit', -50.00, 'Nick');
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			expect(await PUT(mockEvent)).toEqual(expect.any(Response));
			expect(updatePayment).not.toHaveBeenCalled();
		});
	});
});