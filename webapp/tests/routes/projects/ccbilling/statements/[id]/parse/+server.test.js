import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	GET,
	POST
} from '../../../../../../../src/routes/projects/ccbilling/statements/[id]/parse/+server.js';
import * as database from '../../../../../../../src/lib/server/ccbilling-db.js';

// Mock RouteUtils so we can test the handlers directly
vi.mock('../../../../../../../src/lib/server/route-utils.js', () => {
	return {
		RouteUtils: {
			createRouteHandler: vi.fn((handler, options) => {
				return async (event) => {
					// Extract parsedBody from event.locals
					const parsedBody = event.locals?.parsedBody || {};
					return handler(event, parsedBody);
				};
			}),
			createErrorResponse: vi.fn((message, options) => {
				return { status: options.status, body: { error: message } };
			}),
			parseInteger: vi.fn((value) => Number.parseInt(value))
		}
	};
});

vi.mock('../../../../../../../src/lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	getBillingCycle: vi.fn(),
	deletePaymentsForStatement: vi.fn(),
	listCreditCards: vi.fn(),
	updateStatementCreditCard: vi.fn(),
	updateStatementDate: vi.fn(),
	createPayment: vi.fn(),
	getBudgetByMerchant: vi.fn()
}));

vi.mock('../../../../../../../src/lib/utils/merchant-normalizer.js', () => ({
	normalizeMerchant: vi.fn((m) => m)
}));

vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, options) => ({ body: data, status: options?.status || 200 }))
}));

describe('ccbilling/statements/[id]/parse/+server.js', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET', () => {
		it('returns 404 if statement is not found', async () => {
			database.getStatement.mockResolvedValue(null);
			const event = { params: { id: '1' } };

			const result = await GET(event);

			expect(result).toEqual({ status: 404, body: { error: 'Statement not found' } });
			expect(database.getStatement).toHaveBeenCalledWith(event, 1);
		});

		it('returns statement details successfully', async () => {
			const mockStatement = { id: 1, filename: 'test.pdf', r2_key: 'test_key' };
			database.getStatement.mockResolvedValue(mockStatement);
			const event = { params: { id: '1' } };

			const result = await GET(event);

			expect(result.status).toBe(200);
			expect(result.body).toEqual({
				success: true,
				statement: mockStatement,
				message: 'Statement details retrieved successfully'
			});
		});
	});

	describe('POST', () => {
		const mockEvent = (id, parsedData) => ({
			params: { id: id.toString() },
			locals: { parsedBody: { parsedData } }
		});

		it('returns 404 if statement not found', async () => {
			database.getStatement.mockResolvedValue(null);
			const result = await POST(mockEvent(1, {}));
			expect(result.status).toBe(404);
		});

		it('returns 404 if billing cycle not found', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue(null);

			const result = await POST(mockEvent(1, {}));
			expect(result.status).toBe(404);
		});

		it('returns 400 if parsedData is not provided', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });

			// Omit parsedData to trigger the error
			const event = { params: { id: '1' }, locals: { parsedBody: {} } };
			const result = await POST(event);
			expect(result.status).toBe(400);
		});

		it('handles missing credit card gracefully (400 error)', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([]);

			const parsedData = { last4: '1234', card_name: 'Test Card' };
			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(400);
			expect(result.body.success).toBe(false);
			expect(result.body.error).toContain('No matching credit card found');
		});

		it('handles missing credit card fully gracefully (400 error)', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([]);

			const parsedData = {};
			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(400);
			expect(result.body.success).toBe(false);
			expect(result.body.error).toContain('No credit card information found');
		});

		it('handles missing credit card with card name not matching (400 error)', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);

			const parsedData = { card_name: 'Wells Fargo' };
			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(400);
			expect(result.body.success).toBe(false);
			expect(result.body.error).toContain('No matching credit card found with name');
		});

		it('handles missing credit card fallback to default (400 error)', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);

			const parsedData = { last4: '0000' };
			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(400);
			expect(result.body.success).toBe(false);
			expect(result.body.error).toContain('Could not identify the credit card');
		});

		it('identifies credit card by last4 and processes charges', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.updateStatementDate.mockResolvedValue(true);
			database.createPayment.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '1234',
				card_name: '',
				statement_date: '2023-01-31',
				charges: [{ merchant: 'Test Merchant', amount: 10.5, date: '01/15' }]
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(result.body.success).toBe(true);
			expect(result.body.charges_found).toBe(1);

			// Verify DB calls
			expect(database.deletePaymentsForStatement).toHaveBeenCalledWith(expect.anything(), 1);
			expect(database.updateStatementCreditCard).toHaveBeenCalledWith(expect.anything(), 1, 5);
			expect(database.updateStatementDate).toHaveBeenCalledWith(expect.anything(), 1, '2023-01-31');
			expect(database.createPayment).toHaveBeenCalledTimes(1);
		});

		it('identifies credit card by name if last4 is missing', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: null });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 6, name: 'Bilt Mastercard', last4: '9999' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '',
				card_name: 'Bilt Mastercard',
				charges: []
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(database.updateStatementCreditCard).toHaveBeenCalledWith(expect.anything(), 1, 6);
		});

		it('identifies credit card by name substring match if last4 is missing', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: null });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 6, name: 'Bilt Mastercard', last4: '9999' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '',
				card_name: 'Bilt M',
				charges: []
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(database.updateStatementCreditCard).toHaveBeenCalledWith(expect.anything(), 1, 6);
		});

		it('identifies credit card by name palladium match if last4 is missing', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: null });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 6, name: 'Bilt Palladium', last4: '9999' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '',
				card_name: 'Bilt Paladium',
				charges: []
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(database.updateStatementCreditCard).toHaveBeenCalledWith(expect.anything(), 1, 6);
		});

		it('identifies credit card by name palladium reverse match if last4 is missing', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: null });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 6, name: 'Bilt Paladium', last4: '9999' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '',
				card_name: 'Bilt Palladium',
				charges: []
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(database.updateStatementCreditCard).toHaveBeenCalledWith(expect.anything(), 1, 6);
		});

		it('returns success for parsing without charges', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: null });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 6, name: 'Bilt Mastercard', last4: '9999' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '',
				card_name: 'Bilt Mastercard'
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
		});

		it('returns 500 if deleting payments throws an error', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.deletePaymentsForStatement.mockRejectedValue(new Error('DB error'));

			const result = await POST(mockEvent(1, { charges: [] }));

			expect(result.status).toBe(500);
			expect(result.body.success).toBe(false);
		});

		it('correctly handles transaction date year parsing logic across years', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2022-12-15', end_date: '2023-01-14' }); // Cross year billing cycle
			database.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);
			database.createPayment.mockResolvedValue(true);

			const parsedData = {
				last4: '1234',
				charges: [
					{ merchant: 'Dec Merchant', amount: 10, date: '12/20' }, // Previous year
					{ merchant: 'Jan Merchant', amount: 20, date: '01/05' }, // Current year
					{ merchant: 'Jan Merchant 2', amount: 20, date: '2023-01-05' }, // Handled correctly directly
					{ merchant: 'Invalid Merchant', amount: 20, date: 'invalid' } // Ignored handling
				]
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(database.createPayment).toHaveBeenCalledTimes(4);

			// First call args
			const call1 = database.createPayment.mock.calls[0][1];
			// Check the payment object to match the actual db argument structure
			expect(call1.transaction_date).toBe('2022-12-20');

			// Second call args
			const call2 = database.createPayment.mock.calls[1][1];
			expect(call2.transaction_date).toBe('2023-01-05');
		});

		it('correctly handles transaction date year parsing logic across years forwards', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-12-15', end_date: '2024-01-14' }); // Cross year billing cycle
			database.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);
			database.createPayment.mockResolvedValue(true);

			const parsedData = {
				last4: '1234',
				charges: [
					{ merchant: 'Jan Merchant', amount: 10, date: '01/05' },
					{ merchant: 'Dec Merchant', amount: 20, date: '12/20' }
				]
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(database.createPayment).toHaveBeenCalledTimes(2);

			const call1 = database.createPayment.mock.calls[0][1];
			expect(call1.transaction_date).toBe('2024-01-05');

			const call2 = database.createPayment.mock.calls[1][1];
			expect(call2.transaction_date).toBe('2023-12-20');
		});

		it('extracts billing cycle and card info from charges correctly', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: 5 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);
			database.createPayment.mockResolvedValue(true);

			const parsedData = {
				last4: '1234',
				charges: [
					{ merchant: 'M1', amount: 10, date: '2023-01-05' },
					{ merchant: 'M2', amount: 20, date: '2023-01-20' },
					{ merchant: 'M3', amount: 30, date: '2023-01-10' }
				]
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(result.body.billing_cycle).toEqual({
				start_date: '2023-01-05',
				end_date: '2023-01-20'
			});
			expect(result.body.card_info.card_type).toBe('Credit Card');
		});

		it('handles charges with empty values correctly', async () => {
			database.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: 5 });
			database.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			database.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			database.deletePaymentsForStatement.mockResolvedValue(true);
			database.updateStatementCreditCard.mockResolvedValue(true);
			database.getBudgetByMerchant.mockResolvedValue(null);
			database.createPayment.mockResolvedValue(true);

			const parsedData = {
				last4: '1234',
				charges: [{ merchant: 'M1', amount: 10, date: null }]
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(result.body.billing_cycle).toEqual({
				start_date: null,
				end_date: null
			});
			expect(result.body.card_info.card_type).toBe('Credit Card');
		});
	});
});
