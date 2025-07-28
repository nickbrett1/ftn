/**
 * List all credit cards in the CCBILLING_DB.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array>}
 */
export async function listCreditCards(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db.prepare('SELECT * FROM credit_card ORDER BY created_at DESC').all();
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
export async function closeBillingCycle(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('UPDATE billing_cycle SET closed = 1 WHERE id = ?').bind(id).run();
}

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
 */
export async function createBudget(event, name) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('INSERT INTO budget (name) VALUES (?)').bind(name).run();
}

/**
 * Update a budget by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 * @param {string} name
 */
export async function updateBudget(event, id, name) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('UPDATE budget SET name = ? WHERE id = ?').bind(name, id).run();
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
 * @param {string} merchant
 */
export async function addBudgetMerchant(event, budget_id, merchant) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('INSERT INTO budget_merchant (budget_id, merchant) VALUES (?, ?)')
		.bind(budget_id, merchant)
		.run();
}

/**
 * Remove a merchant from a budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} budget_id
 * @param {string} merchant
 */
export async function removeBudgetMerchant(event, budget_id, merchant) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare('DELETE FROM budget_merchant WHERE budget_id = ? AND merchant = ?')
		.bind(budget_id, merchant)
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
		.prepare('SELECT * FROM budget_merchant WHERE budget_id = ?')
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
			JOIN credit_card cc ON s.credit_card_id = cc.id
			WHERE s.billing_cycle_id = ?
			ORDER BY s.uploaded_at DESC
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
			JOIN credit_card cc ON s.credit_card_id = cc.id
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
	statement_date
) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare(
			'INSERT INTO statement (billing_cycle_id, credit_card_id, filename, r2_key, statement_date) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(billing_cycle_id, credit_card_id, filename, r2_key, statement_date)
		.run();
}

/**
 * Delete a statement by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 */
export async function deleteStatement(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('DELETE FROM statement WHERE id = ?').bind(id).run();
}

/**
 * Create a new payment/charge.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} statement_id
 * @param {string} merchant
 * @param {number} amount
 * @param {string} allocated_to
 */
export async function createPayment(event, statement_id, merchant, amount, allocated_to) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db
		.prepare(
			'INSERT INTO payment (statement_id, merchant, amount, allocated_to) VALUES (?, ?, ?, ?)'
		)
		.bind(statement_id, merchant, amount, allocated_to)
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
			SELECT p.*, s.credit_card_id, c.name as card_name, c.last4
			FROM payment p
			JOIN statement s ON p.statement_id = s.id
			JOIN credit_card c ON s.credit_card_id = c.id
			WHERE s.billing_cycle_id = ?
			ORDER BY p.created_at DESC
		`
		)
		.bind(billing_cycle_id)
		.all();
	return results;
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
			SELECT p.*, s.credit_card_id, c.name as card_name, c.last4
			FROM payment p
			JOIN statement s ON p.statement_id = s.id
			JOIN credit_card c ON s.credit_card_id = c.id
			WHERE p.id = ?
		`
		)
		.bind(id)
		.first();
	return result;
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
