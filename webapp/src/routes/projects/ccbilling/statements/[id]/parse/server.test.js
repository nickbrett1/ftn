import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	createPayment: vi.fn(),
	deletePaymentsForStatement: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, opts) => new Response(JSON.stringify(data), opts))
}));

// Mock environment variables
vi.mock('$env/static/private', () => ({
	LLAMA_API_KEY: 'test-api-key'
}));

// Mock pdf-parse
const mockPdfParse = vi.fn();
vi.mock('pdf-parse/lib/pdf-parse.js', () => ({
	default: mockPdfParse
}));

// Import the mocked functions
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/statements/[id]/parse API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		mockEvent = {
			params: { id: '1' },
			platform: {
				env: {
					R2_CCBILLING: {
						get: vi.fn().mockResolvedValue({
							arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)) // Larger buffer for realistic PDF
						})
					}
				}
			},
			fetch: vi.fn()
		};

		// Mock setTimeout to avoid actual delays in tests
		vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
			fn();
			return 123; // Mock timer ID
		});

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });

		// Set up default pdf-parse mock behavior
		mockPdfParse.mockResolvedValue({
			numpages: 2,
			text: 'Amazon $85.67 Grocery Store $124.32 Gas Station $45.21'
		});

		// Mock successful Llama API response
		mockEvent.fetch.mockResolvedValue({
			ok: true,
			json: vi.fn().mockResolvedValue({
				completion_message: {
					content: {
						text: JSON.stringify([
							{ merchant: 'Amazon', amount: 85.67 },
							{ merchant: 'Grocery Store', amount: 124.32 },
							{ merchant: 'Gas Station', amount: 45.21 }
						])
					}
				}
			})
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('POST endpoint', () => {
		it('should successfully parse a statement with Llama API', async () => {
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

			// Should create multiple payments from Llama API response
			expect(createPayment).toHaveBeenCalledTimes(3);
			expect(createPayment).toHaveBeenNthCalledWith(1, mockEvent, 1, 'Amazon', 85.67, 'Both');
			expect(createPayment).toHaveBeenNthCalledWith(
				2,
				mockEvent,
				1,
				'Grocery Store',
				124.32,
				'Both'
			);
			expect(createPayment).toHaveBeenNthCalledWith(3, mockEvent, 1, 'Gas Station', 45.21, 'Both');

			expect(result.success).toBe(true);
			expect(result.charges_found).toBe(3);
			expect(result.message).toBe('Statement parsed successfully using Llama API');
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
			expect(result.error).toBe('Failed to parse statement: Database error');
		});

		it('should handle errors when deleting existing payments', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockRejectedValue(new Error('Delete error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to parse statement: Delete error');
		});

		it('should handle errors when creating payments', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockRejectedValue(new Error('Create payment error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to parse statement: Create payment error');
		});

		it('should handle Llama API errors', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});

			// Mock Llama API error
			mockEvent.fetch.mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				text: vi.fn().mockResolvedValue('Invalid API key')
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toContain('Llama API error: 401 Unauthorized');
		});

		it('should delete existing payments before creating new ones', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
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
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			await POST(mockEvent);

			// Check that payments are created with expected allocations
			const createPaymentCalls = createPayment.mock.calls;
			expect(createPaymentCalls[0][4]).toBe('Both'); // Amazon
			expect(createPaymentCalls[1][4]).toBe('Both'); // Grocery Store
			expect(createPaymentCalls[2][4]).toBe('Both'); // Gas Station (now defaulting to 'Both')
		});

		it('should use statement ID correctly in all operations', async () => {
			mockEvent.params.id = '42';
			const statementId = 42;

			const mockStatement = {
				id: statementId,
				filename: 'statement.pdf',
				r2_key: 'statements/42/test.pdf'
			};
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			await POST(mockEvent);

			expect(getStatement).toHaveBeenCalledWith(mockEvent, statementId);
			expect(deletePaymentsForStatement).toHaveBeenCalledWith(mockEvent, statementId);

			// All createPayment calls should use the same statement ID
			createPayment.mock.calls.forEach((call) => {
				expect(call[1]).toBe(statementId); // statement_id parameter
			});
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			expect(await POST(mockEvent)).toEqual(expect.any(Response));
			expect(getStatement).not.toHaveBeenCalled();
			expect(createPayment).not.toHaveBeenCalled();
			expect(deletePaymentsForStatement).not.toHaveBeenCalled();
		});
	});
});
