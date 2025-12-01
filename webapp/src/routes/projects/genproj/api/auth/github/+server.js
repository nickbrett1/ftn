import { redirect } from '@sveltejs/kit';
import { getGithubCredentials } from '$lib/server/github/credentials';
import { dev } from '$app/environment';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function GET({ url, cookies }) {
	const sessionId = Math.random().toString(36).slice(2);
	const state = {
		sessionId,
		// Pass-through query params from the initial request
		projectName: url.searchParams.get('projectName'),
		repositoryUrl: url.searchParams.get('repositoryUrl'),
		selected: url.searchParams.get('selected')
	};

	// Store the state in a cookie to be verified in the callback
	cookies.set('github_oauth_state', JSON.stringify(state), {
		httpOnly: true,
		path: '/',
		secure: !dev
	});

	const { clientId } = getGithubCredentials(url.hostname);

	const authUrl = new URL('https://github.com/login/oauth/authorize');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('scope', 'repo');
	authUrl.searchParams.set('state', sessionId);

	// Dynamically construct the redirect URI, ensuring 'localhost' is used instead of '127.0.0.1'
	const origin = url.origin.includes('127.0.0.1')
		? url.origin.replace('127.0.0.1', 'localhost')
		: url.origin;
	const redirectUri = new URL('/projects/genproj/api/auth/github/callback', origin);
	authUrl.searchParams.set('redirect_uri', redirectUri.toString());

	return redirect(302, authUrl.toString());
}
