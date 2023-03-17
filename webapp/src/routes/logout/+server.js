import { redirect } from '@sveltejs/kit';

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

	if (response.status !== 200) {
		const resp = await response.text();
		throw new Error(resp);
	}
};

const HTML_TEMPORARY_REDIRECT = 307;

export async function GET({ request, platform }) {
	const cookies = request.headers.get('cookie');
	if (!cookies) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/preview');
	}

	const authCookie = cookies.match(/auth=([^;]+)/);
	if (!authCookie) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/preview');
	}
	const authCookieKey = authCookie[1];

	const token = await platform.env.KV.get(authCookieKey);
	if (!token) {
		throw redirect(HTML_TEMPORARY_REDIRECT, '/preview');
	}

	await Promise.all([revokeGoogleToken(token), platform.env.KV.delete(authCookieKey)]);

	return new Response('', {
		status: HTML_TEMPORARY_REDIRECT,
		headers: {
			Location: `/`,
			'Set-Cookie': `auth=deleted; secure;`
		}
	});
}
