import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { listBillingCycles } from '$lib/server/ccbilling-db.js';
import { listBudgets, listAllocationTotalsByCycle } from '$lib/server/ccbilling-db.js';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/notauthorised');
	}

	// Fetch billing cycles from backend
	const [billingCycles, budgets, allocationTotals] = await Promise.all([
		listBillingCycles(event),
		listBudgets(event),
		listAllocationTotalsByCycle(event)
	]);

	return {
		billingCycles,
		budgets,
		allocationTotals
	};
}
