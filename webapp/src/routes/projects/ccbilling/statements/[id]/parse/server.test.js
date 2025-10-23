import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	createPayment: vi.fn(),
	deletePaymentsForStatement: vi.fn(),
	listCreditCards: vi.fn(),
	updateStatementCreditCard: vi.fn(),
	updateStatementDate: vi.fn(),
	getBillingCycle: vi.fn(),
	getBudgetByMerchant: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

vi.mock('$lib/server/route-utils.js', () => {
	// Create a simpler mock that doesn't use dynamic imports
	return {
		RouteUtils: {
			createRouteHandler: vi.fn((handler, options) => {
				// Mock the createRouteHandler to directly call the handler
				return async (event) => {
					// Don't call requireUser here - let the tests mock it themselves
					// This avoids dynamic import issues
					
					// Mock parameter validation
					if (options?.requiredParams && options.requiredParams.length > 0) {
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
						options?.requiredBody &&
						options.requiredBody.length > 0 &&
						event.request?.method === 'POST'
					) {
						try {
							parsedBody = await event.request.json();
						} catch (error) {
							console.error('Error parsing request body:', error);
							return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), {
								status: 400,
								headers: { 'Content-Type': 'application/json' }
							});
						}
					}

					// Call the handler with the appropriate parameters
					if (options?.requiredBody && options.requiredBody.length > 0) {
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
	json: vi.fn((data, options) => {
		const responseBody = JSON.stringify(data);
		const response = new Response(responseBody, {
			headers: { 'Content-Type': 'application/json' },
			status: options?.status || 200,
			...options
		});
		response.json = vi.fn().mockResolvedValue(data);
		return response;
	})
}));

// Import the mocked functions
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement,
	listCreditCards,
	updateStatementCreditCard,
	getBillingCycle,
	getBudgetByMerchant
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
	});describe('GET endpoint', () => {
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
				r2_key: 'statements/1/test.pdf',
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);
			deletePaymentsForStatement.mockResolvedValue();
			createPayment.mockResolvedValue();
			listCreditCards.mockResolvedValue([{ id: 1, name: 'Chase Freedom', last4: '1234' }]);
			getBudgetByMerchant.mockResolvedValue(null);

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
				r2_key: 'statements/1/test.pdf',
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);

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
				r2_key: 'statements/1/test.pdf',
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);
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
				credit_card_id: null,
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);
			deletePaymentsForStatement.mockResolvedValue();
			createPayment.mockResolvedValue();
			listCreditCards.mockResolvedValue([{ id: 1, name: 'Chase Freedom', last4: '1234' }]);
			getBudgetByMerchant.mockResolvedValue({ id: 9, name: 'Both' });
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

		it('should correct year for MM/DD format transaction dates', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf',
				credit_card_id: null,
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);
			deletePaymentsForStatement.mockResolvedValue();
			createPayment.mockResolvedValue();
			listCreditCards.mockResolvedValue([{ id: 1, name: 'Chase Freedom', last4: '1234' }]);
			updateStatementCreditCard.mockResolvedValue();

			// Mock the request body with MM/DD format dates
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					last4: '1234',
					charges: [
						{
							merchant: 'Test Store',
							amount: 100.5,
							date: '01/15', // MM/DD format without year
							allocated_to: 'Both'
						},
						{
							merchant: 'Grocery Store',
							amount: 75.25,
							date: '01/20', // MM/DD format without year
							allocated_to: 'Both'
						}
					]
				}
			});

			const response = await POST(mockEvent);
			const result = await response.json();

			// Verify that createPayment was called with corrected dates
			expect(createPayment).toHaveBeenCalledTimes(2);
			expect(createPayment).toHaveBeenCalledWith(
				mockEvent,
				1,
				'Test Store',
				100.5,
				'Both',
				'2024-01-15', // Should be corrected to include year
				false,
				null,
				null,
				null,
				null
			);
			expect(createPayment).toHaveBeenCalledWith(
				mockEvent,
				1,
				'Grocery Store',
				75.25,
				'Both',
				'2024-01-20', // Should be corrected to include year
				false,
				null,
				null,
				null,
				null
			);

			expect(result.success).toBe(true);
			expect(result.charges_found).toBe(2);
		});

		it('should return error when no matching credit card is found', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf',
				credit_card_id: null,
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);
			deletePaymentsForStatement.mockResolvedValue();
			listCreditCards.mockResolvedValue([
				{ id: 1, name: 'Chase Freedom', last4: '5678' },
				{ id: 2, name: 'Amex Gold', last4: '9012' }
			]);
			getBudgetByMerchant.mockResolvedValue(null);

			// Mock the request body with non-matching last4
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					last4: '1234', // This doesn't match any available cards
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

			expect(result.success).toBe(false);
			expect(result.error).toContain('No matching credit card found for last4: 1234');
			expect(result.error).toContain(
				'Please add a credit card with last4: 1234 before uploading this statement'
			);
			expect(response.status).toBe(400);

			// Verify that no payments were created
			expect(createPayment).not.toHaveBeenCalled();
		});

		it('should return error when no last4 data is found in parsed data', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf',
				credit_card_id: null,
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);
			deletePaymentsForStatement.mockResolvedValue();
			listCreditCards.mockResolvedValue([
				{ id: 1, name: 'Chase Freedom', last4: '5678' },
				{ id: 2, name: 'Amex Gold', last4: '9012' }
			]);
			getBudgetByMerchant.mockResolvedValue(null);

			// Mock the request body with no last4 data
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					// No last4 field
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

			expect(result.success).toBe(false);
			expect(result.error).toContain('No credit card information found in the statement');
			expect(response.status).toBe(400);

			// Verify that no payments were created
			expect(createPayment).not.toHaveBeenCalled();
		});

		it('should return error when last4 is empty string', async () => {
			// Set method to POST for this test
			mockEvent.request.method = 'POST';

			const mockStatement = {
				id: 1,
				filename: 'statement.pdf',
				r2_key: 'statements/1/test.pdf',
				credit_card_id: null,
				billing_cycle_id: 1
			};
			const mockBillingCycle = {
				id: 1,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
			};
			getStatement.mockResolvedValue(mockStatement);
			getBillingCycle.mockResolvedValue(mockBillingCycle);
			deletePaymentsForStatement.mockResolvedValue();
			listCreditCards.mockResolvedValue([
				{ id: 1, name: 'Chase Freedom', last4: '5678' },
				{ id: 2, name: 'Amex Gold', last4: '9012' }
			]);

			// Mock the request body with empty last4
			mockEvent.request.json.mockResolvedValue({
				parsedData: {
					last4: '', // Empty string
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

			expect(result.success).toBe(false);
			expect(result.error).toContain('No credit card information found in the statement');
			expect(response.status).toBe(400);

			// Verify that no payments were created
			expect(createPayment).not.toHaveBeenCalled();
		});
	});
});
