import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../../src/routes/api/admin/normalize-merchants/+server.js';
import * as auth from '$lib/server/require-user.js';
import * as normalizer from '$lib/utils/merchant-normalizer.js';

vi.mock('$lib/server/require-user.js');
vi.mock('$lib/utils/merchant-normalizer.js');

describe('/api/admin/normalize-merchants', () => {
	let mockEvent;
	let mockDb;

	beforeEach(() => {
		vi.clearAllMocks();

		auth.requireUser.mockResolvedValue({ id: 1 });
		normalizer.normalizeMerchant.mockImplementation((merchant) => ({
			merchant_normalized: merchant.toUpperCase(),
			merchant_details: 'details'
		}));

		mockDb = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({
				results: [{ id: 1, merchant: 'Test Merchant', merchant_normalized: 'test merchant' }] // Mismatch to trigger update
			}),
			first: vi.fn().mockResolvedValue({ total: 100 }),
			run: vi.fn().mockResolvedValue({ changes: 1 })
		};

		mockEvent = {
			platform: {
				env: {
					CCBILLING_DB: mockDb
				}
			},
			request: {
				json: vi.fn().mockResolvedValue({}) // Default to empty object
			}
		};
	});

	describe('POST', () => {
		it('should return 401 if user is not authenticated', async () => {
			const unauthResponse = new Response(null, { status: 401 });
			auth.requireUser.mockResolvedValue(unauthResponse);
			const response = await POST(mockEvent);
			expect(response.status).toBe(401);
		});

		it('should return a 500 if the database is not available', async () => {
			mockEvent.platform.env.CCBILLING_DB = null;
			const response = await POST(mockEvent);
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Database not available');
		});

		it('should process a batch with default size and offset, including bulk updates', async () => {
			const response = await POST(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.paymentsProcessed).toBe(1);
			// Expect 1 from normalizePayments + 18 from performBulkPatternUpdates
			expect(body.paymentsUpdated).toBe(19);
		});

		it('should process a batch with specified offset, skipping bulk updates', async () => {
			mockEvent.request.json.mockResolvedValue({ batchSize: 10, offset: 20 });
			const response = await POST(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.success).toBe(true);
			expect(body.paymentsProcessed).toBe(1);
			// Bulk updates are skipped for offset > 0, so only 1 update is expected
			expect(body.paymentsUpdated).toBe(1);
			expect(body.nextOffset).toBe(30);
		});

		it('should handle errors during normalization', async () => {
			mockDb.prepare.mockImplementation(() => {
				throw new Error('DB Error');
			});
			const response = await POST(mockEvent);
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Failed to normalize merchants');
		});
	});

	describe('GET', () => {
		it('should return 401 if user is not authenticated', async () => {
			const unauthResponse = new Response(null, { status: 401 });
			auth.requireUser.mockResolvedValue(unauthResponse);
			const response = await GET(mockEvent);
			expect(response.status).toBe(401);
		});

		it('should return a 500 if the database is not available', async () => {
			mockEvent.platform.env.CCBILLING_DB = null;
			const response = await GET(mockEvent);
			expect(response.status).toBe(500);
		});

		it('should return normalization status and statistics', async () => {
			mockDb.first.mockResolvedValue({
				total_payments: 100,
				normalized_payments: 50,
				processed_payments: 75,
				unique_merchants: 90,
				unique_normalized_merchants: 45,
				total_mappings: 20,
				normalized_mappings: 15
			});
			mockDb.all.mockResolvedValue({ results: [{ merchant: 'test', count: 5 }] });

			const response = await GET(mockEvent);
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.payments.total).toBe(100);
			expect(body.samples.length).toBe(1);
		});

		it('should handle errors when fetching status', async () => {
			mockDb.prepare.mockImplementation(() => {
				throw new Error('DB Error');
			});
			const response = await GET(mockEvent);
			expect(response.status).toBe(500);
			const body = await response.json();
			expect(body.error).toBe('Failed to get status');
		});
	});
});
