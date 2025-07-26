import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	listChargesForCycle: vi.fn(),
	bulkAssignPayments: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, opts) => new Response(JSON.stringify(data), opts))
}));

// Import the mocked functions
import { listChargesForCycle, bulkAssignPayments } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/cycles/[id]/charges API', () => {
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
		it('should return charges for a billing cycle', async () => {
			const mockCharges = [
				{ id: 1, merchant: 'Amazon', amount: 85.67, card_name: 'Chase Freedom', last4: '1234' },
				{ id: 2, merchant: 'Target', amount: 45.32, card_name: 'Amex Gold', last4: '5678' }
			];
			listChargesForCycle.mockResolvedValue(mockCharges);

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(listChargesForCycle).toHaveBeenCalledWith(mockEvent, 1);
			expect(result.charges).toEqual(mockCharges);
		});

		it('should return 400 for invalid billing cycle ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid billing cycle ID');
			expect(listChargesForCycle).not.toHaveBeenCalled();
		});

		it('should handle database errors', async () => {
			listChargesForCycle.mockRejectedValue(new Error('Database error'));

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to list charges');
		});

		it('should handle zero as valid cycle ID', async () => {
			mockEvent.params.id = '0';
			listChargesForCycle.mockResolvedValue([]);

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(listChargesForCycle).toHaveBeenCalledWith(mockEvent, 0);
			expect(result.charges).toEqual([]);
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			expect(await GET(mockEvent)).toEqual(expect.any(Response));
			expect(listChargesForCycle).not.toHaveBeenCalled();
		});
	});

	describe('POST endpoint (bulk assignment)', () => {
		beforeEach(() => {
			mockEvent.request.json.mockResolvedValue({
				assignments: [
					{ id: 1, allocated_to: 'Nick' },
					{ id: 2, allocated_to: 'Tas' }
				]
			});
		});

		it('should successfully bulk assign charges', async () => {
			bulkAssignPayments.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(bulkAssignPayments).toHaveBeenCalledWith(mockEvent, [
				{ id: 1, allocated_to: 'Nick' },
				{ id: 2, allocated_to: 'Tas' }
			]);
			expect(result.success).toBe(true);
		});

		it('should return 400 for invalid billing cycle ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid billing cycle ID');
			expect(bulkAssignPayments).not.toHaveBeenCalled();
		});

		it('should return 400 for missing assignments', async () => {
			mockEvent.request.json.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid assignments data');
			expect(bulkAssignPayments).not.toHaveBeenCalled();
		});

		it('should return 400 for non-array assignments', async () => {
			mockEvent.request.json.mockResolvedValue({
				assignments: 'not-an-array'
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid assignments data');
			expect(bulkAssignPayments).not.toHaveBeenCalled();
		});

		it('should return 400 for assignments missing id', async () => {
			mockEvent.request.json.mockResolvedValue({
				assignments: [
					{ allocated_to: 'Nick' } // Missing id
				]
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Each assignment must have id and allocated_to');
			expect(bulkAssignPayments).not.toHaveBeenCalled();
		});

		it('should return 400 for assignments missing allocated_to', async () => {
			mockEvent.request.json.mockResolvedValue({
				assignments: [
					{ id: 1 } // Missing allocated_to
				]
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Each assignment must have id and allocated_to');
			expect(bulkAssignPayments).not.toHaveBeenCalled();
		});

		it('should handle empty assignments array', async () => {
			mockEvent.request.json.mockResolvedValue({
				assignments: []
			});
			bulkAssignPayments.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(bulkAssignPayments).toHaveBeenCalledWith(mockEvent, []);
			expect(result.success).toBe(true);
		});

		it('should handle database errors', async () => {
			bulkAssignPayments.mockRejectedValue(new Error('Database error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to bulk assign charges');
		});

		it('should handle single assignment', async () => {
			mockEvent.request.json.mockResolvedValue({
				assignments: [{ id: 1, allocated_to: 'Both' }]
			});
			bulkAssignPayments.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(bulkAssignPayments).toHaveBeenCalledWith(mockEvent, [{ id: 1, allocated_to: 'Both' }]);
			expect(result.success).toBe(true);
		});

		it('should handle invalid JSON', async () => {
			mockEvent.request.json.mockRejectedValue(new Error('Invalid JSON'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to bulk assign charges');
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			expect(await POST(mockEvent)).toEqual(expect.any(Response));
			expect(bulkAssignPayments).not.toHaveBeenCalled();
		});
	});
});
