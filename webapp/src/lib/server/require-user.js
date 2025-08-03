/**
 * Throws a 401 Response if the user is not authenticated.
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function requireUser(event) {
	// Development testing bypass - only in dev mode with special header
	const devTestHeader = event.request?.headers?.get('x-dev-test');
	if (devTestHeader === 'true' && process.env.NODE_ENV === 'development') {
		console.log('[AUTH] Development test mode - bypassing authentication');
		return null; // Allow the request to proceed
	}

	const authCookie = event.cookies.get('auth');
	if (!authCookie || authCookie === 'deleted') {
		console.log('[AUTH] No auth cookie found - user needs to authenticate');
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	const token = await event.platform.env.KV.get(authCookie);
	if (!token) {
		console.log('[AUTH] Auth cookie found but no token in KV - user may need to re-authenticate');
		console.log('[AUTH] This could happen if the token expired or was deleted');
		console.log('[AUTH] User should try logging in again at /notauthorised');
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	// Optionally, return user info here if you want
}
