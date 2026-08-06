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

	let initialInventory = [];
	let initialTransactions = [];
	let serverError = null;

	try {
		const res = await event.fetch(`${workerUrl.replace(/\/$/, '')}/api/admin/inventory`, {
			headers
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data)) initialInventory = data;
		} else if (res.status === 401) {
			serverError =
				'Worker API returned 401 Unauthorized. Verify TODDLER_ADMIN_API_KEY environment secret in Doppler / Cloudflare.';
		} else {
			serverError = `Worker API returned HTTP ${res.status} ${res.statusText}`;
		}
	} catch (err) {
		console.warn('Server load fetch inventory error:', err.message);
		serverError = `Worker API connection status (${err.message})`;
	}

	try {
		const res = await event.fetch(
			`${workerUrl.replace(/\/$/, '')}/api/admin/analytics?limit=100&offset=0`,
			{ headers }
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
