import { getUnassignedMerchants } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const isTest = process.env.NODE_ENV === 'test' || event.request?.headers?.get('x-dev-test') === 'true';
	if (!isTest) console.log('[API] GET /recent-merchants called');
	const startTime = Date.now();
	
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		if (!isTest) console.log(`[API] Auth failed for GET /recent-merchants (${Date.now() - startTime}ms)`);
		return authResult;
	}

	const merchants = await getUnassignedMerchants(event);
	if (!isTest) console.log(`[API] GET /recent-merchants completed successfully (${Date.now() - startTime}ms) - ${merchants.length} merchants`);
	return new Response(JSON.stringify(merchants), {
		headers: { 'Content-Type': 'application/json' }
	});
}
