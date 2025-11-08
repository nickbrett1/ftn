import { dev } from '$app/environment';
import { GitHub, Google } from 'arctic';
import {
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	PUBLIC_GOOGLE_REDIRECT_URI
} from '$env/static/private';
import { validateSession, setSessionCookie, deleteSessionCookie } from './session';

console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? `SET (length: ${GOOGLE_CLIENT_ID.length})` : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? `SET (length: ${GOOGLE_CLIENT_SECRET.length})` : 'NOT SET');
console.log('PUBLIC_GOOGLE_REDIRECT_URI:', PUBLIC_GOOGLE_REDIRECT_URI ? `SET (${PUBLIC_GOOGLE_REDIRECT_URI})` : 'NOT SET');

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET);

if (!GOOGLE_CLIENT_ID) {
	throw new Error('Must set GOOGLE_CLIENT_ID environment variable');
}
if (!GOOGLE_CLIENT_SECRET) {
	throw new Error('Must set GOOGLE_CLIENT_SECRET environment variable');
}
if (!PUBLIC_GOOGLE_REDIRECT_URI) {
	throw new Error('Must set PUBLIC_GOOGLE_REDIRECT_URI environment variable');
}
export const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_GOOGLE_REDIRECT_URI);

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
		return { id: session.userId };
	} else {
		// Session is invalid or expired, delete the cookie
		deleteSessionCookie(event.cookies, !dev);
	}
	return null;
}
