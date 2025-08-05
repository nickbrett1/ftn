import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from './+server.js';
import { json } from '@sveltejs/kit';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	createPayment: vi.fn(),
	deletePaymentsForStatement: vi.fn(),
	listCreditCards: vi.fn(),
	updateStatementCreditCard: vi.fn(),
	updateStatementDate: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

vi.mock('$lib/server/route-utils.js', () => ({
	RouteUtils: {
		createRouteHandler: vi.fn((handler, options) => {
			// Mock the createRouteHandler to directly call the handler
			return async (event) => {
				// Mock authentication
				const { requireUser } = await import('$lib/server/require-user.js');
				await requireUser(event);

				// Mock parameter validation
				if (options.requiredParams && options.requiredParams.length > 0) {
					const { id } = event.params;
					if (options.validators && options.validators.id) {
						const validation = options.validators.id(id);
						if (validation !== true) {
							return new Response(JSON.stringify({ success: false, error: validation }), {
								status: 400,
								headers: { 'Content-Type': 'application/json' }
							});
						}
					}
				}

				// Mock body parsing for POST requests
				let parsedBody = null;
				if (
					options.requiredBody &&
					options.requiredBody.length > 0 &&
					event.request.method === 'POST'
				) {
					try {
						parsedBody = await event.request.json();
					} catch (error) {
						return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}

				// Call the handler with the appropriate parameters
				if (options.requiredBody && options.requiredBody.length > 0) {
					return await handler(event, parsedBody);
				} else {
					return await handler(event);
				}
			};
		}),
		createErrorResponse: vi.fn((message, options = {}) => {
			return new Response(JSON.stringify({ success: false, error: message }), {
				status: options.status || 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}),
		parseInteger: vi.fn((value, paramName, options = {}) => {
			const { min, max } = options;

			if (!value) {
				return `Missing required parameter: ${paramName}`;
			}

			const parsed = parseInt(value, 10);
			if (isNaN(parsed)) {
				return `Invalid ${paramName}: must be a number`;
			}

			if (min !== undefined && parsed < min) {
				return `Invalid ${paramName}: must be at least ${min}`;
			}

			if (max !== undefined && parsed > max) {
				return `Invalid ${paramName}: must be at most ${max}`;
			}

			return parsed;
		})
	}
}));

vi.mock('@sveltejs/kit', () => ({
	json: vi.fn(
		(data, options) =>
			new Response(JSON.stringify(data), {
				headers: { 'Content-Type': 'application/json' },
				...options
			})
	)
}));

// Import the mocked functions
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement,
	listCreditCards,
	updateStatementCreditCard,
	updateStatementDate
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/statements/[id]/parse API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock event object
		mockEvent = {
			params: { id: '1' },
			request: {
				method: 'GET',
				json: vi.fn()
			}
		};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});

	describe('GET endpoint', () => {
		it('should return statement details', async () => {
			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf'
			};
			getStatement.mockResolvedValue(mockStatement);

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(200);
			expect(result.success).toBe(true);
			expect(result.statement).toBeDefined();
			expect(result.statement.id).toBe(1);
			expect(result.statement.filename).toBe('statement.pdf');
			expect(result.statement.r2_key).toBe('statements/1/test.pdf');
		});

		it('should return 400 for invalid statement ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid statement ID');
		});

		it('should return 404 for statement not found', async () => {
			getStatement.mockResolvedValue(null);

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.error).toBe('Statement not found');
		});
	});

	describe('POST endpoint', () => {
		it('should successfully process parsed data and create payments', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf'
			};
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue();
			createPayment.mockResolvedValue();
			listCreditCards.mockResolvedValue([{ id: 1, name: 'Chase Freedom', last4: '1234' }]);

			// Mock the request body with parsed data
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					last4: '1234',
					statement_date: '2024-01-15',
					charges: [
						{
							merchant: 'Test Store',
							amount: 100.5,
							date: '2024-01-10',
							allocated_to: 'Both'
						},
						{
							merchant: 'Grocery Store',
							amount: 75.25,
							date: '2024-01-12',
							allocated_to: 'Both'
						}
					]
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(getStatement).toHaveBeenCalledWith(mockEvent, 1);
			expect(deletePaymentsForStatement).toHaveBeenCalledWith(mockEvent, 1);
			expect(createPayment).toHaveBeenCalledTimes(2);
			expect(result.success).toBe(true);
			expect(result.charges_found).toBe(2);
		});

		it('should return 400 when no parsed data is provided', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf'
			};
			getStatement.mockResolvedValue(mockStatement);

			// Mock empty request body
			mockEvent.request.json.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('No parsed data provided');
		});

		it('should handle errors when deleting existing payments', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf'
			};
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockRejectedValue(new Error('Delete error'));

			// Mock the request body
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					last4: '1234',
					charges: []
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to process parsed data: Delete error');
		});

		it('should return 400 for invalid statement ID', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			mockEvent.params.id = 'invalid';

			// Mock request body for this test
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					last4: '1234',
					charges: []
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid statement ID');
		});

		it('should return 404 for statement not found', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			getStatement.mockResolvedValue(null);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(404);
			expect(result.error).toBe('Statement not found');
		});

		it('should identify credit card from parsed data', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf',
				credit_card_id: null
			};
			getStatement.mockResolvedValue(mockStatement);
			deletePaymentsForStatement.mockResolvedValue();
			createPayment.mockResolvedValue();
			listCreditCards.mockResolvedValue([{ id: 1, name: 'Chase Freedom', last4: '1234' }]);
			updateStatementCreditCard.mockResolvedValue();

			// Mock the request body with matching last4
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					last4: '1234',
					charges: [
						{
							merchant: 'Test Store',
							amount: 100.5,
							date: '2024-01-10',
							allocated_to: 'Both'
						}
					]
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(updateStatementCreditCard).toHaveBeenCalledWith(mockEvent, 1, 1);
			expect(result.success).toBe(true);
		});
	});
});
