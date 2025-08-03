import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from '../src/routes/projects/ccbilling/[id]/+page.server.js';

// Mock the redirect function
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

// Mock the requireUser function
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

// Mock the ccbilling-db functions
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getBillingCycle: vi.fn(),
	listStatements: vi.fn(),
	listChargesForCycle: vi.fn(),
	listCreditCards: vi.fn()
}));

describe('CCBilling Page Server Route', () => {
	let mockEvent;
	let mockPlatform;
	let mockRequireUser;
	let mockRedirect;
	let mockGetBillingCycle;
	let mockListStatements;
	let mockListChargesForCycle;
	let mockListCreditCards;

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

		// Mock event object
		mockEvent = {
			params: {
				id: '123'
			},
			platform: mockPlatform,
			cookies: {
				get: vi.fn()
			},
			request: {
				headers: {
					get: vi.fn()
				}
			}
		};

		// Get mocked functions
		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
		mockRedirect = (await import('@sveltejs/kit')).redirect;
		mockGetBillingCycle = (await import('$lib/server/ccbilling-db.js')).getBillingCycle;
		mockListStatements = (await import('$lib/server/ccbilling-db.js')).listStatements;
		mockListChargesForCycle = (await import('$lib/server/ccbilling-db.js')).listChargesForCycle;
		mockListCreditCards = (await import('$lib/server/ccbilling-db.js')).listCreditCards;
	});

	describe('load function', () => {
		it('should redirect to /notauthorised when user is not authenticated', async () => {
			const authResponse = new Response('Not authenticated', { status: 401 });
			mockRequireUser.mockResolvedValue(authResponse);

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, '/notauthorised');
		});

		it('should redirect to /projects/ccbilling when billing cycle is not found', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock billing cycle not found
			mockGetBillingCycle.mockResolvedValue(null);

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, '/projects/ccbilling');
		});

		it('should return all required data when authentication and billing cycle are valid', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock billing cycle data
			const mockCycle = {
				id: 123,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
				status: 'open'
			};
			mockGetBillingCycle.mockResolvedValue(mockCycle);

			// Mock related data
			const mockStatements = [
				{ id: 1, billing_cycle_id: 123, filename: 'statement1.pdf' },
				{ id: 2, billing_cycle_id: 123, filename: 'statement2.pdf' }
			];
			mockListStatements.mockResolvedValue(mockStatements);

			const mockCharges = [
				{ id: 1, merchant: 'Amazon', amount: 50.00, statement_id: 1 },
				{ id: 2, merchant: 'Netflix', amount: 15.99, statement_id: 1 }
			];
			mockListChargesForCycle.mockResolvedValue(mockCharges);

			const mockCreditCards = [
				{ id: 1, name: 'Chase Sapphire', last4: '1234' },
				{ id: 2, name: 'Amex Gold', last4: '5678' }
			];
			mockListCreditCards.mockResolvedValue(mockCreditCards);

			const result = await load(mockEvent);

			expect(result).toEqual({
				cycleId: 123,
				cycle: mockCycle,
				statements: mockStatements,
				charges: mockCharges,
				creditCards: mockCreditCards
			});

			// Verify all database functions were called with correct parameters
			expect(mockGetBillingCycle).toHaveBeenCalledWith(mockEvent, 123);
			expect(mockListStatements).toHaveBeenCalledWith(mockEvent, 123);
			expect(mockListChargesForCycle).toHaveBeenCalledWith(mockEvent, 123);
			expect(mockListCreditCards).toHaveBeenCalledWith(mockEvent);
		});

		it('should handle string cycle ID and convert to integer', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock billing cycle data
			const mockCycle = {
				id: 456,
				start_date: '2024-02-01',
				end_date: '2024-02-29',
				status: 'closed'
			};
			mockGetBillingCycle.mockResolvedValue(mockCycle);

			// Mock related data
			mockListStatements.mockResolvedValue([]);
			mockListChargesForCycle.mockResolvedValue([]);
			mockListCreditCards.mockResolvedValue([]);

			// Test with string ID
			mockEvent.params.id = '456';

			const result = await load(mockEvent);

			expect(result.cycleId).toBe(456);
			expect(mockGetBillingCycle).toHaveBeenCalledWith(mockEvent, 456);
		});

		it('should handle empty arrays for related data', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock billing cycle data
			const mockCycle = {
				id: 123,
				start_date: '2024-03-01',
				end_date: '2024-03-31',
				status: 'open'
			};
			mockGetBillingCycle.mockResolvedValue(mockCycle);

			// Mock empty related data
			mockListStatements.mockResolvedValue([]);
			mockListChargesForCycle.mockResolvedValue([]);
			mockListCreditCards.mockResolvedValue([]);

			const result = await load(mockEvent);

			expect(result).toEqual({
				cycleId: 123,
				cycle: mockCycle,
				statements: [],
				charges: [],
				creditCards: []
			});
		});

		it('should handle database errors gracefully', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock billing cycle data
			const mockCycle = {
				id: 123,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
				status: 'open'
			};
			mockGetBillingCycle.mockResolvedValue(mockCycle);

			// Mock database errors for related data
			mockListStatements.mockRejectedValue(new Error('Database error'));
			mockListChargesForCycle.mockResolvedValue([]);
			mockListCreditCards.mockResolvedValue([]);

			await expect(load(mockEvent)).rejects.toThrow('Database error');
		});

		it('should handle invalid cycle ID format', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock getBillingCycle to return null for NaN
			mockGetBillingCycle.mockResolvedValue(null);
			
			// Test with invalid ID
			mockEvent.params.id = 'invalid';

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, '/projects/ccbilling');
		});

		it('should handle null cycle ID', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock getBillingCycle to return null for NaN
			mockGetBillingCycle.mockResolvedValue(null);
			
			// Test with null ID
			mockEvent.params.id = null;

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, '/projects/ccbilling');
		});

		it('should handle undefined cycle ID', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock getBillingCycle to return null for NaN
			mockGetBillingCycle.mockResolvedValue(null);
			
			// Test with undefined ID
			mockEvent.params.id = undefined;

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, '/projects/ccbilling');
		});

		it('should handle zero cycle ID', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock billing cycle not found for zero ID
			mockGetBillingCycle.mockResolvedValue(null);
			mockEvent.params.id = '0';

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, '/projects/ccbilling');
		});

		it('should handle negative cycle ID', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);
			
			// Mock billing cycle not found for negative ID
			mockGetBillingCycle.mockResolvedValue(null);
			mockEvent.params.id = '-1';

			await expect(load(mockEvent)).rejects.toThrow();
			expect(mockRedirect).toHaveBeenCalledWith(307, '/projects/ccbilling');
		});
	});
});