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

	// Deliberately do NOT fetch the inventory (or analytics) here.
	//
	// Inventory items embed their image as an inline `data:image/jpeg;base64,...`
	// URL (~0.3-0.65 MB each). Returning them from the server `load` makes
	// SvelteKit serialise the whole inventory into the SSR HTML *and* into the
	// hydration payload. For the current inventory that produced a ~25 MB
	// response (>22 MB of base64), which pushed the Worker past its 128 MB
	// memory ceiling and surfaced as Cloudflare Error 1102 "Worker exceeded
	// resource limits" (status: exceededMemory).
	//
	// The page fetches inventory/analytics through its own proxy endpoints after
	// mount instead (see `+page.svelte`), keeping the server-rendered response
	// small while preserving the same data and UI.
	return {
		workerUrl,
		initialInventory: [],
		initialTransactions: [],
		serverError: null
	};
}
