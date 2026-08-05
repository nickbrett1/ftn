import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

const HTML_TEMPORARY_REDIRECT = 307;

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		const redirectPath = encodeURIComponent(event.url.pathname);
		throw redirect(HTML_TEMPORARY_REDIRECT, `/notauthorised?redirectTo=${redirectPath}`);
	}

	const workerUrl =
		process.env.STRIPE_TODDLER_WORKER_URL || 'https://stripe-toddler.nick-brett1.workers.dev';

	let initialInventory = [];
	let initialTransactions = [];
	let serverError = null;

	try {
		const res = await event.fetch(`${workerUrl.replace(/\/$/, '')}/api/admin/inventory`);
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data)) initialInventory = data;
		} else {
			serverError = `Worker API returned HTTP ${res.status} ${res.statusText}`;
		}
	} catch (err) {
		console.warn('Server load fetch inventory error:', err.message);
		serverError = `Worker API connection status (${err.message})`;
	}

	try {
		const res = await event.fetch(
			`${workerUrl.replace(/\/$/, '')}/api/admin/analytics?limit=100&offset=0`
		);
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data)) initialTransactions = data;
		}
	} catch (err) {
		console.warn('Server load fetch analytics error:', err.message);
	}

	return {
		workerUrl,
		initialInventory,
		initialTransactions,
		serverError
	};
}
