import { getUnassignedMerchants } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const merchants = await getUnassignedMerchants(event);
	return new Response(JSON.stringify(merchants), {
		headers: { 'Content-Type': 'application/json' }
	});
}
