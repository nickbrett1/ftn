import { redirect } from '@sveltejs/kit';
import { GITHUB_CLIENT_ID } from '$env/static/private';
import { dev } from '$app/environment';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function GET({ url }) {
	const sessionId = Math.random().toString(36).slice(2);
	const state = {
		sessionId,
		// Pass-through query params from the initial request
		projectName: url.searchParams.get('projectName'),
		repositoryUrl: url.searchParams.get('repositoryUrl'),
		selected: url.searchParams.get('selected')
	};

	// Store the state in a cookie to be verified in the callback
	const stateCookie = Buffer.from(JSON.stringify(state)).toString('base64');
	const secure = dev ? '' : 'Secure;';
	const cookieHeader = `github_oauth_state=${stateCookie}; HttpOnly; Path=/; ${secure}`;

	const authUrl = new URL('https://github.com/login/oauth/authorize');
	authUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
	authUrl.searchParams.set('scope', 'repo');
	authUrl.searchParams.set('state', sessionId);

	// Dynamically construct the redirect URI
	const redirectUri = new URL('/projects/genproj/api/auth/github/callback', url.origin);
	authUrl.searchParams.set('redirect_uri', redirectUri.toString());

	return redirect(302, authUrl.toString(), {
		headers: {
			'Set-Cookie': cookieHeader
		}
	});
}
