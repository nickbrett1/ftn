import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';

/**
 * List all credit cards in the CCBILLING_DB.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array>}
 */
export async function listCreditCards(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for listCreditCards');
		return [
			{ id: 1, name: 'Chase Sapphire', last4: '1234' },
			{ id: 2, name: 'Amex Gold', last4: '5678' },
			{ id: 3, name: 'Citi Double Cash', last4: '9012' }
		];
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getCreditCard');
		return {
			id: id,
			name: 'Chase Sapphire',
			last4: '1234'
		};
	}
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
	if (!db) {
		// Local development mode - log the creation
		console.log('[DEV] CCBILLING_DB binding not found, logging createCreditCard:', { name, last4 });
		return;
	}
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
	if (!db) {
		// Local development mode - log the update
		console.log('[DEV] CCBILLING_DB binding not found, logging updateCreditCard:', { id, name, last4 });
		return;
	}
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
	if (!db) {
		// Local development mode - log the deletion
		console.log('[DEV] CCBILLING_DB binding not found, logging deleteCreditCard:', { id });
		return;
	}
	await db.prepare('DELETE FROM credit_card WHERE id = ?').bind(id).run();
}

/**
 * List all billing cycles.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array>}
 */
export async function listBillingCycles(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for listBillingCycles');
		return [
			{ id: 1, start_date: '2024-01-01', end_date: '2024-01-31', created_at: '2024-01-01T00:00:00Z' },
			{ id: 2, start_date: '2024-02-01', end_date: '2024-02-29', created_at: '2024-02-01T00:00:00Z' }
		];
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getBillingCycle');
		return {
			id: id,
			start_date: '2024-01-01',
			end_date: '2024-01-31',
			created_at: '2024-01-01T00:00:00Z'
		};
	}
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
	if (!db) {
		// Local development mode - log the creation
		console.log('[DEV] CCBILLING_DB binding not found, logging createBillingCycle:', { start_date, end_date });
		return;
	}
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
	if (!db) {
		// Local development mode - log the deletion
		console.log('[DEV] CCBILLING_DB binding not found, logging deleteBillingCycle:', { id });
		return;
	}
	await db.prepare('DELETE FROM billing_cycle WHERE id = ?').bind(id).run();
}

/**
 * List all budgets.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array>}
 */
export async function listBudgets(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for listBudgets');
		return [
			{ id: 1, name: 'Entertainment', icon: '🎬', created_at: '2024-01-01T00:00:00Z' },
			{ id: 2, name: 'Food & Dining', icon: '🍽️', created_at: '2024-01-01T00:00:00Z' },
			{ id: 3, name: 'Transportation', icon: '🚗', created_at: '2024-01-01T00:00:00Z' },
			{ id: 4, name: 'Travel', icon: '✈️', created_at: '2024-01-01T00:00:00Z' }
		];
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getBudget');
		return {
			id: id,
			name: 'Entertainment',
			icon: '🎬',
			created_at: '2024-01-01T00:00:00Z'
		};
	}
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
	if (!db) {
		// Local development mode - log the creation
		console.log('[DEV] CCBILLING_DB binding not found, logging createBudget:', { name, icon });
		return;
	}
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
	if (!db) {
		// Local development mode - log the update
		console.log('[DEV] CCBILLING_DB binding not found, logging updateBudget:', { id, name, icon });
		return;
	}
	await db.prepare('UPDATE budget SET name = ?, icon = ? WHERE id = ?').bind(name, icon, id).run();
}

/**
 * Delete a budget by id.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {number} id
 */
export async function deleteBudget(event, id) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		// Local development mode - log the deletion
		console.log('[DEV] CCBILLING_DB binding not found, logging deleteBudget:', { id });
		return;
	}
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
	if (!db) {
		// Local development mode - log the addition
		console.log('[DEV] CCBILLING_DB binding not found, logging addBudgetMerchant:', { budget_id, merchant_normalized });
		return;
	}
	await db
		.prepare(
			'INSERT INTO budget_merchant (budget_id, merchant_normalized, merchant) VALUES (?, ?, ?)'
		)
		.bind(budget_id, merchant_normalized, merchant_normalized) // Store in both columns for compatibility
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
	if (!db) {
		// Local development mode - log the removal
		console.log('[DEV] CCBILLING_DB binding not found, logging removeBudgetMerchant:', { budget_id, merchant_normalized });
		return;
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getBudgetMerchants');
		return [
			{ id: 1, budget_id: budget_id, merchant_normalized: 'NETFLIX' },
			{ id: 2, budget_id: budget_id, merchant_normalized: 'SPOTIFY' }
		];
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for listStatements');
		return [
			{
				id: 1,
				billing_cycle_id: billing_cycle_id,
				credit_card_id: 1,
				filename: 'chase_statement_jan_2024.pdf',
				r2_key: 'statements/chase_statement_jan_2024.pdf',
				statement_date: '2024-01-31',
				uploaded_at: '2024-01-15T10:00:00Z',
				credit_card_name: 'Chase Sapphire',
				credit_card_last4: '1234'
			}
		];
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getStatement');
		return {
			id: id,
			billing_cycle_id: 1,
			credit_card_id: 1,
			filename: 'chase_statement_jan_2024.pdf',
			r2_key: 'statements/chase_statement_jan_2024.pdf',
			statement_date: '2024-01-31',
			uploaded_at: '2024-01-15T10:00:00Z',
			credit_card_name: 'Chase Sapphire',
			credit_card_last4: '1234'
		};
	}
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
	if (!db) {
		// Local development mode - log the creation and return mock ID
		console.log('[DEV] CCBILLING_DB binding not found, logging createStatement:', { billing_cycle_id, credit_card_id, filename, r2_key, statement_date, image_key });
		return 1; // Return mock statement ID
	}

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
	if (!db) {
		// Local development mode - log the update
		console.log('[DEV] CCBILLING_DB binding not found, logging updateStatementImageKey:', { id, image_key });
		return;
	}
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
	if (!db) {
		// Local development mode - log the update
		console.log('[DEV] CCBILLING_DB binding not found, logging updateStatementCreditCard:', { id, credit_card_id });
		return;
	}
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
	if (!db) {
		// Local development mode - log the update
		console.log('[DEV] CCBILLING_DB binding not found, logging updateStatementDate:', { id, statement_date });
		return;
	}
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
	if (!db) {
		// Local development mode - log the deletion
		console.log('[DEV] CCBILLING_DB binding not found, logging deleteStatement:', { id });
		return;
	}

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
	flight_details = null
) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		// Local development mode - log the creation
		console.log('[DEV] CCBILLING_DB binding not found, logging createPayment:', { statement_id, merchant, amount, allocated_to, transaction_date, is_foreign_currency, foreign_currency_amount, foreign_currency_type, flight_details });
		return;
	}

	// Normalize the merchant
	const normalized = normalizeMerchant(merchant);

	await db
		.prepare(
			'INSERT INTO payment (statement_id, merchant, merchant_normalized, merchant_details, amount, allocated_to, transaction_date, is_foreign_currency, foreign_currency_amount, foreign_currency_type, flight_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
			flight_details ? JSON.stringify(flight_details) : null
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for listChargesForCycle');
		return [
			{
				id: 1,
				statement_id: 1,
				merchant: 'AMAZON',
				merchant_normalized: 'AMAZON',
				merchant_details: '',
				amount: 29.99,
				allocated_to: null,
				transaction_date: '2024-01-15',
				is_foreign_currency: false,
				foreign_currency_amount: null,
				foreign_currency_type: null,
				flight_details: null,
				created_at: '2024-01-15T10:00:00Z'
			},
			{
				id: 2,
				statement_id: 1,
				merchant: 'STARBUCKS',
				merchant_normalized: 'STARBUCKS',
				merchant_details: '',
				amount: 5.67,
				allocated_to: 'Food & Dining',
				transaction_date: '2024-01-16',
				is_foreign_currency: false,
				foreign_currency_amount: null,
				foreign_currency_type: null,
				flight_details: null,
				created_at: '2024-01-16T10:00:00Z'
			}
		];
	}
	const { results } = await db
		.prepare(
			`
			SELECT p.id, p.statement_id, p.merchant, p.amount, p.allocated_to, p.transaction_date, p.is_foreign_currency, p.foreign_currency_amount, p.foreign_currency_type, p.flight_details, p.created_at, s.credit_card_id, c.name as card_name, c.last4
			FROM payment p
			JOIN statement s ON p.statement_id = s.id
			JOIN credit_card c ON s.credit_card_id = c.id
			WHERE s.billing_cycle_id = ?
			ORDER BY p.transaction_date ASC, p.created_at ASC
		`
		)
		.bind(billing_cycle_id)
		.all();

	// Parse flight_details JSON for each charge
	return results.map((charge) => ({
		...charge,
		flight_details: charge.flight_details ? JSON.parse(charge.flight_details) : null
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getPayment');
		return {
			id: id,
			statement_id: 1,
			merchant: 'AMAZON',
			amount: 29.99,
			allocated_to: null,
			transaction_date: '2024-01-15',
			is_foreign_currency: false,
			foreign_currency_amount: null,
			foreign_currency_type: null,
			flight_details: null,
			created_at: '2024-01-15T10:00:00Z',
			credit_card_id: 1,
			card_name: 'Chase Sapphire',
			last4: '1234'
		};
	}
	const result = await db
		.prepare(
			`
			SELECT p.id, p.statement_id, p.merchant, p.amount, p.allocated_to, p.transaction_date, p.is_foreign_currency, p.foreign_currency_amount, p.foreign_currency_type, p.flight_details, p.created_at, s.credit_card_id, c.name as card_name, c.last4
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
	if (!db) {
		// Local development mode - log the update
		console.log('[DEV] CCBILLING_DB binding not found, logging updatePayment:', { id, merchant, amount, allocated_to });
		return;
	}
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
	if (!db) {
		// Local development mode - log the bulk assignments
		console.log('[DEV] CCBILLING_DB binding not found, logging bulkAssignPayments:', assignments);
		return;
	}

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
	if (!db) {
		// Local development mode - log the deletion
		console.log('[DEV] CCBILLING_DB binding not found, logging deletePaymentsForStatement:', statement_id);
		return;
	}
	await db.prepare('DELETE FROM payment WHERE statement_id = ?').bind(statement_id).run();
}

/**
 * Get all unique merchants from uploaded statements that haven't been assigned to any budget.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array<string>>}
 */
export async function getUnassignedMerchants(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getUnassignedMerchants');
		return [
			'AMAZON',
			'TARGET',
			'WALMART',
			'COSTCO',
			'TRADER JOES',
			'STARBUCKS',
			'UBER EATS',
			'DOORDASH',
			'LYFT',
			'UNITED AIRLINES',
			'AMERICAN AIRLINES',
			'DELTA AIRLINES',
			'MARRIOTT',
			'HILTON',
			'NETFLIX',
			'SPOTIFY',
			'APPLE',
			'GOOGLE',
			'MICROSOFT',
			'ADOBE',
			'CAVIAR',
			'GRUBHUB',
			'INSTACART',
			'SHIPT',
			'WHOLE FOODS',
			'SAFEWAY',
			'ALBERTSONS',
			'KROGER',
			'PUBLIX',
			'MEIJER',
			'HYVEE'
		];
	}

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
 * Return recent merchants from the past month of statements that are unassigned.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns {Promise<Array<string>>}
 */
export async function getRecentMerchants(event) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getRecentMerchants');
		return [
			'AMAZON',
			'TARGET',
			'WALMART',
			'COSTCO',
			'TRADER JOES',
			'STARBUCKS',
			'UBER EATS',
			'DOORDASH',
			'LYFT',
			'UNITED AIRLINES',
			'AMERICAN AIRLINES',
			'DELTA AIRLINES',
			'MARRIOTT',
			'HILTON',
			'NETFLIX',
			'SPOTIFY',
			'APPLE',
			'GOOGLE',
			'MICROSOFT',
			'ADOBE'
		];
	}

	// Log the query for debugging
	console.log('[DEBUG] Executing getRecentMerchants query');

	// First, verify the database connection with a simple query
	try {
		const healthCheck = await db.prepare('SELECT 1 as test').first();
		console.log('[DEBUG] Database health check passed:', healthCheck);
	} catch (healthError) {
		console.error('[DEBUG] Database health check failed:', healthError);
		throw new Error(`Database connection failed: ${healthError.message}`);
	}

	try {
		// Get the 20 most recent merchants from statements in the last 30 days that don't have budget assignments
		// Using a simpler approach: get merchants from recent payments, then filter out assigned ones
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

		const merchants = results.map((row) => row.merchant_normalized);
		console.log(`[DEBUG] getRecentMerchants returned ${merchants.length} merchants:`, merchants);
		
		// If no recent merchants found, fall back to unassigned merchants
		if (merchants.length === 0) {
			console.log('[DEBUG] No recent merchants found, falling back to unassigned merchants');
			return await getUnassignedMerchants(event);
		}
		
		return merchants;
	} catch (error) {
		console.error('Error in getRecentMerchants:', error);
		console.log('[DEBUG] Falling back to unassigned merchants due to error');
		
		// Fall back to unassigned merchants if the recent query fails
		try {
			return await getUnassignedMerchants(event);
		} catch (fallbackError) {
			console.error('Fallback to getUnassignedMerchants also failed:', fallbackError);
			throw new Error(`Failed to fetch recent merchants: ${error.message}`);
		}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for getBudgetByMerchant');
		// Return null to simulate no budget assignment
		return null;
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for listBudgetMerchantMappings');
		return [
			{ merchant_normalized: 'NETFLIX', budget_name: 'Entertainment' },
			{ merchant_normalized: 'SPOTIFY', budget_name: 'Entertainment' },
			{ merchant_normalized: 'STARBUCKS', budget_name: 'Food & Dining' },
			{ merchant_normalized: 'UBER EATS', budget_name: 'Food & Dining' },
			{ merchant_normalized: 'DOORDASH', budget_name: 'Food & Dining' },
			{ merchant_normalized: 'LYFT', budget_name: 'Transportation' },
			{ merchant_normalized: 'UNITED AIRLINES', budget_name: 'Travel' },
			{ merchant_normalized: 'MARRIOTT', budget_name: 'Travel' }
		];
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for listAllocationTotalsByCycle');
		return [
			{ cycle_id: 1, allocated_to: 'Entertainment', total_amount: 29.99 },
			{ cycle_id: 1, allocated_to: 'Food & Dining', total_amount: 156.78 },
			{ cycle_id: 1, allocated_to: 'Transportation', total_amount: 89.45 },
			{ cycle_id: 1, allocated_to: 'Travel', total_amount: 1250.00 },
			{ cycle_id: 1, allocated_to: null, total_amount: 234.56 },
			{ cycle_id: 2, allocated_to: 'Entertainment', total_amount: 29.99 },
			{ cycle_id: 2, allocated_to: 'Food & Dining', total_amount: 189.23 },
			{ cycle_id: 2, allocated_to: 'Transportation', total_amount: 67.89 },
			{ cycle_id: 2, allocated_to: null, total_amount: 456.78 }
		];
	}
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
	if (!db) {
		// Local development mode - return mock data
		console.log('[DEV] CCBILLING_DB binding not found, using mock data for refreshAutoAssociationsForCycle');
		return 15; // Return mock number of updated rows
	}

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


