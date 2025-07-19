/**
 * Throws a 401 Response if the user is not authenticated.
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function requireUser(event) {
	const authCookie = event.cookies.get('auth');
	if (!authCookie || authCookie === 'deleted') {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}
	const token = await event.platform.env.KV.get(authCookie);
	if (!token) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}
	// Optionally, return user info here if you want
}
