import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, findJsonArray } from './+server.js';

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

// Mock llama-api-client
const mockLlamaClient = {
	chat: {
		completions: {
			create: vi.fn()
		}
	}
};
vi.mock('llama-api-client', () => ({
	default: vi.fn(() => mockLlamaClient)
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
			}
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
		mockLlamaClient.chat.completions.create.mockResolvedValue({
			completion_message: {
				content: {
					text:
						'[' +
						'{"merchant":"Amazon","amount":85.67,"date":"2024-01-15"},' +
						'{"merchant":"Grocery Store","amount":124.32,"date":"2024-01-16"},' +
						'{"merchant":"Gas Station","amount":45.21,"date":"2024-01-17"}' +
						']'
				}
			}
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
			expect(createPayment).toHaveBeenNthCalledWith(
				1,
				mockEvent,
				1,
				'Amazon',
				85.67,
				'Both',
				'2024-01-15'
			);
			expect(createPayment).toHaveBeenNthCalledWith(
				2,
				mockEvent,
				1,
				'Grocery Store',
				124.32,
				'Both',
				'2024-01-16'
			);
			expect(createPayment).toHaveBeenNthCalledWith(
				3,
				mockEvent,
				1,
				'Gas Station',
				45.21,
				'Both',
				'2024-01-17'
			);

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
			mockLlamaClient.chat.completions.create.mockRejectedValue(
				new Error('Llama API error: 401 Unauthorized - Invalid API key')
			);

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

		it('should handle charges without dates correctly', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			// Mock Llama API response with some charges missing dates
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text:
							'[' +
							'{"merchant":"Amazon","amount":85.67,"date":"2024-01-15"},' +
							'{"merchant":"Grocery Store","amount":124.32},' +
							'{"merchant":"Gas Station","amount":45.21,"date":"2024-01-17"}' +
							']'
					}
				}
			});

			await POST(mockEvent);

			// Check that payments are created with dates when available, null when not
			expect(createPayment).toHaveBeenCalledTimes(3);
			expect(createPayment).toHaveBeenNthCalledWith(
				1,
				mockEvent,
				1,
				'Amazon',
				85.67,
				'Both',
				'2024-01-15'
			);
			expect(createPayment).toHaveBeenNthCalledWith(
				2,
				mockEvent,
				1,
				'Grocery Store',
				124.32,
				'Both',
				null
			);
			expect(createPayment).toHaveBeenNthCalledWith(
				3,
				mockEvent,
				1,
				'Gas Station',
				45.21,
				'Both',
				'2024-01-17'
			);
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

	describe('findJsonArray function', () => {
		it('should find simple JSON arrays', () => {
			const result = findJsonArray('[1, 2, 3]');
			expect(result).toBe('[1, 2, 3]');
		});

		it('should find JSON arrays with objects', () => {
			const input = '[{"merchant": "Amazon", "amount": 100}]';
			const result = findJsonArray(input);
			expect(result).toBe('[{"merchant": "Amazon", "amount": 100}]');
		});

		it('should handle deeply nested arrays', () => {
			const input = '[[[1, 2], [3, 4]], [[5, 6]]]';
			const result = findJsonArray(input);
			expect(result).toBe('[[[1, 2], [3, 4]], [[5, 6]]]');
		});

		it('should handle square brackets in strings', () => {
			const input = '["item [1]", "store [A]"]';
			const result = findJsonArray(input);
			expect(result).toBe('["item [1]", "store [A]"]');
		});

		it('should handle escaped quotes in strings', () => {
			const input = '["escaped \\"quote\\"", "normal"]';
			const result = findJsonArray(input);
			expect(result).toBe('["escaped \\"quote\\"", "normal"]');
		});

		it('should find arrays in mixed content', () => {
			const input = 'Some text before [1, 2, 3] and after';
			const result = findJsonArray(input);
			expect(result).toBe('[1, 2, 3]');
		});

		it('should handle complex nested objects with arrays', () => {
			const input = '[{"a": [1, 2, [3, 4]]}, {"b": "text [test]"}]';
			const result = findJsonArray(input);
			expect(result).toBe('[{"a": [1, 2, [3, 4]]}, {"b": "text [test]"}]');
		});

		it('should return null for unclosed arrays', () => {
			const input = '[1, 2, 3';
			const result = findJsonArray(input);
			expect(result).toBe(null);
		});

		it('should return null for content without arrays', () => {
			const input = 'No arrays here just text';
			const result = findJsonArray(input);
			expect(result).toBe(null);
		});

		it('should handle empty arrays', () => {
			const input = '[]';
			const result = findJsonArray(input);
			expect(result).toBe('[]');
		});

		it('should handle arrays with only whitespace', () => {
			const input = '[ ]';
			const result = findJsonArray(input);
			expect(result).toBe('[ ]');
		});

		it('should stop at maxLength to prevent excessive processing', () => {
			// Create a very long string that exceeds the maxLength limit
			const longContent = 'x'.repeat(200000) + '[1, 2, 3]';
			const result = findJsonArray(longContent);
			expect(result).toBe(null); // Should return null due to maxLength limit
		});

		it('should handle multiple bracket pairs and find the first complete array', () => {
			const input = '[incomplete [ [1, 2, 3] more text';
			const result = findJsonArray(input);
			expect(result).toBe('[1, 2, 3]'); // Finds the complete nested array
		});

		it('should handle arrays with complex string content', () => {
			const input = '[{"description": "Payment [Method: Credit Card] - Amount: $100"}]';
			const result = findJsonArray(input);
			expect(result).toBe('[{"description": "Payment [Method: Credit Card] - Amount: $100"}]');
		});
	});

	describe('JSON parsing edge cases', () => {
		it('should handle malformed JSON with trailing commas', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			// Mock Llama API response with trailing commas
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text: '[{"merchant":"Amazon","amount":85.67,}]'
					}
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(result.success).toBe(true);
			expect(createPayment).toHaveBeenCalledTimes(1);
		});

		it('should handle JSON wrapped in markdown code blocks', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			// Mock Llama API response wrapped in markdown
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text: '```json\n[{"merchant":"Amazon","amount":85.67}]\n```'
					}
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(result.success).toBe(true);
			expect(createPayment).toHaveBeenCalledTimes(1);
		});

		it('should handle JSON parsing fallback scenarios', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			// Mock Llama API response that requires fallback parsing
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text: 'Some text before [{"merchant":"Amazon","amount":85.67}] and after'
					}
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(result.success).toBe(true);
			expect(createPayment).toHaveBeenCalledTimes(1);
		});

		it('should filter out payment credits', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			// Mock response with payment credits that should be filtered out
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text: '[{"merchant":"Amazon","amount":85.67},{"merchant":"Payment Thank You","amount":-100}]'
					}
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(result.success).toBe(true);
			expect(createPayment).toHaveBeenCalledTimes(1); // Only Amazon, not the payment
			expect(createPayment).toHaveBeenCalledWith(mockEvent, 1, 'Amazon', 85.67, 'Both', null);
		});

		it('should handle completely malformed JSON gracefully', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});

			// Mock completely invalid JSON response
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text: 'This is not JSON at all { broken }'
					}
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toContain('Llama API parsing failed');
		});

		it('should handle Llama API returning non-array data', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});

			// Mock Llama API returning an object instead of array
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text: '{"merchant":"Amazon","amount":85.67}'
					}
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toContain('Llama API did not return a valid array');
		});

		it('should handle invalid charge objects in array', async () => {
			const mockStatement = { id: 1, filename: 'statement.pdf', r2_key: 'statements/1/test.pdf' };
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue({});
			createPayment.mockResolvedValue({});

			// Mock response with invalid charge objects
			mockLlamaClient.chat.completions.create.mockResolvedValue({
				completion_message: {
					content: {
						text: '[{"merchant":"Amazon","amount":85.67}, null, "invalid", {"merchant":"Store","amount":50}]'
					}
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(result.success).toBe(true);
			expect(createPayment).toHaveBeenCalledTimes(2); // Only valid charges should be processed
		});
	});
});
