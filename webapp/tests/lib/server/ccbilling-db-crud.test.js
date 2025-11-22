import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '$lib/server/ccbilling-db.js';

// Mock the dependencies
vi.mock('$lib/utils/merchant-normalizer.js', () => ({
	normalizeMerchant: vi.fn((merchant) => ({
		merchant_normalized: merchant.toLowerCase().replace(/\s+/g, '-')
	}))
}));

vi.mock('$lib/server/amazon-orders-service.js', () => ({
	extractAmazonOrderId: vi.fn(),
	extractAmazonOrderIdFromMultiLine: vi.fn()
}));

describe('ccbilling-db.js', () => {
	let mockDb;
	let mockEvent;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// A more robust mock for the D1 database
		mockDb = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue(null),
			run: vi.fn().mockResolvedValue({ meta: { last_row_id: 1, changes: 1 } })
		};

		mockEvent = {
			platform: {
				env: {
					CCBILLING_DB: mockDb
				}
			}
		};
	});

	it('should throw an error if database is not available', async () => {
		const errorEvent = { platform: { env: {} } };
		await expect(db.listCreditCards(errorEvent)).rejects.toThrow('CCBILLING_DB binding not found');
	});

	// Credit Card Tests
	describe('Credit Cards', () => {
		it('listCreditCards should fetch all credit cards', async () => {
			const mockCards = [{ id: 1, name: 'Visa' }];
			mockDb.all.mockResolvedValue({ results: mockCards });
			const cards = await db.listCreditCards(mockEvent);
			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM credit_card ORDER BY name ASC');
			expect(cards).toEqual(mockCards);
		});

		it('getCreditCard should fetch a single credit card', async () => {
			const mockCard = { id: 1, name: 'Visa' };
			mockDb.first.mockResolvedValue(mockCard);
			const card = await db.getCreditCard(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM credit_card WHERE id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(card).toEqual(mockCard);
		});

		it('createCreditCard should insert a new credit card', async () => {
			await db.createCreditCard(mockEvent, 'Mastercard', '1234');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'INSERT INTO credit_card (name, last4) VALUES (?, ?)'
			);
			expect(mockDb.bind).toHaveBeenCalledWith('Mastercard', '1234');
			expect(mockDb.run).toHaveBeenCalled();
		});

		it('updateCreditCard should update an existing credit card', async () => {
			await db.updateCreditCard(mockEvent, 1, 'Visa Premier', '5678');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE credit_card SET name = ?, last4 = ? WHERE id = ?'
			);
			expect(mockDb.bind).toHaveBeenCalledWith('Visa Premier', '5678', 1);
			expect(mockDb.run).toHaveBeenCalled();
		});

		it('deleteCreditCard should delete a credit card', async () => {
			await db.deleteCreditCard(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM credit_card WHERE id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(mockDb.run).toHaveBeenCalled();
		});
	});

	// Billing Cycle Tests
	describe('Billing Cycles', () => {
		it('listBillingCycles should fetch all billing cycles', async () => {
			const mockCycles = [{ id: 1, start_date: '2023-01-01' }];
			mockDb.all.mockResolvedValue({ results: mockCycles });
			const cycles = await db.listBillingCycles(mockEvent);
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'SELECT * FROM billing_cycle ORDER BY start_date DESC'
			);
			expect(cycles).toEqual(mockCycles);
		});

		it('getBillingCycle should fetch a single billing cycle', async () => {
			const mockCycle = { id: 1, start_date: '2023-01-01' };
			mockDb.first.mockResolvedValue(mockCycle);
			const cycle = await db.getBillingCycle(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM billing_cycle WHERE id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(cycle).toEqual(mockCycle);
		});

		it('createBillingCycle should insert a new billing cycle', async () => {
			await db.createBillingCycle(mockEvent, '2023-01-01', '2023-01-31');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'INSERT INTO billing_cycle (start_date, end_date) VALUES (?, ?)'
			);
			expect(mockDb.bind).toHaveBeenCalledWith('2023-01-01', '2023-01-31');
			expect(mockDb.run).toHaveBeenCalled();
		});

		it('deleteBillingCycle should delete a billing cycle', async () => {
			await db.deleteBillingCycle(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM billing_cycle WHERE id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(mockDb.run).toHaveBeenCalled();
		});
	});

	// Budget Tests
	describe('Budgets', () => {
		it('listBudgets should fetch all budgets', async () => {
			const mockBudgets = [{ id: 1, name: 'Groceries' }];
			mockDb.all.mockResolvedValue({ results: mockBudgets });
			const budgets = await db.listBudgets(mockEvent);
			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM budget ORDER BY created_at DESC');
			expect(budgets).toEqual(mockBudgets);
		});

		it('getBudget should fetch a single budget', async () => {
			const mockBudget = { id: 1, name: 'Groceries' };
			mockDb.first.mockResolvedValue(mockBudget);
			const budget = await db.getBudget(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM budget WHERE id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(budget).toEqual(mockBudget);
		});

		it('createBudget should insert a new budget', async () => {
			await db.createBudget(mockEvent, 'Groceries', 'icon-string');
			expect(mockDb.prepare).toHaveBeenCalledWith('INSERT INTO budget (name, icon) VALUES (?, ?)');
			expect(mockDb.bind).toHaveBeenCalledWith('Groceries', 'icon-string');
			expect(mockDb.run).toHaveBeenCalled();
		});

		it('updateBudget should update an existing budget', async () => {
			await db.updateBudget(mockEvent, 1, 'Food', 'new-icon');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE budget SET name = ?, icon = ? WHERE id = ?'
			);
			expect(mockDb.bind).toHaveBeenCalledWith('Food', 'new-icon', 1);
			expect(mockDb.run).toHaveBeenCalled();
		});

		it('deleteBudget should delete a budget', async () => {
			await db.deleteBudget(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM budget WHERE id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(mockDb.run).toHaveBeenCalled();
		});
	});

	// Budget Merchant Tests
	describe('Budget Merchants', () => {
		it('addBudgetMerchant should add a merchant to a budget', async () => {
			await db.addBudgetMerchant(mockEvent, 1, 'Test Merchant');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'INSERT INTO budget_merchant (budget_id, merchant_normalized, merchant) VALUES (?, ?, ?)'
			);
			expect(mockDb.bind).toHaveBeenCalledWith(1, 'test-merchant', 'test-merchant');
			expect(mockDb.run).toHaveBeenCalled();
		});

		it('removeBudgetMerchant should remove a merchant from a budget', async () => {
			await db.removeBudgetMerchant(mockEvent, 1, 'Test Merchant');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'DELETE FROM budget_merchant WHERE budget_id = ? AND merchant_normalized = ?'
			);
			expect(mockDb.bind).toHaveBeenCalledWith(1, 'test-merchant');
			expect(mockDb.run).toHaveBeenCalled();
		});

		it('getBudgetMerchants should fetch all merchants for a budget', async () => {
			const mockMerchants = [{ budget_id: 1, merchant_normalized: 'test-merchant' }];
			mockDb.all.mockResolvedValue({ results: mockMerchants });
			const merchants = await db.getBudgetMerchants(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'SELECT * FROM budget_merchant WHERE budget_id = ? ORDER BY merchant_normalized ASC'
			);
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(merchants).toEqual(mockMerchants);
		});
	});

	// Statement Tests
	describe('Statements', () => {
		it('listStatements should fetch all statements for a billing cycle', async () => {
			const mockStatements = [{ id: 1, filename: 'stmt.pdf' }];
			mockDb.all.mockResolvedValue({ results: mockStatements });
			const statements = await db.listStatements(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM statement s'));
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(statements).toEqual(mockStatements);
		});

		it('getStatement should fetch a single statement', async () => {
			const mockStatement = { id: 1, filename: 'stmt.pdf' };
			mockDb.first.mockResolvedValue(mockStatement);
			const statement = await db.getStatement(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('FROM statement s'));
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(statement).toEqual(mockStatement);
		});

		it('createStatement should insert a new statement and return its ID', async () => {
			const last_row_id = 99;
			mockDb.run.mockResolvedValue({ meta: { last_row_id } });
			const newId = await db.createStatement(
				mockEvent,
				1,
				1,
				'file.pdf',
				'r2key',
				'2023-01-15',
				'imgkey'
			);
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'INSERT INTO statement (billing_cycle_id, credit_card_id, filename, r2_key, statement_date, image_key) VALUES (?, ?, ?, ?, ?, ?)'
			);
			expect(mockDb.bind).toHaveBeenCalledWith(1, 1, 'file.pdf', 'r2key', '2023-01-15', 'imgkey');
			expect(newId).toBe(last_row_id);
		});

		it('updateStatementImageKey should update the image key', async () => {
			await db.updateStatementImageKey(mockEvent, 1, 'new-img-key');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE statement SET image_key = ? WHERE id = ?'
			);
			expect(mockDb.bind).toHaveBeenCalledWith('new-img-key', 1);
		});

		it('updateStatementCreditCard should update the credit card id', async () => {
			await db.updateStatementCreditCard(mockEvent, 1, 2);
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE statement SET credit_card_id = ? WHERE id = ?'
			);
			expect(mockDb.bind).toHaveBeenCalledWith(2, 1);
		});

		it('updateStatementDate should update the statement date', async () => {
			await db.updateStatementDate(mockEvent, 1, '2023-02-20');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE statement SET statement_date = ? WHERE id = ?'
			);
			expect(mockDb.bind).toHaveBeenCalledWith('2023-02-20', 1);
		});

		it('deleteStatement should delete a statement and its payments', async () => {
			await db.deleteStatement(mockEvent, 1);
			// It first calls deletePaymentsForStatement
			expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM payment WHERE statement_id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			// Then it deletes the statement
			expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM statement WHERE id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(mockDb.run).toHaveBeenCalledTimes(2);
		});
	});

	// Payment/Charge Tests
	describe('Payments', () => {
		it('createPayment should insert a new payment', async () => {
			const paymentData = {
				statement_id: 1,
				merchant: 'Test Merchant',
				amount: 100,
				allocated_to: 'Groceries'
			};
			await db.createPayment(mockEvent, paymentData);
			expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO payment'));
			expect(mockDb.bind).toHaveBeenCalledWith(
				1,
				'Test Merchant',
				'test-merchant',
				undefined,
				100,
				'Groceries',
				null,
				false,
				null,
				null,
				null,
				null
			);
		});

		it('listChargesForCycle should list charges and parse details', async () => {
			const mockCharges = [
				{
					id: 1,
					merchant: 'Flight Inc',
					flight_details: '{ "from": "JFK", "to": "LAX" }',
					full_statement_text: 'Amazon.com*12345'
				}
			];
			mockDb.all.mockResolvedValue({ results: mockCharges });
			const { extractAmazonOrderIdFromMultiLine } = await import(
				'$lib/server/amazon-orders-service.js'
			);

			const charges = await db.listChargesForCycle(mockEvent, 1);

			expect(charges[0].flight_details).toEqual({ from: 'JFK', to: 'LAX' });
			expect(extractAmazonOrderIdFromMultiLine).toHaveBeenCalledWith('Amazon.com*12345');
		});

		it('getPayment should fetch a single payment and parse details', async () => {
			const mockPayment = {
				id: 1,
				merchant: 'Amazon',
				flight_details: null,
				full_statement_text: null
			};
			mockDb.first.mockResolvedValue(mockPayment);
			const { extractAmazonOrderId } = await import('$lib/server/amazon-orders-service.js');

			const payment = await db.getPayment(mockEvent, 1);

			expect(payment.flight_details).toBeNull();
			expect(extractAmazonOrderId).toHaveBeenCalledWith('Amazon');
		});

		it('updatePayment should update a payment', async () => {
			await db.updatePayment(mockEvent, 1, 'New Merchant', 200, 'New Budget');
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE payment SET merchant = ?, amount = ?, allocated_to = ? WHERE id = ?'
			);
			expect(mockDb.bind).toHaveBeenCalledWith('New Merchant', 200, 'New Budget', 1);
		});

		it('bulkAssignPayments should update multiple payments', async () => {
			const assignments = [
				{ id: 1, allocated_to: 'BudgetA' },
				{ id: 2, allocated_to: 'BudgetB' }
			];
			await db.bulkAssignPayments(mockEvent, assignments);
			expect(mockDb.prepare).toHaveBeenCalledWith(
				'UPDATE payment SET allocated_to = ? WHERE id = ?'
			);
			expect(mockDb.run).toHaveBeenCalledTimes(2);
			expect(mockDb.bind).toHaveBeenCalledWith('BudgetA', 1);
			expect(mockDb.bind).toHaveBeenCalledWith('BudgetB', 2);
		});

		it('deletePaymentsForStatement should delete all payments for a statement', async () => {
			await db.deletePaymentsForStatement(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM payment WHERE statement_id = ?');
			expect(mockDb.bind).toHaveBeenCalledWith(1);
		});
	});

	// Other DB functions
	describe('Other DB Functions', () => {
		it('refreshAutoAssociationsForCycle should update payments based on budget mappings', async () => {
			mockDb.run.mockResolvedValue({ meta: { changes: 5 } });
			const updatedCount = await db.refreshAutoAssociationsForCycle(mockEvent, 1);
			expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE payment AS p'));
			expect(mockDb.bind).toHaveBeenCalledWith(1);
			expect(updatedCount).toBe(5);
		});
	});
});