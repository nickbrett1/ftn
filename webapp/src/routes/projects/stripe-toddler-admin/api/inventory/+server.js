import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const workerUrl =
		process.env.STRIPE_TODDLER_WORKER_URL || 'https://stripe-toddler.nick-brett1.workers.dev';

	try {
		const res = await event.fetch(`${workerUrl.replace(/\/$/, '')}/api/admin/inventory`);
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
			headers: { 'Content-Type': 'application/json' },
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
