import type { RequestEvent } from '@sveltejs/kit';

/**
 * List all credit cards in the CCBILLING_DB.
 */
export async function listCreditCards(event: RequestEvent) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	const { results } = await db.prepare('SELECT * FROM credit_card ORDER BY created_at DESC').all();
	return results;
}

/**
 * Create a new credit card.
 * @param event SvelteKit request event
 * @param name Card name
 * @param last4 Last 4 digits (string)
 */
export async function createCreditCard(event: RequestEvent, name: string, last4: string) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('INSERT INTO credit_card (name, last4) VALUES (?, ?)').bind(name, last4).run();
}

/**
 * Delete a credit card by id.
 * @param event SvelteKit request event
 * @param id Card id
 */
export async function deleteCreditCard(event: RequestEvent, id: number) {
	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) throw new Error('CCBILLING_DB binding not found');
	await db.prepare('DELETE FROM credit_card WHERE id = ?').bind(id).run();
}
