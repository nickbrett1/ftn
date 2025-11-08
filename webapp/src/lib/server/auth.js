import { dev } from '$app/environment';
import { GitHub } from 'arctic';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { validateSession, setSessionCookie, deleteSessionCookie } from './session';

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET);

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
