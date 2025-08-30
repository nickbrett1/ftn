/**
 * Throws a 401 Response if the user is not authenticated.
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function requireUser(event) {
	const startTime = Date.now();
	const url = event.url.pathname;
	const isTest = process.env.NODE_ENV === 'test' || event.request?.headers?.get('x-dev-test') === 'true';
	
	// Development testing bypass - only in dev mode with special header
	const devTestHeader = event.request?.headers?.get('x-dev-test');
	if (devTestHeader === 'true' && process.env.NODE_ENV === 'development') {
		if (!isTest) console.log('[AUTH] Development test mode - bypassing authentication');
		return null; // Allow the request to proceed
	}

	const authCookie = event.cookies.get('auth');
	if (!authCookie || authCookie === 'deleted') {
		if (!isTest) console.log(`[AUTH] No auth cookie found for ${url} - user needs to authenticate`);
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	if (!isTest) console.log(`[AUTH] Checking auth for ${url}, cookie: ${authCookie.substring(0, 8)}...`);
	const token = await event.platform.env.KV.get(authCookie);
	const authTime = Date.now() - startTime;
	
	if (!token) {
		if (!isTest) {
			console.log(`[AUTH] Auth cookie found but no token in KV for ${url} (${authTime}ms) - user may need to re-authenticate`);
			console.log('[AUTH] This could happen if the token expired or was deleted');
			console.log('[AUTH] User should try logging in again at /notauthorised');
		}
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	if (!isTest) console.log(`[AUTH] Auth successful for ${url} (${authTime}ms)`);
	// Optionally, return user info here if you want
}
