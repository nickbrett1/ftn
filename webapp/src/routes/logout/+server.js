import { redirect } from '@sveltejs/kit';
import * as cookie from 'cookie';
import { createGenprojAuth } from '$lib/server/genproj-auth.js';

const revokeGoogleToken = async (token) => {
	const body = new URLSearchParams();
	body.append('token', token);

	const response = await fetch('https://oauth2.googleapis.com/revoke', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body
	});

	if (!response.ok) {
		console.error('Failed to revoke Google token:', response.statusText);
	}
};

const HTML_TEMPORARY_REDIRECT = 307;

export async function GET({ request, platform }) {
	const genprojAuth = createGenprojAuth(platform);
	const cookies = request.headers.get('cookie');
	if (!cookies) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/notauthorised');
	}

	const authCookie = cookies.match(/auth=([^;]+)/);
	if (!authCookie) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/notauthorised');
	}
	const authCookieKey = authCookie[1];

	let response = new Response('', {
		status: HTML_TEMPORARY_REDIRECT,
		headers: {
			'set-cookie': cookie.serialize('auth', '', { httpOnly: false }),
			location: '/'
		}
	});

	const token = await platform.env.KV.get(authCookieKey);
	if (!token) {
		return response;
	}

	// Initialize genprojAuth with a mock user to clear its state
	// The authCookieKey is used as a unique identifier for the user's genproj state
	await genprojAuth.initialize({ id: authCookieKey, email: 'unknown@example.com' });

	await Promise.all([
		revokeGoogleToken(token),
		platform.env.KV.delete(authCookieKey),
		genprojAuth.clearGitHubAuth() // Clear GitHub auth state
	]);
	return response;
}
