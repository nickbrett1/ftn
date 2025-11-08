import { OAuth2RequestError } from 'arctic';
import { github } from '$lib/server/auth';
import { createSession, setSessionCookie } from '$lib/server/session';
import { dev } from '$app/environment';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('github_oauth_state') ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}

	try {
		const tokens = await github.validateAuthorizationCode(code);
		const githubUserResponse = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `Bearer ${tokens.accessToken}`
			}
		});
		const githubUser = await githubUserResponse.json();

		const kv = event.platform.env.KV;

		// In a KV-only approach, we don't store full user profiles in a separate table.
		// The github_id itself serves as the user identifier.
		// We just need to ensure a session is created for this github_id.
		const userId = githubUser.id.toString(); // Ensure userId is a string

		const session = await createSession(kv, userId);
		setSessionCookie(event.cookies, session.id, session.expiresAt, !dev);

		return new Response(null, {
			status: 302,
			headers: {
				Location: '/'
			}
		});
	} catch (e) {
		if (e instanceof OAuth2RequestError) {
			return new Response(null, {
				status: 400
			});
		}
		return new Response(null, {
			status: 500
		});
	}
}
