// webapp/src/lib/server/session.js
// This file will contain the custom session management logic.

// Using KV for session storage instead of D1 for simplicity as per user request.

import * as base32 from 'hi-base32';

// Helper to encode bytes to base32 (lowercase, no padding)
function encodeBase32LowerCaseNoPadding(bytes) {
	const encoded = base32.encode(bytes).toLowerCase();
	// Remove padding characters if any
	return encoded.replace(/=/g, '');
}

function generateSessionId() {
	const bytes = new Uint8Array(25);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

const sessionExpiresInSeconds = 60 * 60 * 24 * 30; // 30 days

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} userId // Corresponds to github_id
 * @property {Date} expiresAt
 */

/**
 * @typedef {Object} KVNamespace
 * @property {(key: string) => Promise<string | null>} get
 * @property {(key: string, value: string, options?: { expiration?: number, expirationTtl?: number }) => Promise<void>} put
 * @property {(key: string) => Promise<void>} delete
 */

/**
 * @param {KVNamespace} kv
 * @param {string} userId // Corresponds to github_id
 * @returns {Promise<Session>}
 */
export async function createSession(kv, userId) {
	const now = new Date();
	const sessionId = generateSessionId();
	const expiresAt = new Date(now.getTime() + 1000 * sessionExpiresInSeconds);

	/** @type {Session} */
	const session = {
		id: sessionId,
		userId,
		expiresAt
	};

	// Store session in KV
	await kv.put(
		`session:${session.id}`,
		JSON.stringify({ userId: session.userId, expiresAt: session.expiresAt.getTime() }),
		{ expirationTtl: sessionExpiresInSeconds }
	);

	// Optionally store a reverse lookup for user sessions (e.g., to invalidate all sessions for a user)
	// This makes invalidateAllSessions more efficient.
	const userSessionsKey = `user_sessions:${session.userId}`;
	let userSessions = JSON.parse((await kv.get(userSessionsKey)) || '[]');
	userSessions.push(session.id);
	await kv.put(userSessionsKey, JSON.stringify(userSessions));

	return session;
}

/**
 * @param {KVNamespace} kv
 * @param {string} sessionId
 * @returns {Promise<Session | null>}
 */
export async function validateSession(kv, sessionId) {
	const now = Date.now();

	const storedSession = await kv.get(`session:${sessionId}`);
	if (!storedSession) {
		return null;
	}

	const parsed = JSON.parse(storedSession);
	/** @type {Session} */
	const session = {
		id: sessionId,
		userId: parsed.userId,
		expiresAt: new Date(parsed.expiresAt)
	};

	if (now >= session.expiresAt.getTime()) {
		await kv.delete(`session:${session.id}`);
		// Also remove from user's sessions list
		const userSessionsKey = `user_sessions:${session.userId}`;
		let userSessions = JSON.parse((await kv.get(userSessionsKey)) || '[]');
		userSessions = userSessions.filter((id) => id !== session.id);
		await kv.put(userSessionsKey, JSON.stringify(userSessions));
		return null;
	}

	// Refresh session if it's past half its lifetime
	if (now >= session.expiresAt.getTime() - (1000 * sessionExpiresInSeconds) / 2) {
		session.expiresAt = new Date(Date.now() + 1000 * sessionExpiresInSeconds);
		await kv.put(
			`session:${session.id}`,
			JSON.stringify({ userId: session.userId, expiresAt: session.expiresAt.getTime() }),
			{ expirationTtl: sessionExpiresInSeconds }
		);
	}
	return session;
}

/**
 * @param {KVNamespace} kv
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function invalidateSession(kv, sessionId) {
	const storedSession = await kv.get(`session:${sessionId}`);
	if (storedSession) {
		const parsed = JSON.parse(storedSession);
		await kv.delete(`session:${sessionId}`);
		// Remove from user's sessions list
		const userSessionsKey = `user_sessions:${parsed.userId}`;
		let userSessions = JSON.parse((await kv.get(userSessionsKey)) || '[]');
		userSessions = userSessions.filter((id) => id !== sessionId);
		await kv.put(userSessionsKey, JSON.stringify(userSessions));
	}
}

/**
 * @param {KVNamespace} kv
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function invalidateAllSessions(kv, userId) {
	const userSessionsKey = `user_sessions:${userId}`;
	const storedUserSessions = await kv.get(userSessionsKey);
	if (storedUserSessions) {
		const userSessions = JSON.parse(storedUserSessions);
		for (const sessionId of userSessions) {
			await kv.delete(`session:${sessionId}`);
		}
		await kv.delete(userSessionsKey);
	}
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} sessionId
 * @param {Date} expiresAt
 * @param {boolean} isProd
 * @returns {void}
 */
export function setSessionCookie(cookies, sessionId, expiresAt, isProd) {
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt,
		secure: isProd
	});
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {boolean} isProd
 * @returns {void}
 */
export function deleteSessionCookie(cookies, isProd) {
	cookies.set('session', '', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 0,
		secure: isProd
	});
}
