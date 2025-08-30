import { getUnassignedMerchants } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	console.log('[API] GET /recent-merchants called');
	const startTime = Date.now();
	
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		console.log(`[API] Auth failed for GET /recent-merchants (${Date.now() - startTime}ms)`);
		return authResult;
	}

	const merchants = await getUnassignedMerchants(event);
	console.log(`[API] GET /recent-merchants completed successfully (${Date.now() - startTime}ms) - ${merchants.length} merchants`);
	return new Response(JSON.stringify(merchants), {
		headers: { 'Content-Type': 'application/json' }
	});
}
