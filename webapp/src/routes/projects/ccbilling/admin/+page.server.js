import { requireUser } from '$lib/server/require-user.js';

/**
 * Admin page server-side handler
 * Ensures only authenticated users can access the admin panel
 */
export async function load(event) {
	// Require authentication
	const authResult = await requireUser(event);
	if (authResult instanceof Response) {
		// Redirect to login if not authenticated
		return {
			status: 401,
			error: 'Not authenticated'
		};
	}

	// Return empty data - the page will fetch stats via API
	return {
		authenticated: true
	};
}