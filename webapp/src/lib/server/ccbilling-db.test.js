import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	listCreditCards,
	createCreditCard,
	getCreditCard,
	updateCreditCard,
	deleteCreditCard,
	listBillingCycles,
	createBillingCycle,
	getBillingCycle,
	listBudgets,
	getBudget,
	createBudget,
	updateBudget,
	deleteBudget,
	addBudgetMerchant,
	removeBudgetMerchant,
	getBudgetMerchants,
	listStatements,
	createStatement,
	getStatement,
	deleteStatement,
	updateStatementDate,
	createPayment,
	listChargesForCycle,
	getPayment,
	updatePayment,
	bulkAssignPayments,
	deletePaymentsForStatement,
	getAllUnassignedMerchants,
	getUnassignedMerchants,
	getRecentUnassignedMerchants
} from './ccbilling-db.js';

describe('ccbilling-db functions', () => {
	let mockEvent;
	let mockDb;

	beforeEach(() => {
		// Create mock database with all the methods we need
		mockDb = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			all: vi.fn(),
			first: vi.fn(),
			run: vi.fn()
		};

		// Create mock event with platform environment
		mockEvent = {
			platform: {
				env: {
					CCBILLING_DB: mockDb
				}
			}
		};

		vi.clearAllMocks();
	});

	describe('Credit Card Functions', () => {
		describe('listCreditCards', () => {
			it('should return list of credit cards', async () => {
				const mockCards = [
					{ id: 1, name: 'Chase Freedom', last4: '1234', created_at: '2024-01-01' },
					{ id: 2, name: 'Amex Gold', last4: '5678', created_at: '2024-01-02' }
				];
				mockDb.all.mockResolvedValue({ results: mockCards });

				const result = await listCreditCards(mockEvent);

				expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM credit_card ORDER BY name ASC');
				expect(result).toEqual(mockCards);
			});

			it('should throw error when CCBILLING_DB not found', async () => {
				const eventWithoutDb = { platform: { env: {} } };

				await expect(listCreditCards(eventWithoutDb)).rejects.toThrow(
					'CCBILLING_DB binding not found'
				);
			});
		});

		describe('createCreditCard', () => {
			it('should create a new credit card', async () => {
				mockDb.run.mockResolvedValue({});

				await createCreditCard(mockEvent, 'Chase Freedom', '1234');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'INSERT INTO credit_card (name, last4) VALUES (?, ?)'
				);
				expect(mockDb.bind).toHaveBeenCalledWith('Chase Freedom', '1234');
				expect(mockDb.run).toHaveBeenCalled();
			});

			it('should throw error when CCBILLING_DB not found', async () => {
				const eventWithoutDb = { platform: { env: {} } };

				await expect(createCreditCard(eventWithoutDb, 'Card', '1234')).rejects.toThrow(
					'CCBILLING_DB binding not found'
				);
			});
		});

		describe('getCreditCard', () => {
			it('should return a specific credit card', async () => {
				const mockCard = { id: 1, name: 'Chase Freedom', last4: '1234' };
				mockDb.first.mockResolvedValue(mockCard);

				const result = await getCreditCard(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM credit_card WHERE id = ?');
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(result).toEqual(mockCard);
			});
		});

		describe('updateCreditCard', () => {
			it('should update a credit card', async () => {
				mockDb.run.mockResolvedValue({});

				await updateCreditCard(mockEvent, 1, 'Updated Name', '9999');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'UPDATE credit_card SET name = ?, last4 = ? WHERE id = ?'
				);
				expect(mockDb.bind).toHaveBeenCalledWith('Updated Name', '9999', 1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('deleteCreditCard', () => {
			it('should delete a credit card', async () => {
				mockDb.run.mockResolvedValue({});

				await deleteCreditCard(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM credit_card WHERE id = ?');
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});
	});

	describe('Billing Cycle Functions', () => {
		describe('listBillingCycles', () => {
			it('should return list of billing cycles', async () => {
				const mockCycles = [
					{ id: 1, start_date: '2024-01-01', end_date: '2024-01-31' },
					{ id: 2, start_date: '2024-02-01', end_date: '2024-02-29' }
				];
				mockDb.all.mockResolvedValue({ results: mockCycles });

				const result = await listBillingCycles(mockEvent);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'SELECT * FROM billing_cycle ORDER BY start_date DESC'
				);
				expect(result).toEqual(mockCycles);
			});
		});

		describe('createBillingCycle', () => {
			it('should create a new billing cycle', async () => {
				mockDb.run.mockResolvedValue({});

				await createBillingCycle(mockEvent, '2024-01-01', '2024-01-31');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'INSERT INTO billing_cycle (start_date, end_date) VALUES (?, ?)'
				);
				expect(mockDb.bind).toHaveBeenCalledWith('2024-01-01', '2024-01-31');
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('getBillingCycle', () => {
			it('should return a specific billing cycle', async () => {
				const mockCycle = { id: 1, start_date: '2024-01-01', end_date: '2024-01-31' };
				mockDb.first.mockResolvedValue(mockCycle);

				const result = await getBillingCycle(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM billing_cycle WHERE id = ?');
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(result).toEqual(mockCycle);
			});
		});
	});

	describe('Budget Functions', () => {
		describe('listBudgets', () => {
			it('should return list of budgets', async () => {
				const mockBudgets = [
					{ id: 1, name: 'Groceries', created_at: '2024-01-01' },
					{ id: 2, name: 'Gas', created_at: '2024-01-02' }
				];
				mockDb.all.mockResolvedValue({ results: mockBudgets });

				const result = await listBudgets(mockEvent);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'SELECT * FROM budget ORDER BY created_at DESC'
				);
				expect(result).toEqual(mockBudgets);
			});
		});

		describe('getBudget', () => {
			it('should return a specific budget', async () => {
				const mockBudget = { id: 1, name: 'Groceries', created_at: '2024-01-01' };
				mockDb.first.mockResolvedValue(mockBudget);

				const result = await getBudget(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM budget WHERE id = ?');
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(result).toEqual(mockBudget);
			});
		});

		describe('createBudget', () => {
			it('should create a new budget', async () => {
				mockDb.run.mockResolvedValue({});

				await createBudget(mockEvent, 'Entertainment', '🎬');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'INSERT INTO budget (name, icon) VALUES (?, ?)'
				);
				expect(mockDb.bind).toHaveBeenCalledWith('Entertainment', '🎬');
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('updateBudget', () => {
			it('should update a budget', async () => {
				mockDb.run.mockResolvedValue({});

				await updateBudget(mockEvent, 1, 'Updated Budget', '🛒');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'UPDATE budget SET name = ?, icon = ? WHERE id = ?'
				);
				expect(mockDb.bind).toHaveBeenCalledWith('Updated Budget', '🛒', 1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('deleteBudget', () => {
			it('should delete a budget', async () => {
				mockDb.run.mockResolvedValue({});

				await deleteBudget(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM budget WHERE id = ?');
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('addBudgetMerchant', () => {
			it('should add a merchant to a budget', async () => {
				mockDb.run.mockResolvedValue({});

				await addBudgetMerchant(mockEvent, 1, 'Amazon');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'INSERT INTO budget_merchant (budget_id, merchant_normalized, merchant) VALUES (?, ?, ?)'
				);
				expect(mockDb.bind).toHaveBeenCalledWith(1, 'Amazon', 'Amazon');
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('removeBudgetMerchant', () => {
			it('should remove a merchant from a budget', async () => {
				mockDb.run.mockResolvedValue({});

				await removeBudgetMerchant(mockEvent, 1, 'Amazon');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'DELETE FROM budget_merchant WHERE budget_id = ? AND merchant_normalized = ?'
				);
				expect(mockDb.bind).toHaveBeenCalledWith(1, 'Amazon');
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('getBudgetMerchants', () => {
			it('should return merchants for a budget', async () => {
				const mockMerchants = [
					{ id: 1, budget_id: 1, merchant_normalized: 'Amazon', merchant: 'Amazon' },
					{ id: 2, budget_id: 1, merchant_normalized: 'Target', merchant: 'Target' }
				];
				mockDb.all.mockResolvedValue({ results: mockMerchants });

				const result = await getBudgetMerchants(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'SELECT * FROM budget_merchant WHERE budget_id = ? ORDER BY merchant_normalized ASC'
				);
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(result).toEqual(mockMerchants);
			});
		});

		describe('getAllUnassignedMerchants', () => {
			it('should return unassigned merchants excluding Amazon', async () => {
				const mockMerchants = [
					{ merchant_normalized: 'Walmart' },
					{ merchant_normalized: 'Target' },
					{ merchant_normalized: 'Grocery Store' }
				];
				mockDb.all.mockResolvedValue({ results: mockMerchants });

				const result = await getAllUnassignedMerchants(mockEvent);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining('WHERE bm.merchant_normalized IS NULL')
				);
				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining('AND p.merchant_normalized IS NOT NULL')
				);
				expect(result).toEqual(['Walmart', 'Target', 'Grocery Store']);
			});

			it('should throw error when CCBILLING_DB not found', async () => {
				const eventWithoutDb = { platform: { env: {} } };

				await expect(getAllUnassignedMerchants(eventWithoutDb)).rejects.toThrow(
					'CCBILLING_DB binding not found'
				);
			});
		});

		describe('getUnassignedMerchants', () => {
			it('should return all unassigned merchants', async () => {
				const mockMerchants = [
					{ merchant_normalized: 'Amazon' },
					{ merchant_normalized: 'Target' },
					{ merchant_normalized: 'Walmart' }
				];
				mockDb.all.mockResolvedValue({ results: mockMerchants });

				const result = await getUnassignedMerchants(mockEvent);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining('JOIN statement s ON p.statement_id = s.id')
				);
				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining('ORDER BY p.merchant_normalized ASC')
				);
				// Should NOT have date filter or LIMIT for all merchants
				expect(mockDb.prepare).not.toHaveBeenCalledWith(
					expect.stringContaining("AND s.uploaded_at >= datetime('now', '-30 days')")
				);
				expect(mockDb.prepare).not.toHaveBeenCalledWith(expect.stringContaining('LIMIT'));
				expect(result).toEqual(['Amazon', 'Target', 'Walmart']);
			});

			it('should throw error when CCBILLING_DB not found', async () => {
				const eventWithoutDb = { platform: { env: {} } };

				await expect(getUnassignedMerchants(eventWithoutDb)).rejects.toThrow(
					'CCBILLING_DB binding not found'
				);
			});
		});

		describe('getRecentUnassignedMerchants', () => {
			it('should return recent unassigned merchants from the past month', async () => {
				const mockMerchants = [
					{ merchant_normalized: 'Amazon' },
					{ merchant_normalized: 'Target' },
					{ merchant_normalized: 'Walmart' }
				];
				mockDb.all.mockResolvedValue({ results: mockMerchants });

				const result = await getRecentUnassignedMerchants(mockEvent);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining('JOIN statement s ON p.statement_id = s.id')
				);
				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining("AND s.uploaded_at >= datetime('now', '-30 days')")
				);
				expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('LIMIT 20'));
				expect(result).toEqual(['Amazon', 'Target', 'Walmart']);
			});

			it('should throw error when CCBILLING_DB not found', async () => {
				const eventWithoutDb = { platform: { env: {} } };

				await expect(getRecentUnassignedMerchants(eventWithoutDb)).rejects.toThrow(
					'CCBILLING_DB binding not found'
				);
			});
		});
	});

	describe('Statement Functions', () => {
		describe('listStatements', () => {
			it('should return statements for a billing cycle', async () => {
				const mockStatements = [
					{
						id: 1,
						billing_cycle_id: 1,
						credit_card_id: 1,
						filename: 'statement.pdf',
						credit_card_name: 'Chase Freedom',
						credit_card_last4: '1234'
					}
				];
				mockDb.all.mockResolvedValue({ results: mockStatements });

				const result = await listStatements(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining(
						'SELECT s.*, cc.name as credit_card_name, cc.last4 as credit_card_last4'
					)
				);
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(result).toEqual(mockStatements);
			});
		});

		describe('createStatement', () => {
			it('should create a new statement', async () => {
				mockDb.run.mockResolvedValue({ meta: { last_row_id: 123 } });

				await createStatement(
					mockEvent,
					1,
					2,
					'statement.pdf',
					'r2-key-123',
					'2024-02-15',
					'image-key-123'
				);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'INSERT INTO statement (billing_cycle_id, credit_card_id, filename, r2_key, statement_date, image_key) VALUES (?, ?, ?, ?, ?, ?)'
				);
				expect(mockDb.bind).toHaveBeenCalledWith(
					1,
					2,
					'statement.pdf',
					'r2-key-123',
					'2024-02-15',
					'image-key-123'
				);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('getStatement', () => {
			it('should return a specific statement', async () => {
				const mockStatement = {
					id: 1,
					filename: 'statement.pdf',
					r2_key: 'key-123',
					credit_card_name: 'Chase Freedom',
					credit_card_last4: '1234'
				};
				mockDb.first.mockResolvedValue(mockStatement);

				const result = await getStatement(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining(
						'SELECT s.*, cc.name as credit_card_name, cc.last4 as credit_card_last4'
					)
				);
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(result).toEqual(mockStatement);
			});
		});

		describe('deleteStatement', () => {
			it('should delete a statement', async () => {
				mockDb.run.mockResolvedValue({});

				await deleteStatement(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM statement WHERE id = ?');
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('updateStatementDate', () => {
			it('should update statement date', async () => {
				mockDb.run.mockResolvedValue({});

				await updateStatementDate(mockEvent, 1, '2024-02-15');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'UPDATE statement SET statement_date = ? WHERE id = ?'
				);
				expect(mockDb.bind).toHaveBeenCalledWith('2024-02-15', 1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});
	});

	describe('Payment/Charge Functions', () => {
		describe('createPayment', () => {
			it('should create a new payment', async () => {
				mockDb.run.mockResolvedValue({});

				await createPayment(mockEvent, 1, 'Amazon', 85.67, 'Both');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'INSERT INTO payment (statement_id, merchant, merchant_normalized, merchant_details, amount, allocated_to, transaction_date, is_foreign_currency, foreign_currency_amount, foreign_currency_type, flight_details, full_statement_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
				);
				expect(mockDb.bind).toHaveBeenCalledWith(
					1,
					'Amazon',
					'AMAZON',
					'',
					85.67,
					'Both',
					null,
					false,
					null,
					null,
					null,
					null
				);
				expect(mockDb.run).toHaveBeenCalled();
			});

			it('should create a new payment with transaction date', async () => {
				mockDb.run.mockResolvedValue({});

				await createPayment(mockEvent, 1, 'Amazon', 85.67, 'Both', '2024-01-15');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'INSERT INTO payment (statement_id, merchant, merchant_normalized, merchant_details, amount, allocated_to, transaction_date, is_foreign_currency, foreign_currency_amount, foreign_currency_type, flight_details, full_statement_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
				);
				expect(mockDb.bind).toHaveBeenCalledWith(
					1,
					'Amazon',
					'AMAZON',
					'',
					85.67,
					'Both',
					'2024-01-15',
					false,
					null,
					null,
					null,
					null
				);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('listChargesForCycle', () => {
			it('should return charges for a billing cycle with card info', async () => {
				const mockCharges = [
					{
						id: 1,
						merchant: 'Amazon',
						amount: 85.67,
						card_name: 'Chase Freedom',
						last4: '1234',
						flight_details: null
					},
					{
						id: 2,
						merchant: 'Target',
						amount: 45.32,
						card_name: 'Amex Gold',
						last4: '5678',
						flight_details: null
					}
				];
				mockDb.all.mockResolvedValue({ results: mockCharges });

				const result = await listChargesForCycle(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining(
						'SELECT p.id, p.statement_id, p.merchant, p.merchant_normalized, p.amount, p.allocated_to, p.transaction_date, p.is_foreign_currency, p.foreign_currency_amount, p.foreign_currency_type, p.flight_details, p.full_statement_text, p.created_at, s.credit_card_id, c.name as card_name, c.last4'
					)
				);
				expect(mockDb.bind).toHaveBeenCalledWith(1);

				// Check that the result includes the expected fields plus the new amazon_order_id
				expect(result).toHaveLength(2);
				expect(result[0]).toMatchObject({
					id: 1,
					merchant: 'Amazon',
					amount: 85.67,
					card_name: 'Chase Freedom',
					last4: '1234',
					flight_details: null,
					amazon_order_id: null
				});
				expect(result[1]).toMatchObject({
					id: 2,
					merchant: 'Target',
					amount: 45.32,
					card_name: 'Amex Gold',
					last4: '5678',
					flight_details: null,
					amazon_order_id: null
				});
			});
		});

		describe('getPayment', () => {
			it('should return a specific payment with card info', async () => {
				const mockPayment = {
					id: 1,
					merchant: 'Amazon',
					amount: 85.67,
					card_name: 'Chase',
					last4: '1234'
				};
				mockDb.first.mockResolvedValue(mockPayment);

				const result = await getPayment(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith(
					expect.stringContaining(
						'SELECT p.id, p.statement_id, p.merchant, p.merchant_normalized, p.amount, p.allocated_to, p.transaction_date, p.is_foreign_currency, p.foreign_currency_amount, p.foreign_currency_type, p.flight_details, p.full_statement_text, p.created_at, s.credit_card_id, c.name as card_name, c.last4'
					)
				);
				expect(mockDb.bind).toHaveBeenCalledWith(1);

				// Check that the result includes the expected fields plus the new fields
				expect(result).toMatchObject({
					id: 1,
					merchant: 'Amazon',
					amount: 85.67,
					card_name: 'Chase',
					last4: '1234',
					flight_details: null,
					amazon_order_id: null
				});
			});
		});

		describe('updatePayment', () => {
			it('should update a payment', async () => {
				mockDb.run.mockResolvedValue({});

				await updatePayment(mockEvent, 1, 'Updated Merchant', 99.99, 'Nick');

				expect(mockDb.prepare).toHaveBeenCalledWith(
					'UPDATE payment SET merchant = ?, amount = ?, allocated_to = ? WHERE id = ?'
				);
				expect(mockDb.bind).toHaveBeenCalledWith('Updated Merchant', 99.99, 'Nick', 1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});

		describe('bulkAssignPayments', () => {
			it('should bulk update multiple payments', async () => {
				mockDb.run.mockResolvedValue({});
				const assignments = [
					{ id: 1, allocated_to: 'Nick' },
					{ id: 2, allocated_to: 'Tas' }
				];

				await bulkAssignPayments(mockEvent, assignments);

				expect(mockDb.prepare).toHaveBeenCalledTimes(2);
				expect(mockDb.bind).toHaveBeenCalledWith('Nick', 1);
				expect(mockDb.bind).toHaveBeenCalledWith('Tas', 2);
				expect(mockDb.run).toHaveBeenCalledTimes(2);
			});
		});

		describe('deletePaymentsForStatement', () => {
			it('should delete all payments for a statement', async () => {
				mockDb.run.mockResolvedValue({});

				await deletePaymentsForStatement(mockEvent, 1);

				expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM payment WHERE statement_id = ?');
				expect(mockDb.bind).toHaveBeenCalledWith(1);
				expect(mockDb.run).toHaveBeenCalled();
			});
		});
	});
});
