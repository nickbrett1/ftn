import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FAUNA_AUTH } from '$env/static/private';

const tokenExchange = async (url, code) => {
	const body = new URLSearchParams();

	if (!GOOGLE_CLIENT_SECRET) throw new Error('Must set GOOGLE_CLIENT_SECRET');
	if (!GOOGLE_CLIENT_ID) throw new Error('Must set GOOGLE_CLIENT_ID');

	const params = {
		client_id: GOOGLE_CLIENT_ID,
		client_secret: GOOGLE_CLIENT_SECRET,

		code,
		grant_type: 'authorization_code',
		redirect_uri: `${url.origin}/auth`
	};

	Object.entries(params).forEach(([key, value]) => {
		body.append(key, value);
	});

	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body
	});
	const resp = await response.json();
	if (resp.error) throw new Error(resp.error);
	return resp;
};

const isUserAllowed = async (token) => {
	const url = new URL('https://www.googleapis.com/oauth2/v2/userinfo');

	const response = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
	const userInfo = await response.json();
	if (userInfo.error) throw new Error(userInfo.error);
	if (!userInfo.verified_email) return false;

	const result = await fetch('https://graphql.us.fauna.com/graphql', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: FAUNA_AUTH ? `Bearer ${FAUNA_AUTH}` : ''
		},
		body: JSON.stringify({
			query: `
				query FindAUser($email: String!) {
					user(email: $email) {
						email
					}
				}
			`,
			variables: {
				email: userInfo.email
			}
		})
	});

	const data = await result.json();
	return data.data.user !== null;
};

// Convert each uint8 (range 0 to 255) to string in base 36 (0 to 9, a to z)
const generateAuth = () =>
	[...crypto.getRandomValues(new Uint8Array(20))]
		.map((m) => m.toString(36).padStart(2, '0'))
		.join('');

const HTML_TEMPORARY_REDIRECT = 307;

export async function GET({ request, platform }) {
	const url = new URL(request.url);
	const error = url.searchParams.get('error');
	if (error !== null) throw new Error(error);

	const code = url.searchParams.get('code');
	if (code === null) throw new Error('No code found in auth response');

	const tokenResponse = await tokenExchange(url, code);

	const allowed = await isUserAllowed(tokenResponse.access_token);
	if (!allowed) {
		return Response.redirect(`${url.origin}/preview`, HTML_TEMPORARY_REDIRECT);
	}

	const newAuth = generateAuth();
	const expiration = new Date(Date.now() + tokenResponse.expires_in * 1000);

	await platform.env.KV.put(newAuth, tokenResponse.access_token, {
		expiration: Math.floor(expiration / 1000)
	});

	return new Response('', {
		status: HTML_TEMPORARY_REDIRECT,
		headers: {
			Location: `${url.origin}/home`,
			'Set-Cookie': `auth=${newAuth}; expires=${expiration.toUTCString()}; secure;`
		}
	});
}
