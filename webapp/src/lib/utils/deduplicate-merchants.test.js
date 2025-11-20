import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../../routes/api/admin/deduplicate-merchants/+server.js';

// Mock dependencies
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

const { requireUser } = await import('$lib/server/require-user.js');

describe('/api/admin/deduplicate-merchants', () => {
	let mockDb;
	let mockEvent;

	// Sample data for mocking DB responses
	const mockDuplicatesData = [
		{
			canonical_form: 'AMAZON',
			variants: 'amazon,AMAZON',
			variant_count: 2
		}
	];

	const mockPaymentCount = { count: 10 };
	const mockBudgetCount = { count: 1 };

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock the D1 database
		mockDb = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue({ count: 0 }),
			run: vi.fn().mockResolvedValue({ meta: { changes: 1 } })
		};

		// Mock the SvelteKit event object
		mockEvent = {
			platform: {
				env: {
					CCBILLING_DB: mockDb
				}
			},
			request: {
				json: vi.fn().mockResolvedValue({})
			}
		};

		// Default to authenticated user
		requireUser.mockResolvedValue({ user: { id: 'admin-user' } });
	});

	describe('Authentication and DB Checks', () => {
		it('POST should return 401 if user is not authenticated', async () => {
			const unauthResponse = new Response('Unauthorized', { status: 401 });
			requireUser.mockResolvedValue(unauthResponse);

			const response = await POST(mockEvent);
			expect(response).toBe(unauthResponse);
		});

		it('GET should return 401 if user is not authenticated', async () => {
			const unauthResponse = new Response('Unauthorized', { status: 401 });
			requireUser.mockResolvedValue(unauthResponse);

			const response = await GET(mockEvent);
			expect(response).toBe(unauthResponse);
		});

		it('POST should return 500 if database is not available', async () => {
			mockEvent.platform.env.CCBILLING_DB = undefined;
			const response = await POST(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Database not available');
		});

		it('GET should return 500 if database is not available', async () => {
			mockEvent.platform.env.CCBILLING_DB = undefined;
			const response = await GET(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Database not available');
		});
	});

	describe('GET handler', () => {
		it('should return a summary of found duplicates', async () => {
			// Mock the database calls within findCaseDuplicates
			mockDb
				.prepare(expect.stringContaining('GROUP BY UPPER(merchant_normalized)'))
				.all.mockResolvedValue({ results: mockDuplicatesData });

			// Make mocks more specific to handle different queries
			mockDb.prepare.mockImplementation((query) => {
				if (query.includes('GROUP BY'))
					return { all: () => Promise.resolve({ results: mockDuplicatesData }) };
				if (query.includes('FROM payment'))
					return { bind: () => ({ first: () => Promise.resolve(mockPaymentCount) }) };
				if (query.includes('FROM budget_merchant'))
					return { bind: () => ({ first: () => Promise.resolve(mockBudgetCount) }) };
				return mockDb; // Fallback to the generic mock
			});

			const response = await GET(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.duplicatesFound).toBe(1);
			expect(body.totalVariants).toBe(2);
			expect(body.totalPaymentsAffected).toBe(20); // 2 variants * 10 payments
			expect(body.totalBudgetMerchantsAffected).toBe(2); // 2 variants * 1 budget
			expect(body.duplicates).toHaveLength(1);
			expect(body.duplicates[0].canonical).toBe('AMAZON');
		});

		it('should return a message when no duplicates are found', async () => {
			mockDb
				.prepare(expect.stringContaining('GROUP BY UPPER(merchant_normalized)'))
				.all.mockResolvedValue({ results: [] });

			const response = await GET(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.duplicatesFound).toBe(0);
			expect(body.message).toBe('No case-only duplicate merchants found!');
		});

		it('should handle errors during processing', async () => {
			const error = new Error('DB query failed');
			mockDb.prepare.mockImplementation(() => {
				throw error;
			});

			const response = await GET(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Failed to get deduplication status');
			expect(body.details).toBe(error.message);
		});
	});

	describe('POST handler', () => {
		beforeEach(() => {
			// Mock the database calls within findCaseDuplicates for POST requests
			mockDb
				.prepare(expect.stringContaining('GROUP BY UPPER(merchant_normalized)'))
				.all.mockResolvedValue({ results: mockDuplicatesData });

			mockDb
				.prepare(expect.stringContaining('SELECT COUNT(*) as count FROM payment'))
				.first.mockResolvedValue(mockPaymentCount);

			mockDb
				.prepare(expect.stringContaining('SELECT COUNT(*) as count FROM budget_merchant'))
				.first.mockResolvedValue(mockBudgetCount);
		});
		it('should perform a dry run by default', async () => {
			const response = await POST(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.dryRun).toBe(true);
			expect(body.duplicatesFound).toBe(1);
			expect(body.duplicates[0].canonical).toBe('AMAZON');
			expect(mockDb.run).not.toHaveBeenCalled(); // No updates should be run
		});

		it('should perform a dry run when explicitly requested', async () => {
			mockEvent.request.json.mockResolvedValue({ dryRun: true });
			const response = await POST(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.dryRun).toBe(true);
			expect(mockDb.run).not.toHaveBeenCalled();
		});

		it('should perform deduplication when dryRun is false', async () => {
			mockEvent.request.json.mockResolvedValue({ dryRun: false });

			// Mock for deduplicateMerchants logic
			const updateResult = { changes: 5 };
			const deleteResult = { changes: 1 };

			const paymentUpdateBind = vi.fn().mockReturnThis();
			const budgetDeleteBind = vi.fn().mockReturnThis();
			const budgetUpdateBind = vi.fn().mockReturnThis();

			// This mock needs to handle ALL queries made during the POST request for this test case.
			mockDb.prepare.mockImplementation((query) => {
				// Queries from findCaseDuplicates
				if (query.includes('GROUP BY UPPER(merchant_normalized)')) {
					return { all: () => Promise.resolve({ results: mockDuplicatesData }) };
				}
				if (query.includes('FROM payment') && query.includes('COUNT')) {
					return { bind: () => ({ first: () => Promise.resolve(mockPaymentCount) }) };
				}
				if (query.includes('FROM budget_merchant') && query.includes('COUNT')) {
					return { bind: () => ({ first: () => Promise.resolve(mockBudgetCount) }) };
				}
				// Queries from deduplicateMerchants
				if (query.startsWith('UPDATE payment')) {
					return { bind: paymentUpdateBind, run: () => Promise.resolve(updateResult) };
				}
				if (query.startsWith('SELECT DISTINCT budget_id')) {
					return { bind: () => ({ all: () => Promise.resolve({ results: [{ budget_id: 1 }] }) }) };
				}
				if (query.startsWith('DELETE FROM budget_merchant')) {
					return { bind: budgetDeleteBind, run: () => Promise.resolve(deleteResult) };
				}
				if (query.startsWith('UPDATE budget_merchant')) {
					return { bind: budgetUpdateBind, run: () => Promise.resolve(updateResult) };
				}
				// Default fallback for any other SELECT budget_id query
				return {
					bind: () => ({
						all: () => Promise.resolve({ results: [{ budget_id: 1 }, { budget_id: 2 }] })
					})
				};
			});

			const response = await POST(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.dryRun).toBe(false);
			expect(body.duplicatesProcessed).toBe(1);

			// Verify updates
			// 1. Update payment
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE payment SET merchant_normalized = ? WHERE merchant_normalized = ?'
			);
			expect(paymentUpdateBind).toHaveBeenCalledWith('AMAZON', 'amazon');
			expect(body.paymentsUpdated).toBe(5);

			// 2. Delete redundant budget merchant
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'DELETE FROM budget_merchant WHERE merchant_normalized = ? AND budget_id = ?'
			);
			expect(budgetDeleteBind).toHaveBeenCalledWith('amazon', 1);
			expect(body.budgetMerchantsRemoved).toBe(1);

			// 3. Update non-conflicting budget merchant
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE budget_merchant SET merchant_normalized = ? WHERE merchant_normalized = ? AND budget_id = ?'
			);
			expect(budgetUpdateBind).toHaveBeenCalledWith('AMAZON', 'amazon', 2);
			expect(body.budgetMerchantsUpdated).toBe(1);

			expect(body.errors).toBeUndefined();
		});

		it('should handle and report errors during deduplication', async () => {
			mockEvent.request.json.mockResolvedValue({ dryRun: false });

			const dbError = new Error('Update failed');
			// This mock needs to handle the initial findCaseDuplicates call and then fail on the update
			mockDb.prepare.mockImplementation((query) => {
				if (query.includes('GROUP BY UPPER(merchant_normalized)')) {
					return { all: () => Promise.resolve({ results: mockDuplicatesData }) };
				}
				if (query.includes('SELECT COUNT(*)')) {
					return { bind: () => ({ first: () => Promise.resolve({ count: 1 }) }) };
				}
				if (query.startsWith('UPDATE payment')) {
					// This is where we want the error to happen
					return { bind: () => ({ run: () => Promise.reject(dbError) }) };
				}
				return { bind: vi.fn().mockReturnThis(), run: vi.fn(), all: vi.fn(), first: vi.fn() };
			});
			const response = await POST(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.dryRun).toBe(false);
			expect(body.errors).toHaveLength(1);
			expect(body.errors[0].canonicalForm).toBe('AMAZON');
			expect(body.errors[0].error).toBe(dbError.message);
		});

		it('should handle JSON parsing errors gracefully', async () => {
			const parsingError = new Error('Invalid JSON');
			mockEvent.request.json.mockRejectedValue(parsingError);

			// This should be caught by the main try-catch block
			const response = await POST(mockEvent);
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Failed to deduplicate merchants');
			expect(body.details).toBe(parsingError.message);
		});

		it('should correctly choose the canonical variant (uppercase preferred)', async () => {
			// Mock data where variants are in different orders/cases
			const mixedCaseDuplicates = [
				{
					canonical_form: 'TEST-MERCHANT',
					variants: 'test-merchant,TEST-MERCHANT', // Uppercase is second
					variant_count: 2
				}
			];
			mockDb
				.prepare(expect.stringContaining('GROUP BY UPPER(merchant_normalized)'))
				.all.mockResolvedValue({ results: mixedCaseDuplicates });

			const response = await GET(mockEvent);
			const body = await response.json();

			expect(body.duplicates[0].canonical).toBe('TEST-MERCHANT');
		});
	});
});
