import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { listCreditCards } from '$lib/server/ccbilling-db.js';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/preview');
	}

	// Fetch credit cards from backend
	const creditCards = await listCreditCards(event);
	return {
		creditCards
	};
}
