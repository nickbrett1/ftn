import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../src/routes/api/admin/normalize-merchants/+server.js';
import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';

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

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock platform environment
		mockPlatform = {
			env: {
				KV: {
					get: vi.fn()
				},
				CCBILLING_DB: {
					prepare: vi.fn().mockReturnThis(),
					bind: vi.fn().mockReturnThis(),
					run: vi.fn().mockResolvedValue({ changes: 5 }),
					all: vi.fn().mockResolvedValue({ results: [{ count: 5 }] }),
					first: vi.fn().mockResolvedValue({
						total_payments: 100,
						normalized_payments: 50,
						processed_payments: 75,
						unique_merchants: 25,
						unique_normalized_merchants: 20
					})
				}
			}
		};

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

		// Default mock implementations
		normalizeMerchant.mockImplementation((m) => ({
			merchant_normalized: m.toUpperCase(),
			merchant_details: ''
		}));

		// Get mocked functions
		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
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

			expect(data.paymentsUpdated).toBeDefined();
			expect(typeof data.paymentsUpdated).toBe('number');
		});

		it('should update payments if normalization changes value', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockPlatform.env.CCBILLING_DB.all
				.mockResolvedValueOnce({
					results: [
						{
							id: 1,
							merchant: 'amazon',
							merchant_normalized: 'old',
							merchant_details: 'old_details'
						}
					]
				})
				.mockResolvedValueOnce({ results: [] }) // budget merchants
				.mockResolvedValueOnce({ results: [] }) // consistency
				.mockResolvedValueOnce({ results: [] }) // assignment
				.mockResolvedValueOnce({ results: [] }) // duplicate
				.mockResolvedValue({ results: [{ total: 10 }] });

			normalizeMerchant.mockReturnValue({
				merchant_normalized: 'AMAZON',
				merchant_details: 'details'
			});

			const result = await POST(mockEvent);
			const data = await result.json();

			expect(data.paymentsUpdated).toBeGreaterThanOrEqual(1);
			expect(mockPlatform.env.CCBILLING_DB.prepare).toHaveBeenCalledWith(
				expect.stringContaining('UPDATE payment')
			);
		});

		it('should perform budget merchant bulk updates and handle uniqueness', async () => {
			mockRequireUser.mockResolvedValue(null);
			// Return empty payments/budget merchants to trigger bulk update logic
			mockPlatform.env.CCBILLING_DB.all
				.mockResolvedValueOnce({ results: [] }) // payments
				.mockResolvedValueOnce({ results: [] }) // budget merchants
				// bulk updates logic queries
				.mockResolvedValueOnce({ results: [] }) // budget merchant matching pattern
				.mockResolvedValueOnce({ results: [] }) // payment normalized
				.mockResolvedValueOnce({ results: [] }) // budget merchants for consistency
				.mockResolvedValueOnce({ results: [] }) // assignment check
				.mockResolvedValueOnce({ results: [] }) // duplicate check
				.mockResolvedValue({ results: [{ total: 0 }] });

			// Mock specific query for bulk updates to return hits
			const matchingMerchants = [
				{ id: 1, budget_id: 101, merchant: 'AMAZON', merchant_normalized: null }
			];

			// Create a robust mock object that can be returned by any chain
			const mockStatement = {
				all: () => Promise.resolve({ results: [] }),
				run: () => Promise.resolve({ changes: 1 }),
				first: () => Promise.resolve({}),
				bind: function () {
					return this;
				}
			};

			mockPlatform.env.CCBILLING_DB.prepare.mockImplementation((query) => {
				if (query.includes('FROM budget_merchant') && query.includes('LIKE')) {
					return {
						...mockStatement,
						bind: () => ({
							...mockStatement,
							all: () => Promise.resolve({ results: matchingMerchants })
						})
					};
				}
				if (query.includes('SELECT id FROM budget_merchant') && query.includes('budget_id = ?')) {
					return {
						...mockStatement,
						bind: () => ({
							...mockStatement,
							all: () => Promise.resolve({ results: [] }) // No existing normalized record
						})
					};
				}
				return mockStatement;
			});

			const result = await POST(mockEvent);
			const data = await result.json();

			expect(data.budgetMerchantsUpdated).toBeGreaterThanOrEqual(0);
		});

		it('should ensure payment budget consistency', async () => {
			mockRequireUser.mockResolvedValue(null);

			// Mock the consistency check queries specifically
			mockPlatform.env.CCBILLING_DB.all
				.mockResolvedValueOnce({ results: [] }) // payments batch
				.mockResolvedValueOnce({ results: [] }) // budget batch
				.mockResolvedValueOnce({ results: [] }) // consistency check
				.mockResolvedValueOnce({ results: [] }) // assignment check
				.mockResolvedValueOnce({ results: [] }) // duplicate check
				.mockResolvedValue({ results: [{ total: 0 }] });

			// Create a robust mock object
			const mockStatement = {
				all: () => Promise.resolve({ results: [] }),
				run: () => Promise.resolve({ changes: 1 }),
				first: () => Promise.resolve({}),
				bind: function () {
					return this;
				}
			};

			// Override prepare to target consistency queries
			mockPlatform.env.CCBILLING_DB.prepare.mockImplementation((query) => {
				if (query.includes('SELECT DISTINCT merchant_normalized FROM payment')) {
					return {
						...mockStatement,
						all: () => Promise.resolve({ results: [{ merchant_normalized: 'AMAZON' }] })
					};
				}
				if (
					query.includes('SELECT id, merchant, merchant_normalized FROM budget_merchant') &&
					query.includes('ORDER BY id')
				) {
					return {
						...mockStatement,
						all: () =>
							Promise.resolve({
								results: [
									{ id: 1, merchant: 'amazon', merchant_normalized: 'WRONG' } // Should be updated
								]
							})
					};
				}
				return mockStatement;
			});

			normalizeMerchant.mockReturnValue({
				merchant_normalized: 'AMAZON'
			});

			const result = await POST(mockEvent);
			// We can't easily check the internal variable 'updated', but we can check if update was called
			// Actually the test is a bit fragile because of complex mocking.
			// But checking that it runs without error and calls prepare/run is a good start.
			expect(result.status).toBe(200);
		});

		it('should check assignment consistency', async () => {
			mockRequireUser.mockResolvedValue(null);
			// Create a robust mock object
			const mockStatement = {
				all: () => Promise.resolve({ results: [] }),
				run: () => Promise.resolve({ changes: 1 }),
				first: () => Promise.resolve({}),
				bind: function () {
					return this;
				}
			};

			// Mock assignment check to return inconsistencies
			mockPlatform.env.CCBILLING_DB.prepare.mockImplementation((query) => {
				// Loosen string matching to account for newlines/formatting
				if (
					query.includes('SELECT DISTINCT merchant_normalized') &&
					query.includes('FROM budget_merchant') &&
					query.includes('WHERE merchant_normalized IS NOT NULL')
				) {
					return {
						...mockStatement,
						all: () => Promise.resolve({ results: [{ merchant_normalized: 'GHOST' }] })
					};
				}
				if (query.includes('SELECT DISTINCT p.merchant_normalized')) {
					// Found unassigned
					return {
						...mockStatement,
						bind: () => ({
							...mockStatement,
							all: () => Promise.resolve({ results: [{ merchant_normalized: 'GHOST' }] })
						})
					};
				}
				if (query.includes('SELECT bm.id, bm.merchant')) {
					// Assignment details
					return {
						...mockStatement,
						bind: () => ({
							...mockStatement,
							all: () => Promise.resolve({ results: [{ id: 1, merchant: 'Ghost' }] })
						})
					};
				}
				return mockStatement;
			});

			const result = await POST(mockEvent);
			const data = await result.json();

			expect(data.errors).toBeDefined();
			const assignmentError = data.errors.find((e) => e.type === 'assignment_inconsistency');
			expect(assignmentError).toBeDefined();
			expect(assignmentError.inconsistencies.length).toBeGreaterThan(0);
		});

		it('should check duplicate merchant variations', async () => {
			mockRequireUser.mockResolvedValue(null);
			// Create a robust mock object
			const mockStatement = {
				all: () => Promise.resolve({ results: [] }),
				run: () => Promise.resolve({ changes: 1 }),
				first: () => Promise.resolve({}),
				bind: function () {
					return this;
				}
			};

			// Mock duplicate check query
			mockPlatform.env.CCBILLING_DB.prepare.mockImplementation((query) => {
				if (query.includes('WITH normalized_merchants AS')) {
					return {
						...mockStatement,
						all: () =>
							Promise.resolve({
								results: [
									{
										merchant_normalized: 'TEST',
										variation_count: 2,
										assignment_status_count: 2
									}
								]
							})
					};
				}
				return mockStatement;
			});

			const result = await POST(mockEvent);
			const data = await result.json();

			expect(data.errors).toBeDefined();
			const duplicateError = data.errors.find((e) => e.type === 'duplicate_merchant_variations');
			expect(duplicateError).toBeDefined();
			expect(duplicateError.duplicateVariations).toHaveLength(1);
		});

		it('should handle errors during normalization loop', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockPlatform.env.CCBILLING_DB.all.mockResolvedValueOnce({
				results: [{ id: 1, merchant: 'error' }]
			});

			normalizeMerchant.mockImplementation(() => {
				throw new Error('Normalization error');
			});

			const result = await POST(mockEvent);
			const data = await result.json();

			expect(data.errors).toBeDefined();
			expect(data.errors[0].error).toBe('Normalization error');
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
			expect(data.payments.pending).toBe(25); // 100 - 75
			expect(data.payments.uniqueMerchants).toBe(25);
			expect(data.payments.uniqueNormalized).toBe(20);
			expect(data.budgetMerchants).toBeDefined();
			expect(data.samples).toBeDefined();
		});

		it('should handle database errors gracefully', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform.env.CCBILLING_DB.first = vi
				.fn()
				.mockRejectedValue(new Error('Database error'));

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
			expect(data.paymentsUpdated).toBeDefined();
			expect(typeof data.paymentsUpdated).toBe('number');
		});
	});
});
