// webapp/src/lib/server/auth.js

/**
 * Get current authenticated user from request
 * @param {import('@sveltejs/kit').RequestEvent} event - SvelteKit request event
 * @returns {Promise<Object|null>} Current user object or null if not authenticated
 */
export async function getCurrentUser(event) {
	const { request, platform } = event;
	try {
		// Get auth cookie from request
		const cookies = request.headers.get('cookie') || '';
		const authCookieRegex = /auth=([^;]+)/;
		const authCookieMatch = authCookieRegex.exec(cookies);
		const authCookie = authCookieMatch ? authCookieMatch[1] : null;

		if (!authCookie || authCookie === 'deleted') {
			return null;
		}

		// Get Google access token from KV
		if (!platform?.env?.KV) {
			return null;
		}

		const googleToken = await platform.env.KV.get(authCookie);
		if (!googleToken) {
			return null;
		}

		// Get user info from Google API
		const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: {
				Authorization: `Bearer ${googleToken}`
			}
		});

		if (!userInfoResponse.ok) {
			return null;
		}

		const userInfo = await userInfoResponse.json();

		// Return user object compatible with GenprojAuthManager
		return {
			id: userInfo.email || userInfo.id, // Use email as user ID
			email: userInfo.email,
			name: userInfo.name || userInfo.email,
			expiresAt: new Date(Date.now() + 3600 * 1000) // Default 1 hour expiration
		};
	} catch (error) {
		console.error('❌ Error getting current user:', error);
		return null;
	}
}

// Other authentication-related functions will be added here.
