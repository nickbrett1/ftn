import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

const HTML_TEMPORARY_REDIRECT = 307;

/**
 * Admin page server-side logic
 * Ensures only authenticated users can access admin tools
 */
export async function load(event) {
	// Require authentication
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/notauthorised');
	}

	// Return empty data - the page will fetch its own data from the API
	return {};
}
