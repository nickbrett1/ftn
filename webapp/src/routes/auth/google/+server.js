import { google } from '$lib/server/auth.js'; // Assuming you'll add google to auth.js
import { redirect } from '@sveltejs/kit';
import { generateState } from 'arctic';

export async function GET({ cookies }) {
	const state = generateState();
	cookies.set('google_oauth_state', state, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	const url = await google.createAuthorizationURL(state, {
		scopes: ['profile', 'email']
	});

	throw redirect(302, url.toString());
}
