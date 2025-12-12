import { redirect } from '@sveltejs/kit';
import { nanoid } from 'nanoid';
import { github } from '$lib/server/auth';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const state = nanoid();
	const url = github.createAuthorizationURL(state, event.url);

	event.cookies.set('github_oauth_state', state, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	throw redirect(302, url.toString());
}
