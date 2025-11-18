import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { getBudget, getBudgetMerchants, listBudgets } from '$lib/server/ccbilling-db.js';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/notauthorised');
	}

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/projects/ccbilling/budgets');
	}

	// Fetch budget and associated merchants
	const budget = await getBudget(event, id);
	if (!budget) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/projects/ccbilling/budgets');
	}

	const merchants = await getBudgetMerchants(event, id);
	const budgets = await listBudgets(event);

	return {
		budget,
		merchants,
		budgets
	};
}
