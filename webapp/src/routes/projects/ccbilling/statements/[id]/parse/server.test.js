import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server.js';

// Mock the database functions
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	createPayment: vi.fn(),
	deletePaymentsForStatement: vi.fn()
}));

// Mock the user authentication
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

// Mock the LlamaService
vi.mock('$lib/server/ccbilling-llama-service.js', () => ({
	LlamaService: vi.fn().mockImplementation(() => ({
		parseStatement: vi.fn(),
		classifyMerchants: vi.fn()
	}))
}));

// Mock the entire pdf-parse module
vi.mock('pdf-parse/lib/pdf-parse.js', () => ({
	default: vi.fn()
}));

// Import the mocked functions
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import { LlamaService } from '$lib/server/ccbilling-llama-service.js';

describe('/projects/ccbilling/statements/[id]/parse API', () => {
	let mockEvent;

	beforeEach(async () => {
		vi.clearAllMocks();

		mockEvent = {
			params: { id: '1' },
			platform: {
				env: {
					R2_CCBILLING: {
						get: vi.fn().mockResolvedValue({
							arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
						})
					}
				}
			}
		};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });

		// Mock the LlamaService to return some basic charges
		const mockLlamaInstance = new LlamaService();
		mockLlamaInstance.parseStatement.mockResolvedValue([
			{ merchant: 'Amazon', amount: 85.67, date: '2024-01-15', allocated_to: 'Both' },
			{ merchant: 'Grocery Store', amount: 124.32, date: '2024-01-16', allocated_to: 'Both' },
			{ merchant: 'Gas Station', amount: 45.21, date: '2024-01-17', allocated_to: 'Both' }
		]);
	});

	describe('POST endpoint', () => {
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

		it('should return 401 if user not authenticated', async () => {
			requireUser.mockResolvedValue(
				new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
			);

			const response = await POST(mockEvent);

			expect(response.status).toBe(401);
			const result = await response.json();
			expect(result.error).toBe('Not authenticated');
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
	});
});
