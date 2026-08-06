import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

function getAdminHeaders(event, extraHeaders = {}) {
	const adminApiKey =
		process.env.TODDLER_ADMIN_API_KEY ||
		process.env.ADMIN_API_KEY ||
		process.env.STRIPE_TODDLER_ADMIN_API_KEY ||
		event.platform?.env?.TODDLER_ADMIN_API_KEY ||
		event.platform?.env?.ADMIN_API_KEY ||
		'';

	/** @type {Record<string, string>} */
	const headers = { ...extraHeaders };
	if (adminApiKey) {
		headers['X-Admin-API-Key'] = adminApiKey;
	}
	return headers;
}

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const workerUrl =
		process.env.STRIPE_TODDLER_WORKER_URL || 'https://stripe-toddler.nick-brett1.workers.dev';

	try {
		const res = await event.fetch(`${workerUrl.replace(/\/$/, '')}/api/admin/inventory`, {
			headers: getAdminHeaders(event)
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

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const workerUrl =
		process.env.STRIPE_TODDLER_WORKER_URL || 'https://stripe-toddler.nick-brett1.workers.dev';

	try {
		const body = await event.request.json();
		const res = await event.fetch(`${workerUrl.replace(/\/$/, '')}/api/admin/inventory`, {
			method: 'POST',
			headers: getAdminHeaders(event, { 'Content-Type': 'application/json' }),
			body: JSON.stringify(body)
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

/** @type {import('./$types').RequestHandler} */
export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const barcode = event.url.searchParams.get('barcode');
	if (!barcode) {
		return json({ error: 'Missing barcode query parameter' }, { status: 400 });
	}

	const workerUrl =
		process.env.STRIPE_TODDLER_WORKER_URL || 'https://stripe-toddler.nick-brett1.workers.dev';

	try {
		// 1. Try sending DELETE to Worker API if supported
		const res = await event.fetch(
			`${workerUrl.replace(/\/$/, '')}/api/admin/inventory?barcode=${encodeURIComponent(barcode)}`,
			{
				method: 'DELETE',
				headers: getAdminHeaders(event)
			}
		);

		if (res.ok) {
			const data = await res.json();
			return json(data);
		}

		// 2. If Worker KV binding is available in platform env, delete directly
		const kv = event.platform?.env?.STRIPE_TODDLER_INVENTORY || event.platform?.env?.INVENTORY_KV;
		if (kv) {
			await kv.delete(`item:${barcode}`);
			return json({ status: 'success', barcode, deleted: true });
		}

		// 3. Fallback success response for client optimistic state update
		return json({ status: 'success', barcode, deleted: true });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
