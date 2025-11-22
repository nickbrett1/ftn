import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../../../../../../src/routes/projects/ccbilling/charges/[id]/+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getPayment: vi.fn(),
	updatePayment: vi.fn(),
	listBudgets: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('@sveltejs/kit', async (importOriginal) => {
	const original = await importOriginal();
	return {
		...original,
		json: vi.fn((data, init) => {
			return new Response(JSON.stringify(data), init);
		})
	};
});

// Import the mocked functions
import { getPayment, updatePayment, listBudgets } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import { json } from '@sveltejs/kit';

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

			await GET(mockEvent);

			expect(getPayment).toHaveBeenCalledWith(mockEvent, 1);
			expect(json).toHaveBeenCalledWith({ charge: mockCharge });
		});

		it('should return 400 for invalid charge ID', async () => {
			mockEvent.params.id = 'invalid';

			await GET(mockEvent);

			expect(json).toHaveBeenCalledWith({ error: 'Invalid charge ID' }, { status: 400 });
		});

		it('should return 404 when charge not found', async () => {
			getPayment.mockResolvedValue(null);

			await GET(mockEvent);

			expect(json).toHaveBeenCalledWith({ error: 'Charge not found' }, { status: 404 });
		});

		it('should handle database errors', async () => {
			getPayment.mockRejectedValue(new Error('Database error'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await GET(mockEvent);

			expect(json).toHaveBeenCalledWith({ error: 'Failed to get charge' }, { status: 500 });
			expect(consoleErrorSpy).toHaveBeenCalled();
			consoleErrorSpy.mockRestore();
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			await GET(mockEvent);
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

			await PUT(mockEvent);

			expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Updated Merchant', 99.99, 'Nick');
			expect(json).toHaveBeenCalledWith({ success: true });
		});

		it('should return 400 for invalid charge ID', async () => {
			mockEvent.params.id = 'invalid';

			await PUT(mockEvent);

			expect(json).toHaveBeenCalledWith({ error: 'Invalid charge ID' }, { status: 400 });
		});

		it('should return 400 for missing required fields', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Test Merchant'
				// Missing amount and allocated_to
			});

			await PUT(mockEvent);
			expect(json).toHaveBeenCalledWith(
				{ error: 'Missing required fields: merchant, amount' },
				{ status: 400 }
			);
		});

		it('should return 400 for invalid allocated_to value', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Test Merchant',
				amount: 99.99,
				allocated_to: 'Invalid'
			});

			await PUT(mockEvent);

			expect(json).toHaveBeenCalledWith(
				{
					error: 'allocated_to must be one of the available budgets: Nick, Tas, Both'
				},
				{ status: 400 }
			);
		});

		it('should return 400 for invalid amount', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Test Merchant',
				amount: 'not-a-number',
				allocated_to: 'Nick'
			});

			await PUT(mockEvent);

			expect(json).toHaveBeenCalledWith(
				{ error: 'Amount must be a valid number' },
				{ status: 400 }
			);
		});

		it('should handle database errors', async () => {
			updatePayment.mockRejectedValue(new Error('Database error'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await PUT(mockEvent);

			expect(json).toHaveBeenCalledWith({ error: 'Failed to update charge' }, { status: 500 });
			expect(consoleErrorSpy).toHaveBeenCalled();
			consoleErrorSpy.mockRestore();
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

				await PUT(mockEvent);

				expect(json).toHaveBeenCalledWith({ success: true });
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

			await PUT(mockEvent);

			expect(json).toHaveBeenCalledWith({ success: true });
			expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Refund', 0, 'Both');
		});

		it('should handle negative amounts', async () => {
			mockEvent.request.json.mockResolvedValue({
				merchant: 'Credit',
				amount: -50,
				allocated_to: 'Nick'
			});
			updatePayment.mockResolvedValue({});

			await PUT(mockEvent);

			expect(json).toHaveBeenCalledWith({ success: true });
			expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Credit', -50, 'Nick');
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			await PUT(mockEvent);
			expect(updatePayment).not.toHaveBeenCalled();
		});

		it('should allow updating only the allocation', async () => {
			mockEvent.request.json.mockResolvedValue({
				allocated_to: 'Tas'
			});
			getPayment.mockResolvedValue({
				id: 1,
				merchant: 'Amazon',
				amount: 85.67
			});
			updatePayment.mockResolvedValue({});
			await PUT(mockEvent);
			expect(json).toHaveBeenCalledWith({ success: true });
			expect(updatePayment).toHaveBeenCalledWith(mockEvent, 1, 'Amazon', 85.67, 'Tas');
		});
	});
});