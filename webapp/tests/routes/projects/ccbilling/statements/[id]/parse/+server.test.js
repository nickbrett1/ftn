import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../../../../../../src/routes/projects/ccbilling/statements/[id]/parse/+server.js';
import * as db from '../../../../../../../src/lib/server/ccbilling-db.js';

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
			parseInteger: vi.fn((val) => Number.parseInt(val))
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
			db.getStatement.mockResolvedValue(null);
			const event = { params: { id: '1' } };

			const result = await GET(event);

			expect(result).toEqual({ status: 404, body: { error: 'Statement not found' } });
			expect(db.getStatement).toHaveBeenCalledWith(event, 1);
		});

		it('returns statement details successfully', async () => {
			const mockStatement = { id: 1, filename: 'test.pdf', r2_key: 'test_key' };
			db.getStatement.mockResolvedValue(mockStatement);
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
			db.getStatement.mockResolvedValue(null);
			const result = await POST(mockEvent(1, {}));
			expect(result.status).toBe(404);
		});

		it('returns 404 if billing cycle not found', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			db.getBillingCycle.mockResolvedValue(null);

			const result = await POST(mockEvent(1, {}));
			expect(result.status).toBe(404);
		});

		it('returns 400 if parsedData is not provided', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			db.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });

			// Omit parsedData to trigger the error
			const event = { params: { id: '1' }, locals: { parsedBody: {} } };
			const result = await POST(event);
			expect(result.status).toBe(400);
		});

		it('handles missing credit card gracefully (400 error)', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			db.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			db.listCreditCards.mockResolvedValue([]);

			const parsedData = { last4: '1234', card_name: 'Test Card' };
			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(400);
			expect(result.body.success).toBe(false);
			expect(result.body.error).toContain('No matching credit card found');
		});

		it('identifies credit card by last4 and processes charges', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			db.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			db.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			db.deletePaymentsForStatement.mockResolvedValue(true);
			db.updateStatementCreditCard.mockResolvedValue(true);
			db.updateStatementDate.mockResolvedValue(true);
			db.createPayment.mockResolvedValue(true);
			db.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '1234',
				card_name: '',
				statement_date: '2023-01-31',
				charges: [
					{ merchant: 'Test Merchant', amount: 10.5, date: '01/15' }
				]
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(result.body.success).toBe(true);
			expect(result.body.charges_found).toBe(1);

			// Verify DB calls
			expect(db.deletePaymentsForStatement).toHaveBeenCalledWith(expect.anything(), 1);
			expect(db.updateStatementCreditCard).toHaveBeenCalledWith(expect.anything(), 1, 5);
			expect(db.updateStatementDate).toHaveBeenCalledWith(expect.anything(), 1, '2023-01-31');
			expect(db.createPayment).toHaveBeenCalledTimes(1);
		});

		it('identifies credit card by name if last4 is missing', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: null });
			db.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			db.listCreditCards.mockResolvedValue([{ id: 6, name: 'Bilt Mastercard', last4: '9999' }]);
			db.deletePaymentsForStatement.mockResolvedValue(true);
			db.updateStatementCreditCard.mockResolvedValue(true);
			db.getBudgetByMerchant.mockResolvedValue(null);

			const parsedData = {
				last4: '',
				card_name: 'Bilt Mastercard',
				charges: []
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(db.updateStatementCreditCard).toHaveBeenCalledWith(expect.anything(), 1, 6);
		});

		it('returns 500 if deleting payments throws an error', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			db.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			db.deletePaymentsForStatement.mockRejectedValue(new Error('DB error'));

			const result = await POST(mockEvent(1, { charges: [] }));

			expect(result.status).toBe(500);
			expect(result.body.success).toBe(false);
		});

		it('correctly handles transaction date year parsing logic across years', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10 });
			db.getBillingCycle.mockResolvedValue({ start_date: '2022-12-15', end_date: '2023-01-14' }); // Cross year billing cycle
			db.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			db.deletePaymentsForStatement.mockResolvedValue(true);
			db.updateStatementCreditCard.mockResolvedValue(true);
			db.getBudgetByMerchant.mockResolvedValue(null);
			db.createPayment.mockResolvedValue(true);

			const parsedData = {
				last4: '1234',
				charges: [
					{ merchant: 'Dec Merchant', amount: 10, date: '12/20' }, // Previous year
					{ merchant: 'Jan Merchant', amount: 20, date: '01/05' }  // Current year
				]
			};

			const result = await POST(mockEvent(1, parsedData));

			expect(result.status).toBe(200);
			expect(db.createPayment).toHaveBeenCalledTimes(2);

			// First call args
			const call1 = db.createPayment.mock.calls[0][1];
			// Check the payment object to match the actual db argument structure
			expect(call1.transaction_date).toBe('2022-12-20');

			// Second call args
			const call2 = db.createPayment.mock.calls[1][1];
			expect(call2.transaction_date).toBe('2023-01-05');
		});

		it('extracts billing cycle and card info from charges correctly', async () => {
			db.getStatement.mockResolvedValue({ id: 1, billing_cycle_id: 10, credit_card_id: 5 });
			db.getBillingCycle.mockResolvedValue({ start_date: '2023-01-01', end_date: '2023-01-31' });
			db.listCreditCards.mockResolvedValue([{ id: 5, name: 'Chase', last4: '1234' }]);
			db.deletePaymentsForStatement.mockResolvedValue(true);
			db.updateStatementCreditCard.mockResolvedValue(true);
			db.getBudgetByMerchant.mockResolvedValue(null);
			db.createPayment.mockResolvedValue(true);

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
	});
});
