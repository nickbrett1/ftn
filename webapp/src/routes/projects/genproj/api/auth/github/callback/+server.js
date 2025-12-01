import { redirect, isRedirect } from '@sveltejs/kit';
import { getGithubCredentials } from '$lib/server/github/credentials';
import { dev } from '$app/environment';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function GET({ url, cookies, fetch }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	const storedStateCookie = cookies.get('github_oauth_state');
	if (!storedStateCookie) {
		throw redirect(302, '/projects/genproj?error=no_state');
	}

	const storedState = JSON.parse(storedStateCookie);

	if (storedState.sessionId !== state) {
		throw redirect(302, '/projects/genproj?error=state_mismatch');
	}

	try {
		const { clientId, clientSecret } = getGithubCredentials(url.hostname);
		const origin = url.origin.includes('127.0.0.1')
			? url.origin.replace('127.0.0.1', 'localhost')
			: url.origin;
		const redirectUri = new URL('/projects/genproj/api/auth/github/callback', origin);
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				redirect_uri: redirectUri.toString()
			})
		});

		const data = await response.json();

		if (data.error) {
			throw redirect(302, `/projects/genproj?error=${data.error}`);
		}

		const accessToken = data.access_token;
		cookies.set('github_access_token', accessToken, {
			httpOnly: true,
			path: '/',
			secure: !dev
		});

		// Clear the state cookie
		cookies.delete('github_oauth_state', { path: '/' });

		const generateUrl = new URL('/projects/genproj/generate', url.origin);
		if (storedState.projectName)
			generateUrl.searchParams.set('projectName', storedState.projectName);
		if (storedState.repositoryUrl)
			generateUrl.searchParams.set('repositoryUrl', storedState.repositoryUrl);
		if (storedState.selected) generateUrl.searchParams.set('selected', storedState.selected);

		throw redirect(302, generateUrl.toString());
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}
		// Log the actual error for debugging
		console.error('GitHub token exchange failed:', error);
		throw redirect(302, `/projects/genproj?error=token_exchange_failed`);
	}
}
