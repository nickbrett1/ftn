import { dev } from '$app/environment';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { validateSession, setSessionCookie, deleteSessionCookie } from './session';

export const github = {
	/**
	 * @param {string} state
	 * @param {URL} requestUrl
	 */
	createAuthorizationURL: async (state, requestUrl) => {
		const redirectURI = new URL('/auth/github/callback', requestUrl.origin);
		const url = new URL('https://github.com/login/oauth/authorize');
		url.searchParams.set('client_id', GITHUB_CLIENT_ID);
		url.searchParams.set('state', state);
		url.searchParams.set('redirect_uri', redirectURI.toString());
		return url;
	},
	/**
	 * @param {string} code
	 */
	validateAuthorizationCode: async (code) => {
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				client_secret: GITHUB_CLIENT_SECRET,
				code: code
			})
		});

		if (!response.ok) {
			throw new Error('Failed to exchange authorization code for access token.');
		}

		const tokens = await response.json();
		if (tokens.error) {
			throw new Error(tokens.error_description || 'OAuth error');
		}
		return {
			accessToken: tokens.access_token
		};
	}
};

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
function getKv(event) {
	return event.platform.env.KV;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @returns
 */
export async function getCurrentUser(event) {
	const kv = getKv(event);
	const sessionId = event.cookies.get('session'); // Assuming 'session' is the cookie name
	if (!sessionId) {
		return null;
	}
	const session = await validateSession(kv, sessionId);
	if (session) {
		// Session is valid, potentially refreshed. Set the cookie again.
		setSessionCookie(event.cookies, session.id, session.expiresAt, !dev);
		// Since we are not storing user profile in D1, return a minimal user object
		const user = { id: session.userId };
		return user;
	} else {
		// Session is invalid or expired, delete the cookie
		deleteSessionCookie(event.cookies, !dev);
	}
	return null;
}
