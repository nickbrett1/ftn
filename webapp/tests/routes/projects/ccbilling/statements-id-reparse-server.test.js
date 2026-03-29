import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../../../../src/routes/projects/ccbilling/statements/[id]/reparse/+server.js';
import { getStatement, getPaymentsForStatement, updatePaymentMerchantFields } from '../../../../src/lib/server/ccbilling-db.js';
import { RouteUtils } from '../../../../src/lib/server/route-utils.js';

vi.mock('../../../../src/lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	getPaymentsForStatement: vi.fn(),
	updatePaymentMerchantFields: vi.fn()
}));

vi.mock('../../../../src/lib/server/route-utils.js', () => {
	return {
		RouteUtils: {
			createRouteHandler: (handler) => {
				return async (event) => {
					// Extract parsedBody from event.locals if present
					let parsedBody = event.locals?.parsedBody;
					if (!parsedBody && event.request) {
						try {
							parsedBody = await event.request.json();
						} catch (e) {
							// Ignore
						}
					}
					return handler(event, parsedBody || {});
				};
			},
			createErrorResponse: (message, options) => {
				return new Response(JSON.stringify({ error: message }), {
					status: options?.status || 500,
					headers: { 'Content-Type': 'application/json' }
				});
			},
			parseInteger: (val, name, options) => {
				const num = Number.parseInt(val);
				if (Number.isNaN(num)) return `Invalid ${name}`;
				if (options?.min && num < options.min) return `Invalid ${name}`;
				return num;
			}
		}
	};
});

describe('PATCH /projects/ccbilling/statements/[id]/reparse', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 404 if statement not found', async () => {
		getStatement.mockResolvedValue(null);

		const event = {
			params: { id: '1' },
			locals: { parsedBody: { parsedData: { charges: [] } } }
		};

		const response = await PATCH(event);
		expect(response.status).toBe(404);
		const data = await response.json();
		expect(data.error).toBe('Statement not found');
	});

	it('should return 400 if no parsedData provided', async () => {
		getStatement.mockResolvedValue({ id: 1, filename: 'test.pdf' });

		const event = {
			params: { id: '1' },
			locals: { parsedBody: {} } // completely missing parsedData
		};

		const response = await PATCH(event);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('No parsed charges provided');
	});

	it('should return 400 if no parsed charges provided', async () => {
		getStatement.mockResolvedValue({ id: 1, filename: 'test.pdf' });

		const event = {
			params: { id: '1' },
			locals: { parsedBody: { parsedData: {} } } // missing parsedData.charges
		};

		const response = await PATCH(event);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('No parsed charges provided');
	});

	it('should return 400 if counts do not match', async () => {
		getStatement.mockResolvedValue({ id: 1, filename: 'test.pdf' });
		getPaymentsForStatement.mockResolvedValue([{ id: 1, amount: 10 }]);

		const event = {
			params: { id: '1' },
			locals: {
				parsedBody: {
					parsedData: {
						charges: [{ amount: 10 }, { amount: 20 }] // 2 charges vs 1 in DB
					}
				}
			}
		};

		const response = await PATCH(event);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.success).toBe(false);
		expect(data.error).toContain('Structural changes detected');
	});

	it('should return 400 if amounts cannot be matched', async () => {
		getStatement.mockResolvedValue({ id: 1, filename: 'test.pdf' });
		getPaymentsForStatement.mockResolvedValue([{ id: 1, amount: 10 }]);

		const event = {
			params: { id: '1' },
			locals: {
				parsedBody: {
					parsedData: {
						charges: [{ amount: 20 }] // Different amount
					}
				}
			}
		};

		const response = await PATCH(event);
		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.success).toBe(false);
		expect(data.error).toContain('Could not match parsed charges');
		expect(data.details.missing_charges).toHaveLength(1);
		expect(data.details.extra_charges).toHaveLength(1);
	});

	it('should successfully update merchant info when amounts match', async () => {
		getStatement.mockResolvedValue({ id: 1, filename: 'test.pdf' });
		getPaymentsForStatement.mockResolvedValue([
			{ id: 1, amount: 10, merchant: 'Old Name', transaction_date: '2023-01-01' }
		]);
		updatePaymentMerchantFields.mockResolvedValue(true);

		const event = {
			params: { id: '1' },
			locals: {
				parsedBody: {
					parsedData: {
						charges: [
							{
								amount: 10,
								merchant: 'New Name',
								merchant_normalized: 'new name norm',
								is_foreign_currency: true,
								foreign_currency_amount: 5,
								foreign_currency_type: 'EUR',
								flight_details: { dest: 'JFK' },
								amazon_order_id: '123'
							}
						]
					}
				}
			}
		};

		const response = await PATCH(event);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.updateCount).toBe(1);
		expect(data.changes).toHaveLength(1);
		expect(data.changes[0].oldMerchant).toBe('Old Name');
		expect(data.changes[0].newMerchant).toBe('New Name');

		expect(updatePaymentMerchantFields).toHaveBeenCalledWith(event, 1, {
			merchant: 'New Name',
			merchant_normalized: 'new name norm',
			is_foreign_currency: true,
			foreign_currency_amount: 5,
			foreign_currency_type: 'EUR',
			flight_details: JSON.stringify({ dest: 'JFK' }),
			amazon_order_id: '123'
		});
	});

	it('should successfully update merchant info with missing optional fields', async () => {
		getStatement.mockResolvedValue({ id: 1, filename: 'test.pdf' });
		getPaymentsForStatement.mockResolvedValue([
			{ id: 1, amount: 10, merchant: 'Old Name', transaction_date: '2023-01-01' }
		]);
		updatePaymentMerchantFields.mockResolvedValue(true);

		const event = {
			params: { id: '1' },
			locals: {
				parsedBody: {
					parsedData: {
						charges: [
							{
								amount: 10,
								merchant: 'New Name'
								// missing flight_details, etc
							}
						]
					}
				}
			}
		};

		const response = await PATCH(event);
		expect(response.status).toBe(200);

		expect(updatePaymentMerchantFields).toHaveBeenCalledWith(event, 1, {
			merchant: 'New Name',
			merchant_normalized: null,
			is_foreign_currency: false,
			foreign_currency_amount: null,
			foreign_currency_type: null,
			flight_details: null,
			amazon_order_id: null
		});
	});

	it('should not update if merchant name has not changed', async () => {
		getStatement.mockResolvedValue({ id: 1, filename: 'test.pdf' });
		getPaymentsForStatement.mockResolvedValue([
			{ id: 1, amount: 10, merchant: 'Same Name', transaction_date: '2023-01-01' }
		]);

		const event = {
			params: { id: '1' },
			locals: {
				parsedBody: {
					parsedData: {
						charges: [
							{
								amount: 10,
								merchant: 'Same Name'
							}
						]
					}
				}
			}
		};

		const response = await PATCH(event);
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.updateCount).toBe(0);
		expect(data.changes).toHaveLength(0);

		expect(updatePaymentMerchantFields).not.toHaveBeenCalled();
	});
});

describe('PATCH /projects/ccbilling/statements/[id]/reparse validators', () => {
	it('should test RouteUtils validators fallback directly', async () => {
		// Import the module dynamically to get access to the registered validators
		const { PATCH } = await import('../../../../src/routes/projects/ccbilling/statements/[id]/reparse/+server.js');

		// The mock of RouteUtils doesn't expose the validators array directly.
		// So this test is just ensuring the file parses cleanly.
		expect(PATCH).toBeDefined();
	});
});
