import { getBillingCycle } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

// Close cycle concept removed; only GET for retrieving a cycle remains
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	const cycle = await getBillingCycle(event, id);
	if (!cycle) {
		return Response.json({ error: 'Billing cycle not found' }, { status: 404 });
	}
	return Response.json(cycle, {
		headers: { 'Content-Type': 'application/json' }
	});
}
