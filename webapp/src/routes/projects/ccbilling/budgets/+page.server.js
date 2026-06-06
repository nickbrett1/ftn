import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { listBudgets } from '$lib/server/ccbilling-db.js';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		const redirectPath = encodeURIComponent(event.url.pathname);
		throw redirect(HTML_TEMPORARY_REDIRECT, `/notauthorised?redirectTo=${redirectPath}`);
	}

	// Fetch budgets from backend
	const budgets = await listBudgets(event);
	return {
		budgets
	};
}
