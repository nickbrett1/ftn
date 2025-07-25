import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { getBillingCycle } from '$lib/server/ccbilling-db.js';

const HTML_TEMPORARY_REDIRECT = 307;

export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/preview');
	}

	const cycleId = event.params.id;
	const cycle = await getBillingCycle(event, cycleId);

	if (!cycle) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/projects/ccbilling');
	}

	return {
		cycleId,
		cycle
	};
}
