import { GitHub } from 'arctic';
import { env } from '$env/dynamic/private';

// Use a Proxy to dynamically instantiate/access GitHub client at runtime,
// which prevents accessing env at module load time (build time).
export const github = new Proxy(
	{},
	{
		get(target, prop) {
			const client = new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, null);
			const value = Reflect.get(client, prop);
			if (typeof value === 'function') {
				return value.bind(client);
			}
			return value;
		}
	}
);

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

import { redirect } from '@sveltejs/kit';

/**
 * Require authentication for a route or throw a redirect
 * @param {import('@sveltejs/kit').RequestEvent} event - SvelteKit request event
 * @returns {Promise<Object>} Current user object
 * @throws {Redirect} If not authenticated
 */
export async function requireUser(event) {
	const user = await getCurrentUser(event);

	if (!user) {
		const isApi = event.url.pathname.startsWith('/api/');

		if (isApi) {
			// For API routes, return 401 instead of redirect
			throw new Error('Unauthorized');
		} else {
			// For page routes, redirect to login/notauthorised
			throw redirect(303, `/notauthorised?redirectTo=${encodeURIComponent(event.url.pathname)}`);
		}
	}

	return user;
}
