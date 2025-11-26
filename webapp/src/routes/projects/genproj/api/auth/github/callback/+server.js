import { redirect } from '@sveltejs/kit';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';
import { dev } from '$app/environment';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function GET({ url, cookies, fetch }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	const storedStateCookie = cookies.get('github_oauth_state');
	if (!storedStateCookie) {
		return redirect(302, '/projects/genproj?error=no_state');
	}

	const storedState = JSON.parse(Buffer.from(storedStateCookie, 'base64').toString());

	if (storedState.sessionId !== state) {
		return redirect(302, '/projects/genproj?error=state_mismatch');
	}

	try {
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify({
				client_id: GITHUB_CLIENT_ID,
				client_secret: GITHUB_CLIENT_SECRET,
				code
			})
		});

		const data = await response.json();

		if (data.error) {
			return redirect(302, `/projects/genproj?error=${data.error}`);
		}

		const accessToken = data.access_token;
		const secure = dev ? '' : 'Secure;';
		const accessTokenCookie = `github_access_token=${accessToken}; HttpOnly; Path=/; ${secure}`;

		// Clear the state cookie
		const clearStateCookie = `github_oauth_state=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;

		const generateUrl = new URL('/projects/genproj/generate', url.origin);
		if (storedState.projectName)
			generateUrl.searchParams.set('projectName', storedState.projectName);
		if (storedState.repositoryUrl)
			generateUrl.searchParams.set('repositoryUrl', storedState.repositoryUrl);
		if (storedState.selected) generateUrl.searchParams.set('selected', storedState.selected);

		return redirect(302, generateUrl.toString(), {
			headers: {
				'Set-Cookie': [accessTokenCookie, clearStateCookie]
			}
		});
	} catch (e) {
		return redirect(302, `/projects/genproj?error=token_exchange_failed`);
	}
}
