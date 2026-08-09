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
 * Server-side proxy for the Worker's POST /api/admin/inventory/upload endpoint.
 *
 * The upload endpoint requires the X-Admin-API-Key header (a server secret) and
 * does not expose CORS headers, so it cannot be called directly from the
 * browser. The SvelteKit server relays the multipart form data (barcode +
 * image file) and injects the admin key. The multipart boundary is generated
 * automatically by the runtime, so no Content-Type header is set manually.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const workerUrl =
		process.env.STRIPE_TODDLER_WORKER_URL || 'https://stripe-toddler.nick-brett1.workers.dev';

	try {
		const formData = await event.request.formData();
		const barcode = formData.get('barcode');
		const image = formData.get('image');

		if (!barcode || !image) {
			return json({ error: 'Missing barcode or image in multipart form data' }, { status: 400 });
		}

		const res = await event.fetch(`${workerUrl.replace(/\/$/, '')}/api/admin/inventory/upload`, {
			method: 'POST',
			headers: getAdminHeaders(event),
			body: formData
		});

		if (res.ok) {
			const data = await res.json();
			return json(data);
		}
		return json({ error: `Worker returned HTTP ${res.status}` }, { status: res.status });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
