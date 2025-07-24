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
