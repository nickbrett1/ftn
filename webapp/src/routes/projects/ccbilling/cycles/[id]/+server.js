import { getBillingCycle, closeBillingCycle } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	const cycle = await getBillingCycle(event, id);
	if (!cycle) {
		return new Response(JSON.stringify({ error: 'Billing cycle not found' }), { status: 404 });
	}
	return new Response(JSON.stringify(cycle), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function PUT(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	await closeBillingCycle(event, id);
	return new Response(JSON.stringify({ success: true }));
}
