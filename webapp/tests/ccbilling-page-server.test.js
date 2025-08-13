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
	listCreditCards: vi.fn(),
	listBudgets: vi.fn(),
	listBudgetMerchantMappings: vi.fn()
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
	let mockListBudgets;
	let mockListBudgetMerchantMappings;

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
			},
			depends: vi.fn()
		};

		// Get mocked functions
		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
		mockRedirect = (await import('@sveltejs/kit')).redirect;
		mockGetBillingCycle = (await import('$lib/server/ccbilling-db.js')).getBillingCycle;
		mockListStatements = (await import('$lib/server/ccbilling-db.js')).listStatements;
		mockListChargesForCycle = (await import('$lib/server/ccbilling-db.js')).listChargesForCycle;
		mockListCreditCards = (await import('$lib/server/ccbilling-db.js')).listCreditCards;
		mockListBudgets = (await import('$lib/server/ccbilling-db.js')).listBudgets;
		mockListBudgetMerchantMappings = (await import('$lib/server/ccbilling-db.js')).listBudgetMerchantMappings;
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
			const mockBillingCycle = {
				id: 123,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
				status: 'active'
			};
			mockGetBillingCycle.mockResolvedValue(mockBillingCycle);

			// Mock statements data
			const mockStatements = [
				{
					id: 1,
					filename: 'statement1.pdf',
					credit_card_id: 1,
					statement_date: '2024-01-15',
					parsed: true
				},
				{
					id: 2,
					filename: 'statement2.pdf',
					credit_card_id: 2,
					statement_date: '2024-01-20',
					parsed: true
				}
			];
			mockListStatements.mockResolvedValue(mockStatements);

			// Mock charges data with credit card information
			const mockCharges = [
				{
					id: 1,
					merchant: 'Amazon',
					amount: 50.00,
					allocated_to: 'Shopping',
					credit_card_id: 1,
					card_name: 'Chase Freedom',
					transaction_date: '2024-01-10',
					statement_id: 1
				},
				{
					id: 2,
					merchant: 'Starbucks',
					amount: 5.50,
					allocated_to: 'Food',
					credit_card_id: 1,
					card_name: 'Chase Freedom',
					transaction_date: '2024-01-12',
					statement_id: 1
				}
			];
			mockListChargesForCycle.mockResolvedValue(mockCharges);

			// Mock credit cards data
			const mockCreditCards = [
				{ id: 1, name: 'Chase Freedom', last4: '1234' },
				{ id: 2, name: 'Amex Gold', last4: '5678' }
			];
			mockListCreditCards.mockResolvedValue(mockCreditCards);

			// Mock budgets data
			const mockBudgets = [
				{ id: 1, name: 'Shopping', icon: '🛍️' },
				{ id: 2, name: 'Food', icon: '🍕' },
				{ id: 3, name: 'Transportation', icon: '🚗' }
			];
			mockListBudgets.mockResolvedValue(mockBudgets);

			// Mock auto-associations data
			const mockAutoAssociations = [
				{ merchant_normalized: 'AMAZON', budget_name: 'Shopping' },
				{ merchant_normalized: 'STARBUCKS', budget_name: 'Food' }
			];
			mockListBudgetMerchantMappings.mockResolvedValue(mockAutoAssociations);

			// Call the load function
			const result = await load(mockEvent);

			// Verify all required data is returned
			expect(result).toEqual({
				cycleId: 123,
				cycle: mockBillingCycle,
				statements: mockStatements,
				charges: mockCharges,
				creditCards: mockCreditCards,
				budgets: mockBudgets,
				autoAssociations: mockAutoAssociations
			});

			// Verify all database functions were called
			expect(mockGetBillingCycle).toHaveBeenCalledWith(mockEvent, 123);
			expect(mockListStatements).toHaveBeenCalledWith(mockEvent, 123);
			expect(mockListChargesForCycle).toHaveBeenCalledWith(mockEvent, 123);
			expect(mockListCreditCards).toHaveBeenCalledWith(mockEvent);
			expect(mockListBudgets).toHaveBeenCalledWith(mockEvent);
			expect(mockListBudgetMerchantMappings).toHaveBeenCalledWith(mockEvent);
		});

		it('should return charges with proper credit card information for filtering', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);

			// Mock billing cycle data
			mockGetBillingCycle.mockResolvedValue({
				id: 123,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
				status: 'active'
			});

			// Mock statements data
			mockListStatements.mockResolvedValue([
				{
					id: 1,
					filename: 'statement1.pdf',
					credit_card_id: 1,
					statement_date: '2024-01-15',
					parsed: true
				}
			]);

			// Mock charges with detailed credit card info
			const mockCharges = [
				{
					id: 1,
					merchant: 'Amazon',
					amount: 50.00,
					allocated_to: 'Shopping',
					credit_card_id: 1,
					card_name: 'Chase Freedom',
					transaction_date: '2024-01-10',
					statement_id: 1
				},
				{
					id: 2,
					merchant: 'Starbucks',
					amount: 5.50,
					allocated_to: 'Food',
					credit_card_id: 1,
					card_name: 'Chase Freedom',
					transaction_date: '2024-01-12',
					statement_id: 1
				}
			];
			mockListChargesForCycle.mockResolvedValue(mockCharges);

			// Mock credit cards
			mockListCreditCards.mockResolvedValue([
				{ id: 1, name: 'Chase Freedom', last4: '1234' }
			]);

			// Mock budgets
			mockListBudgets.mockResolvedValue([
				{ id: 1, name: 'Shopping', icon: '🛍️' },
				{ id: 2, name: 'Food', icon: '🍕' }
			]);

			// Mock auto-associations
			mockListBudgetMerchantMappings.mockResolvedValue([
				{ merchant_normalized: 'AMAZON', budget_name: 'Shopping' },
				{ merchant_normalized: 'STARBUCKS', budget_name: 'Food' }
			]);

			// Call the load function
			const result = await load(mockEvent);

			// Verify charges have the required credit card fields for filtering
			expect(result.charges).toHaveLength(2);
			expect(result.charges[0]).toHaveProperty('credit_card_id', 1);
			expect(result.charges[0]).toHaveProperty('card_name', 'Chase Freedom');
			expect(result.charges[1]).toHaveProperty('credit_card_id', 1);
			expect(result.charges[1]).toHaveProperty('card_name', 'Chase Freedom');

			// Verify credit cards have the required fields
			expect(result.creditCards).toHaveLength(1);
			expect(result.creditCards[0]).toHaveProperty('id', 1);
			expect(result.creditCards[0]).toHaveProperty('name', 'Chase Freedom');
			expect(result.creditCards[0]).toHaveProperty('last4', '1234');
		});

		it('should handle empty charges and credit cards gracefully', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);

			// Mock billing cycle data
			mockGetBillingCycle.mockResolvedValue({
				id: 123,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
				status: 'active'
			});

			// Mock empty statements
			mockListStatements.mockResolvedValue([]);

			// Mock empty charges
			mockListChargesForCycle.mockResolvedValue([]);

			// Mock empty credit cards
			mockListCreditCards.mockResolvedValue([]);

			// Mock empty budgets
			mockListBudgets.mockResolvedValue([]);

			// Mock empty auto-associations
			mockListBudgetMerchantMappings.mockResolvedValue([]);

			// Call the load function
			const result = await load(mockEvent);

			// Verify empty arrays are returned
			expect(result.charges).toEqual([]);
			expect(result.creditCards).toEqual([]);
			expect(result.statements).toEqual([]);
			expect(result.budgets).toEqual([]);
			expect(result.autoAssociations).toEqual([]);
		});

		it('should handle multiple credit cards with charges correctly', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);

			// Mock billing cycle data
			mockGetBillingCycle.mockResolvedValue({
				id: 123,
				start_date: '2024-01-01',
				end_date: '2024-01-31',
				status: 'active'
			});

			// Mock statements for multiple cards
			mockListStatements.mockResolvedValue([
				{
					id: 1,
					filename: 'chase_statement.pdf',
					credit_card_id: 1,
					statement_date: '2024-01-15',
					parsed: true
				},
				{
					id: 2,
					filename: 'amex_statement.pdf',
					credit_card_id: 2,
					statement_date: '2024-01-20',
					parsed: true
				}
			]);

			// Mock charges across multiple cards
			const mockCharges = [
				{
					id: 1,
					merchant: 'Amazon',
					amount: 50.00,
					allocated_to: 'Shopping',
					credit_card_id: 1,
					card_name: 'Chase Freedom',
					transaction_date: '2024-01-10',
					statement_id: 1
				},
				{
					id: 2,
					merchant: 'Shell',
					amount: 45.00,
					allocated_to: 'Transportation',
					credit_card_id: 2,
					card_name: 'Amex Gold',
					transaction_date: '2024-01-15',
					statement_id: 2
				}
			];
			mockListChargesForCycle.mockResolvedValue(mockCharges);

			// Mock multiple credit cards
			mockListCreditCards.mockResolvedValue([
				{ id: 1, name: 'Chase Freedom', last4: '1234' },
				{ id: 2, name: 'Amex Gold', last4: '5678' }
			]);

			// Mock budgets
			mockListBudgets.mockResolvedValue([
				{ id: 1, name: 'Shopping', icon: '🛍️' },
				{ id: 2, name: 'Transportation', icon: '🚗' }
			]);

			// Mock auto-associations
			mockListBudgetMerchantMappings.mockResolvedValue([
				{ merchant_normalized: 'AMAZON', budget_name: 'Shopping' },
				{ merchant_normalized: 'SHELL', budget_name: 'Transportation' }
			]);

			// Call the load function
			const result = await load(mockEvent);

			// Verify multiple credit cards are returned
			expect(result.creditCards).toHaveLength(2);
			expect(result.creditCards[0].id).toBe(1);
			expect(result.creditCards[1].id).toBe(2);

			// Verify charges are properly associated with cards
			expect(result.charges).toHaveLength(2);
			expect(result.charges[0].credit_card_id).toBe(1);
			expect(result.charges[1].credit_card_id).toBe(2);

			// Verify statements are properly associated with cards
			expect(result.statements).toHaveLength(2);
			expect(result.statements[0].credit_card_id).toBe(1);
			expect(result.statements[1].credit_card_id).toBe(2);
		});

		it('should handle string cycle ID and convert to integer', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);

			// Mock billing cycle data
			const mockCycle = {
				id: 456,
				start_date: '2024-02-01',
				end_date: '2024-02-29'
			};
			mockGetBillingCycle.mockResolvedValue(mockCycle);

			// Mock related data
			mockListStatements.mockResolvedValue([]);
			mockListChargesForCycle.mockResolvedValue([]);
			mockListCreditCards.mockResolvedValue([]);
			mockListBudgets.mockResolvedValue([]);
			mockListBudgetMerchantMappings.mockResolvedValue([]);

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
				end_date: '2024-03-31'
			};
			mockGetBillingCycle.mockResolvedValue(mockCycle);

			// Mock empty related data
			mockListStatements.mockResolvedValue([]);
			mockListChargesForCycle.mockResolvedValue([]);
			mockListCreditCards.mockResolvedValue([]);
			mockListBudgets.mockResolvedValue([]);
			mockListBudgetMerchantMappings.mockResolvedValue([]);

			const result = await load(mockEvent);

			expect(result).toEqual({
				cycleId: 123,
				cycle: mockCycle,
				statements: [],
				charges: [],
				creditCards: [],
				budgets: [],
				autoAssociations: []
			});
		});

		it('should handle database errors gracefully', async () => {
			// Mock successful authentication
			mockRequireUser.mockResolvedValue(null);

			// Mock billing cycle data
			const mockCycle = {
				id: 123,
				start_date: '2024-01-01',
				end_date: '2024-01-31'
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
