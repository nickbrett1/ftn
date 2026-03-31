import { describe, it, expect, vi } from 'vitest';
import { getPayment } from '../src/lib/server/ccbilling-db.js';

describe('getPayment', () => {
	it('should include merchant_details in the query', async () => {
		const mockEvent = {
			platform: {
				env: {
					CCBILLING_DB: {
						prepare: vi.fn().mockReturnValue({
							bind: vi.fn().mockReturnValue({
								first: vi.fn().mockResolvedValue({
									id: 1,
									merchant: 'Test Merchant',
									merchant_normalized: 'TEST MERCHANT',
									merchant_details: 'Test Details',
									amount: 10,
									allocated_to: 'Food',
									transaction_date: '2023-01-01',
									is_foreign_currency: false,
									foreign_currency_amount: null,
									foreign_currency_type: null,
									flight_details: null,
									full_statement_text: 'Raw text',
									created_at: '2023-01-01T00:00:00Z',
									credit_card_id: 1,
									card_name: 'Test Card',
									last4: '1234'
								})
							})
						})
					}
				}
			}
		};

		const result = await getPayment(mockEvent, 1);

		expect(mockEvent.platform.env.CCBILLING_DB.prepare).toHaveBeenCalledWith(
			expect.stringContaining('p.merchant_details')
		);
		expect(result).toHaveProperty('merchant_details', 'Test Details');
	});
});
