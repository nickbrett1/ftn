import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET } from '../src/routes/api/admin/consolidate-merchants/+server.js';

// Mock the requireUser function
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

describe('Merchant Consolidation API', () => {
	let mockEvent;
	let mockPlatform;
	let mockRequireUser;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Mock platform environment
		mockPlatform = {
			env: {
				CCBILLING_DB: {
					prepare: vi.fn().mockReturnThis(),
					bind: vi.fn().mockReturnThis(),
					run: vi.fn().mockResolvedValue({ changes: 5 }),
					all: vi.fn().mockResolvedValue({ 
						results: [
							{ merchant_normalized: 'PINKBERRY 15012 NEW YORK', count: 3 },
							{ merchant_normalized: 'PINKBERRY 15038 NEW YORK', count: 2 },
							{ merchant_normalized: 'PLANT SHED 87 CORP NEW YORK', count: 4 },
							{ merchant_normalized: 'PLANTSHED 8007539595', count: 1 },
							{ merchant_normalized: 'TST* DIG INN- 100 W 67 NEW YORK', count: 2 },
							{ merchant_normalized: 'TST* DIG INN- 100 W 67TH NEW YORK', count: 1 }
						]
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
				json: vi.fn().mockResolvedValue({ dryRun: true })
			},
			depends: vi.fn()
		};

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

		it('should perform dry run by default', async () => {
			mockRequireUser.mockResolvedValue(null);

			const result = await POST(mockEvent);
			const data = await result.json();
			
			expect(data.dryRun).toBe(true);
			expect(data.groupsFound).toBeDefined();
			expect(data.groups).toBeDefined();
		});

		it('should consolidate merchants when dryRun is false', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.request.json = vi.fn().mockResolvedValue({ dryRun: false });

			const result = await POST(mockEvent);
			const data = await result.json();
			
			expect(data.dryRun).toBe(false);
			expect(data.paymentsUpdated).toBeDefined();
			expect(data.budgetMerchantsUpdated).toBeDefined();
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

		it('should return consolidation status when successful', async () => {
			mockRequireUser.mockResolvedValue(null);

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(data.groupsFound).toBeDefined();
			expect(data.totalVariants).toBeDefined();
			expect(data.totalPaymentsAffected).toBeDefined();
			expect(data.groups).toBeDefined();
		});

		it('should handle database errors gracefully', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform.env.CCBILLING_DB.all = vi.fn().mockRejectedValue(new Error('Database error'));

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(result.status).toBe(500);
			expect(data.error).toBe('Failed to get consolidation status');
			expect(data.details).toBe('Database error');
		});
	});

	describe('Similarity detection', () => {
		it('should detect store number variations', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform.env.CCBILLING_DB.all = vi.fn().mockResolvedValue({ 
				results: [
					{ merchant_normalized: 'PINKBERRY 15012 NEW YORK', count: 3 },
					{ merchant_normalized: 'PINKBERRY 15038 NEW YORK', count: 2 }
				]
			});

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(data.groupsFound).toBeGreaterThan(0);
			// Should find the PINKBERRY group
			const pinkberryGroup = data.groups.find(group => 
				group.variants.some(v => v.merchant_normalized.includes('PINKBERRY'))
			);
			expect(pinkberryGroup).toBeDefined();
		});

		it('should detect spacing variations', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform.env.CCBILLING_DB.all = vi.fn().mockResolvedValue({ 
				results: [
					{ merchant_normalized: 'PLANT SHED 87 CORP NEW YORK', count: 4 },
					{ merchant_normalized: 'PLANTSHED 8007539595', count: 1 }
				]
			});

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(data.groupsFound).toBeGreaterThan(0);
			// Should find the PLANT SHED group
			const plantShedGroup = data.groups.find(group => 
				group.variants.some(v => v.merchant_normalized.includes('PLANT'))
			);
			expect(plantShedGroup).toBeDefined();
		});

		it('should detect address format variations', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.platform.env.CCBILLING_DB.all = vi.fn().mockResolvedValue({ 
				results: [
					{ merchant_normalized: 'TST* DIG INN- 100 W 67 NEW YORK', count: 2 },
					{ merchant_normalized: 'TST* DIG INN- 100 W 67TH NEW YORK', count: 1 }
				]
			});

			const result = await GET(mockEvent);
			const data = await result.json();
			
			expect(data.groupsFound).toBeGreaterThan(0);
			// Should find the DIG INN group
			const digInnGroup = data.groups.find(group => 
				group.variants.some(v => v.merchant_normalized.includes('DIG INN'))
			);
			expect(digInnGroup).toBeDefined();
		});
	});
});
