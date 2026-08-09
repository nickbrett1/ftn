import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

function getAdminHeaders(event) {
	const adminApiKey =
		process.env.TODDLER_ADMIN_API_KEY ||
		process.env.ADMIN_API_KEY ||
		process.env.STRIPE_TODDLER_ADMIN_API_KEY ||
		event.platform?.env?.TODDLER_ADMIN_API_KEY ||
		event.platform?.env?.ADMIN_API_KEY ||
		'';

	/** @type {Record<string, string>} */
	const headers = {};
	if (adminApiKey) {
		headers['X-Admin-API-Key'] = adminApiKey;
	}
	return headers;
}

/**
 * Server-side proxy for the Worker's GET /api/admin/analytics endpoint.
 *
 * The analytics endpoint requires the X-Admin-API-Key header (a server secret)
 * and does not expose CORS headers, so it cannot be called directly from the
 * browser. The SvelteKit server adds the admin key and relays the response.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const workerUrl =
		process.env.STRIPE_TODDLER_WORKER_URL || 'https://stripe-toddler.nick-brett1.workers.dev';

	const limit = event.url.searchParams.get('limit') || '100';
	const offset = event.url.searchParams.get('offset') || '0';

	try {
		const res = await event.fetch(
			`${workerUrl.replace(/\/$/, '')}/api/admin/analytics?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
			{ headers: getAdminHeaders(event) }
		);
		if (res.ok) {
			const data = await res.json();
			return json(data);
		}
		return json({ error: `Worker returned HTTP ${res.status}` }, { status: res.status });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
