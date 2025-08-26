import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../src/routes/api/admin/normalize-merchants/+server.js';

// Mock the requireUser function
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

// Mock the merchant normalizer
vi.mock('$lib/utils/merchant-normalizer.js', () => ({
	normalizeMerchant: vi.fn()
}));

describe('Merchant Normalization API', () => {
	let mockEvent;
	let mockPlatform;
	let mockRequireUser;
	let mockNormalizeMerchant;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock platform environment
		mockPlatform = {
			env: {
				KV: {
					get: vi.fn()
				},
				CCBILLING_DB: {
					prepare: vi.fn()
				}
			}
		};

		// Mock database operations
		const mockDb = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockResolvedValue({ changes: 5 }),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue({ 
				total_payments: 100,
				normalized_payments: 50,
				processed_payments: 75,
				unique_merchants: 25,
				unique_normalized_merchants: 20
			})
		};

		mockPlatform.env.CCBILLING_DB = mockDb;

		// Mock event object
		mockEvent = {
			platform: mockPlatform,
			cookies: {
				get: vi.fn()
			},
			request: {
				headers: {
					get: vi.fn()
				},
				json: vi.fn().mockResolvedValue({ offset: 0 })
			},
			depends: vi.fn()
		};

		// Get mocked functions
		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
		mockNormalizeMerchant = (await import('$lib/utils/merchant-normalizer.js')).normalizeMerchant;
	});

	describe('POST endpoint', () => {
		it('should require authentication', async () => {
			const authResponse = new Response('Not authenticated', { status: 401 });
			mockRequireUser.mockResolvedValue(authResponse);

			const result = await POST(mockEvent);
			expect(result.status).toBe(401);
		});

		it('should return error when database is not available', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform = null;

			const result = await POST(mockEvent);
			const data = await result.json();
			
			expect(result.status).toBe(500);
			expect(data.error).toBe('Database not available');
		});

		it('should process bulk pattern updates when offset is 0', async () => {
			mockRequireUser.mockResolvedValue(null);

			const result = await POST(mockEvent);
			const data = await result.json();
			
			expect(data.paymentsUpdated).toBeGreaterThan(0);
			expect(data.errors).toBeDefined();
		});

		it('should handle individual payment processing when offset > 0', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.request.json = vi.fn().mockResolvedValue({ offset: 100, batchSize: 25 });

			// Mock payments data
			const mockPayments = [
				{ id: 1, merchant: 'AMAZON.COM*123' },
				{ id: 2, merchant: 'STARBUCKS' }
			];

			mockEvent.platform.env.CCBILLING_DB.all = vi.fn()
				.mockResolvedValueOnce({ results: mockPayments })
				.mockResolvedValueOnce({ results: [{ total: 50 }] });

			mockNormalizeMerchant.mockReturnValue({
				merchant_normalized: 'AMAZON',
				merchant_details: ''
			});

			const result = await POST(mockEvent);
			const data = await result.json();
			
			expect(data.paymentsUpdated).toBeDefined();
		});
	});

	describe('GET endpoint', () => {
		it('should require authentication', async () => {
			const authResponse = new Response('Not authenticated', { status: 401 });
			mockRequireUser.mockResolvedValue(authResponse);

			const result = await GET(mockEvent);
			expect(result.status).toBe(401);
		});

		it('should return error when database is not available', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform = null;

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(result.status).toBe(500);
			expect(data.error).toBe('Database not available');
		});

		it('should return normalization status when successful', async () => {
			mockRequireUser.mockResolvedValue(null);

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(data.payments).toBeDefined();
			expect(data.payments.total).toBe(100);
			expect(data.payments.normalized).toBe(50);
			expect(data.payments.processed).toBe(75);
			expect(data.payments.pending).toBe(25); // 100 - 75
			expect(data.budgetMerchants).toBeDefined();
			expect(data.samples).toBeDefined();
		});

		it('should handle database errors gracefully', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform.env.CCBILLING_DB.first = vi.fn().mockRejectedValue(new Error('Database error'));

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(result.status).toBe(500);
			expect(data.error).toBe('Failed to get status');
			expect(data.details).toBe('Database error');
		});
	});

	describe('Bulk pattern updates', () => {
		it('should process all merchant patterns', async () => {
			mockRequireUser.mockResolvedValue(null);

			const result = await POST(mockEvent);
			const data = await result.json();
			
			// Should have processed some payments
			expect(data.paymentsUpdated).toBeGreaterThan(0);
		});

		it('should handle SQL errors in pattern updates', async () => {
			mockRequireUser.mockResolvedValue(null);
			
			// Mock a database error for one of the patterns
			mockEvent.platform.env.CCBILLING_DB.run = vi.fn()
				.mockResolvedValueOnce({ changes: 5 })
				.mockRejectedValueOnce(new Error('SQL syntax error'));

			const result = await POST(mockEvent);
			const data = await result.json();
			
			expect(data.errors).toBeDefined();
			expect(data.errors.length).toBeGreaterThan(0);
			expect(data.errors[0].type).toBe('bulk_update');
		});
	});
});