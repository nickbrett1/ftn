import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';
import {
	extractAmazonOrderId,
	extractAmazonOrderIdFromMultiLine
} from '$lib/server/amazon-orders-service.js';

/**
 * List all credit cards in the CCBILLING_DB.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array>}
 */
export async function listCreditCards(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db.prepare('SELECT * FROM credit_card ORDER BY name ASC').all();
	return results;
}

/**
 * Get a single credit card by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getCreditCard(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const result = await db.prepare('SELECT * FROM credit_card WHERE id = ?').bind(id).first();
	return result;
}

/**
 * Create a new credit card.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} name
 * @param {string} last4
 */
export async function createCreditCard(event, name, last4) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('INSERT INTO credit_card (name, last4) VALUES (?, ?)').bind(name, last4).run();
}

/**
 * Update a credit card by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @param {string} name
 * @param {string} last4
 */
export async function updateCreditCard(event, id, name, last4) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('UPDATE credit_card SET name = ?, last4 = ? WHERE id = ?')
		.bind(name, last4, id)
		.run();
}

/**
 * Delete a credit card by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 */
export async function deleteCreditCard(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('DELETE FROM credit_card WHERE id = ?').bind(id).run();
}

/**
 * List all billing cycles.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array>}
 */
export async function listBillingCycles(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db
		.prepare('SELECT * FROM billing_cycle ORDER BY start_date DESC')
		.all();
	return results;
}

/**
 * Get a single billing cycle by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getBillingCycle(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const result = await db.prepare('SELECT * FROM billing_cycle WHERE id = ?').bind(id).first();
	return result;
}

/**
 * Create a new billing cycle.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} start_date
 * @param {string} end_date
 */
export async function createBillingCycle(event, start_date, end_date) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('INSERT INTO billing_cycle (start_date, end_date) VALUES (?, ?)')
		.bind(start_date, end_date)
		.run();
}

/**
 * Close a billing cycle by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 */

/**
 * Delete a billing cycle by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 */
export async function deleteBillingCycle(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('DELETE FROM billing_cycle WHERE id = ?').bind(id).run();
}

/**
 * List all budgets.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array>}
 */
export async function listBudgets(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db.prepare('SELECT * FROM budget ORDER BY created_at DESC').all();
	return results;
}

/**
 * Get a single budget by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getBudget(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const result = await db.prepare('SELECT * FROM budget WHERE id = ?').bind(id).first();
	return result;
}

/**
 * Create a new budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} name
 * @param {string} icon
 */
export async function createBudget(event, name, icon = null) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('INSERT INTO budget (name, icon) VALUES (?, ?)').bind(name, icon).run();
}

/**
 * Update a budget by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @param {string} name
 * @param {string} icon
 */
export async function updateBudget(event, id, name, icon = null) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('UPDATE budget SET name = ?, icon = ? WHERE id = ?').bind(name, icon, id).run();
}

/**
 * Delete a budget by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 */
export async function deleteBudget(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('DELETE FROM budget WHERE id = ?').bind(id).run();
}

/**
 * Add a merchant to a budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} budget_id
 * @param {string} merchant_normalized - The normalized merchant identifier
 */
export async function addBudgetMerchant(event, budget_id, merchant_normalized) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	
	// Use INSERT OR IGNORE to handle the unique constraint gracefully
	// If the merchant is already assigned to a budget, this will silently ignore the insert
	await db
		.prepare(
			'INSERT OR IGNORE INTO budget_merchant (budget_id, merchant_normalized) VALUES (?, ?)'
		)
		.bind(budget_id, merchant_normalized)
		.run();
}

/**
 * Remove a merchant from a budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} budget_id
 * @param {string} merchant_normalized - The normalized merchant identifier
 */
export async function removeBudgetMerchant(event, budget_id, merchant_normalized) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('DELETE FROM budget_merchant WHERE budget_id = ? AND merchant_normalized = ?')
		.bind(budget_id, merchant_normalized)
		.run();
}

/**
 * Get all merchants for a budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} budget_id
 * @returns {Promise<Array>}
 */
export async function getBudgetMerchants(event, budget_id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db
		.prepare('SELECT * FROM budget_merchant WHERE budget_id = ? ORDER BY merchant_normalized ASC')
		.bind(budget_id)
		.all();
	return results;
}

/**
 * List all statements for a billing cycle.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} billing_cycle_id
 * @returns {Promise<Array>}
 */
export async function listStatements(event, billing_cycle_id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db
		.prepare(
			`
			SELECT s.*, cc.name as credit_card_name, cc.last4 as credit_card_last4
			FROM statement s
			LEFT JOIN credit_card cc ON s.credit_card_id = cc.id
			WHERE s.billing_cycle_id = ?
			ORDER BY cc.name ASC, s.uploaded_at DESC
		`
		)
		.bind(billing_cycle_id)
		.all();
	return results;
}

/**
 * Get a single statement by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getStatement(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const result = await db
		.prepare(
			`
			SELECT s.*, cc.name as credit_card_name, cc.last4 as credit_card_last4
			FROM statement s
			LEFT JOIN credit_card cc ON s.credit_card_id = cc.id
			WHERE s.id = ?
		`
		)
		.bind(id)
		.first();
	return result;
}

/**
 * Create a new statement.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} billing_cycle_id
 * @param {number} credit_card_id
 * @param {string} filename
 * @param {string} r2_key
 * @param {string} statement_date
 */
export async function createStatement(
	event,
	billing_cycle_id,
	credit_card_id,
	filename,
	r2_key,
	statement_date,
	image_key = null
) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');

	const result = await db
		.prepare(
			'INSERT INTO statement (billing_cycle_id, credit_card_id, filename, r2_key, statement_date, image_key) VALUES (?, ?, ?, ?, ?, ?)'
		)
		.bind(billing_cycle_id, credit_card_id, filename, r2_key, statement_date, image_key)
		.run();

	return result.meta.last_row_id;
}

/**
 * Update statement with image key after PDF-to-image conversion
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @param {string} image_key
 */
export async function updateStatementImageKey(event, id, image_key) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('UPDATE statement SET image_key = ? WHERE id = ?').bind(image_key, id).run();
}

/**
 * Update statement with identified credit card
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @param {number} credit_card_id
 */
export async function updateStatementCreditCard(event, id, credit_card_id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('UPDATE statement SET credit_card_id = ? WHERE id = ?')
		.bind(credit_card_id, id)
		.run();
}

/**
 * Update statement with parsed statement date
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @param {string} statement_date
 */
export async function updateStatementDate(event, id, statement_date) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('UPDATE statement SET statement_date = ? WHERE id = ?')
		.bind(statement_date, id)
		.run();
}

/**
 * Delete a statement by id and all associated charges.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 */
export async function deleteStatement(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');

	// Delete all payments/charges for this statement first
	await deletePaymentsForStatement(event, id);

	// Then delete the statement
	await db.prepare('DELETE FROM statement WHERE id = ?').bind(id).run();
}

/**
 * Create a new payment/charge.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} statement_id
 * @param {string} merchant
 * @param {number} amount
 * @param {string} allocated_to
 * @param {string} transaction_date
 */
export async function createPayment(
	event,
	statement_id,
	merchant,
	amount,
	allocated_to,
	transaction_date = null,
	is_foreign_currency = false,
	foreign_currency_amount = null,
	foreign_currency_type = null,
	flight_details = null,
	full_statement_text = null
) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');

	// Normalize the merchant
	const normalized = normalizeMerchant(merchant);

	await db
		.prepare(
			'INSERT INTO payment (statement_id, merchant, merchant_normalized, merchant_details, amount, allocated_to, transaction_date, is_foreign_currency, foreign_currency_amount, foreign_currency_type, flight_details, full_statement_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(
			statement_id,
			merchant,
			normalized.merchant_normalized,
			normalized.merchant_details,
			amount,
			allocated_to,
			transaction_date,
			is_foreign_currency,
			foreign_currency_amount,
			foreign_currency_type,
			flight_details ? JSON.stringify(flight_details) : null,
			full_statement_text
		)
		.run();
}

/**
 * List all payments/charges for a billing cycle.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} billing_cycle_id
 * @returns {Promise<Array>}
 */
export async function listChargesForCycle(event, billing_cycle_id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db
		.prepare(
			`
			SELECT p.id, p.statement_id, p.merchant, p.merchant_normalized, p.amount, p.allocated_to, p.transaction_date, p.is_foreign_currency, p.foreign_currency_amount, p.foreign_currency_type, p.flight_details, p.full_statement_text, p.created_at, s.credit_card_id, c.name as card_name, c.last4
			FROM payment p
			JOIN statement s ON p.statement_id = s.id
			JOIN credit_card c ON s.credit_card_id = c.id
			WHERE s.billing_cycle_id = ?
			ORDER BY p.transaction_date ASC, p.created_at ASC
		`
		)
		.bind(billing_cycle_id)
		.all();

	// Parse flight_details JSON for each charge and add Amazon order ID if applicable
	return results.map((charge) => ({
		...charge,
		flight_details: charge.flight_details ? JSON.parse(charge.flight_details) : null,
		amazon_order_id: charge.full_statement_text
			? extractAmazonOrderIdFromMultiLine(charge.full_statement_text)
			: extractAmazonOrderId(charge.merchant)
	}));
}

/**
 * Get a single payment/charge by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getPayment(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const result = await db
		.prepare(
			`
			SELECT p.id, p.statement_id, p.merchant, p.merchant_normalized, p.amount, p.allocated_to, p.transaction_date, p.is_foreign_currency, p.foreign_currency_amount, p.foreign_currency_type, p.flight_details, p.full_statement_text, p.created_at, s.credit_card_id, c.name as card_name, c.last4
			FROM payment p
			JOIN statement s ON p.statement_id = s.id
			JOIN credit_card c ON s.credit_card_id = c.id
			WHERE p.id = ?
		`
		)
		.bind(id)
		.first();

	if (!result) return null;

	// Parse flight_details JSON and add Amazon order ID if applicable
	return {
		...result,
		flight_details: result.flight_details ? JSON.parse(result.flight_details) : null,
		amazon_order_id: result.full_statement_text
			? extractAmazonOrderIdFromMultiLine(result.full_statement_text)
			: extractAmazonOrderId(result.merchant)
	};
}

/**
 * Update a payment/charge (mainly for budget assignment).
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @param {string} merchant
 * @param {number} amount
 * @param {string} allocated_to
 */
export async function updatePayment(event, id, merchant, amount, allocated_to) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('UPDATE payment SET merchant = ?, amount = ?, allocated_to = ? WHERE id = ?')
		.bind(merchant, amount, allocated_to, id)
		.run();
}

/**
 * Bulk update payments/charges for budget assignment.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {Array<{id: number, allocated_to: string}>} assignments
 */
export async function bulkAssignPayments(event, assignments) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');

	// Use a transaction for bulk updates
	for (const assignment of assignments) {
		await db
			.prepare('UPDATE payment SET allocated_to = ? WHERE id = ?')
			.bind(assignment.allocated_to, assignment.id)
			.run();
	}
}

/**
 * Delete all payments for a statement (useful when re-parsing).
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} statement_id
 */
export async function deletePaymentsForStatement(event, statement_id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('DELETE FROM payment WHERE statement_id = ?').bind(statement_id).run();
}

/**
 * Get all unique merchants from uploaded statements that haven't been assigned to any budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array<string>>}
 */
export async function getAllUnassignedMerchants(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');

	// Get all unique normalized merchants from payments that don't have an allocated_to budget
	// Amazon is now included since it's properly normalized
	const { results } = await db
		.prepare(
			`
            SELECT DISTINCT p.merchant_normalized
            FROM payment p
            LEFT JOIN budget_merchant bm ON bm.merchant_normalized = p.merchant_normalized
            WHERE bm.merchant_normalized IS NULL
              AND p.merchant_normalized IS NOT NULL
            ORDER BY p.merchant_normalized ASC
        `
		)
		.all();

	return results.map((row) => row.merchant_normalized);
}

/**
 * Return recent merchants from the past month of statements that are unassigned to any budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array<string>>}
 */
export async function getUnassignedMerchants(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');

	try {
		// Get the 20 most recent merchants from statements in the last 30 days
		// that are not assigned to ANY budget (merchants can only be assigned to one budget)
		const { results } = await db
			.prepare(
				`
                SELECT DISTINCT p.merchant_normalized
                FROM payment p
                JOIN statement s ON p.statement_id = s.id
                WHERE p.merchant_normalized IS NOT NULL
                  AND s.uploaded_at >= datetime('now', '-30 days')
                  AND NOT EXISTS (
                    SELECT 1 FROM budget_merchant bm 
                    WHERE bm.merchant_normalized = p.merchant_normalized
                  )
                ORDER BY s.uploaded_at DESC
                LIMIT 20
            `
			)
			.all();

		return results.map((row) => row.merchant_normalized);
	} catch (error) {
		console.error('Error in getUnassignedMerchants:', error);
		throw new Error(`Failed to fetch recent merchants: ${error.message}`);
	}
}

/**
 * Return the budget (if any) that a merchant is already assigned to.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} merchant_normalized - The normalized merchant identifier
 * @returns {Promise<{id:number, name:string} | null>}
 */
export async function getBudgetByMerchant(event, merchant_normalized) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const result = await db
		.prepare(
			`
            SELECT b.id, b.name
            FROM budget_merchant bm
            JOIN budget b ON b.id = bm.budget_id
            WHERE bm.merchant_normalized = ?
        `
		)
		.bind(merchant_normalized)
		.first();
	return result || null;
}

/**
 * List all merchant → budget name mappings.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array<{ merchant_normalized: string, budget_name: string }>>}
 */
export async function listBudgetMerchantMappings(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db
		.prepare(
			`
            SELECT bm.merchant_normalized AS merchant_normalized, b.name AS budget_name
            FROM budget_merchant bm
            JOIN budget b ON b.id = bm.budget_id
        `
		)
		.all();
	return results;
}

/**
 * Return allocation totals per billing cycle and per budget (including unallocated).
 * Each row contains: { cycle_id: number, allocated_to: string | null, total_amount: number }
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array<{cycle_id:number, allocated_to:string|null, total_amount:number}>>}
 */
export async function listAllocationTotalsByCycle(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db
		.prepare(
			`
            SELECT s.billing_cycle_id AS cycle_id,
                   p.allocated_to AS allocated_to,
                   SUM(p.amount) AS total_amount
            FROM payment p
            JOIN statement s ON p.statement_id = s.id
            GROUP BY s.billing_cycle_id, p.allocated_to
        `
		)
		.all();
	return results;
}

/**
 * Refresh auto-associations for all charges within a billing cycle by assigning
 * allocated_to based on current merchant → budget mappings.
 * This will overwrite existing allocations when a mapping exists.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} billing_cycle_id
 * @returns {Promise<number>} number of rows updated
 */
export async function refreshAutoAssociationsForCycle(event, billing_cycle_id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');

	const result = await db
		.prepare(
			`
            UPDATE payment AS p
            SET allocated_to = (
                SELECT b.name
                FROM budget_merchant bm
                JOIN budget b ON b.id = bm.budget_id
                WHERE bm.merchant_normalized = p.merchant_normalized
                LIMIT 1
            )
            WHERE p.statement_id IN (
                SELECT s.id FROM statement s WHERE s.billing_cycle_id = ?
            )
            AND EXISTS (
                SELECT 1 FROM budget_merchant bm2 WHERE bm2.merchant_normalized = p.merchant_normalized
            )
        `
		)
		.bind(billing_cycle_id)
		.run();

	return result.meta?.changes ?? 0;
}
