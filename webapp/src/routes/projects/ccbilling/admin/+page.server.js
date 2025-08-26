import { requireUser } from '$lib/server/require-user.js';

/**
 * Admin page server-side logic
 * Ensures only authenticated users can access admin tools
 */
export async function load(event) {
	// Require authentication
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	// Return empty data - the page will fetch its own data from the API
	return {};
}