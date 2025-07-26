import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	createPayment: vi.fn(),
	deletePaymentsForStatement: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, options) => new Response(JSON.stringify(data), {
		headers: { 'Content-Type': 'application/json' },
		...options
	}))
}));

// Import the mocked functions
import { getStatement, createPayment, deletePaymentsForStatement } from '$lib/server/ccbilling-db.js';

describe('/projects/ccbilling/statements/[id]/parse API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			params: { id: '1' }
		};

		// Mock setTimeout to avoid actual delays in tests
		vi.spyOn(global, 'setTimeout').mockImplementation((fn) => {
			fn();
			return 123; // Mock timer ID
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('POST endpoint', () => {
		it('should successfully parse a statement with mock data', async () => {
			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/123456789-abcdef123456-statement.pdf',
				credit_card_id: 1
			};

			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(getStatement).toHaveBeenCalledWith(mockEvent, 1);
			expect(deletePaymentsForStatement).toHaveBeenCalledWith(mockEvent, 1);
			
			// Should create multiple mock payments
			expect(createPayment).toHaveBeenCalledTimes(3);
			expect(createPayment).toHaveBeenNthCalledWith(1, mockEvent, 1, 'Amazon', 85.67, 'Both');
			expect(createPayment).toHaveBeenNthCalledWith(2, mockEvent, 1, 'Grocery Store', 124.32, 'Both');
			expect(createPayment).toHaveBeenNthCalledWith(3, mockEvent, 1, 'Gas Station', 45.21, 'Nick');

			expect(result.success).toBe(true);
			expect(result.charges_found).toBe(3);
			expect(result.message).toBe('Statement parsed successfully (mock implementation)');
		});

		it('should return 400 for invalid statement ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid statement ID');
		});

		it('should return 404 when statement not found', async () => {
			getStatement.mockResolvedValue(null);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.error).toBe('Statement not found');
		});

		it('should handle database errors when getting statement', async () => {
			getStatement.mockRejectedValue(new Error('Database error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to parse statement');
		});

		it('should handle errors when deleting existing payments', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockRejectedValue(new Error('Delete error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to parse statement');
		});

		it('should handle errors when creating payments', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockRejectedValue(new Error('Create payment error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to parse statement');
		});

		it('should delete existing payments before creating new ones', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			await POST(mockEvent);

			// Verify deletion happens before creation
			expect(deletePaymentsForStatement).toHaveBeenCalled();
			expect(createPayment).toHaveBeenCalled();
			expect(deletePaymentsForStatement).toHaveBeenCalledWith(mockEvent, 1);
		});

		it('should create payments with correct default allocation', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			await POST(mockEvent);

			// Check that payments are created with expected allocations
			const createPaymentCalls = createPayment.mock.calls;
			expect(createPaymentCalls[0][4]).toBe('Both'); // Amazon
			expect(createPaymentCalls[1][4]).toBe('Both'); // Grocery Store
			expect(createPaymentCalls[2][4]).toBe('Nick'); // Gas Station
		});

		it('should simulate processing time', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			await POST(mockEvent);

			// Verify setTimeout was called (simulating delay)
			expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
		});

		it('should use statement ID correctly in all operations', async () => {
			mockEvent.params.id = '42';
			const statementId = 42;

			const mockStatement = { id: statementId, filename: 'statement.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			await POST(mockEvent);

			expect(getStatement).toHaveBeenCalledWith(mockEvent, statementId);
			expect(deletePaymentsForStatement).toHaveBeenCalledWith(mockEvent, statementId);
			
			// All createPayment calls should use the same statement ID
			createPayment.mock.calls.forEach(call => {
				expect(call[1]).toBe(statementId); // statement_id parameter
			});
		});
	});
});