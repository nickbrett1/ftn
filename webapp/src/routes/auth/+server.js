// Try to import environment variables, with fallbacks for build time
let GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET;
try {
	const env = await import('$env/static/private');
	GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
	GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
} catch (error) {
	// During build time, these might not be available
	GOOGLE_CLIENT_ID = process.env?.GOOGLE_CLIENT_ID || 'placeholder';
	GOOGLE_CLIENT_SECRET = process.env?.GOOGLE_CLIENT_SECRET || 'placeholder';
}
import { isUserAllowed } from '$lib/server/user-validation.js';

const logPrefix = '[AUTH_HANDLER]';

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
	if (resp.error) {
		// Keep this error log as it's for actual token exchange failures
		console.error(`${logPrefix} Token exchange error: ${resp.error_description || resp.error}`);
		throw new Error(resp.error_description || resp.error);
	}
	return resp;
};

const validateUserFromToken = async (token, platform) => {
	const url = new URL('https://www.googleapis.com/oauth2/v2/userinfo');
	const response = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
	const userInfo = await response.json();
	if (userInfo.error) throw new Error(userInfo.error); // Keep this error check
	if (!userInfo.verified_email) return false;

	// Use shared validation function
	return await isUserAllowed(userInfo.email, platform.env.KV);
};

// Convert each uint8 (range 0 to 255) to string in base 36 (0 to 9, a to z)
const generateAuth = () =>
	[...crypto.getRandomValues(new Uint8Array(20))]
		.map((m) => m.toString(36).padStart(2, '0'))
		.join('');

const HTML_TEMPORARY_REDIRECT = 307;

export async function GET({ request, platform }) {
	try {
		const url = new URL(request.url);
		const errorParam = url.searchParams.get('error');
		if (errorParam !== null) {
			// Keep this error log as it's for actual provider errors
			console.error(`${logPrefix} Error in auth callback from provider: ${errorParam}`);
			throw new Error(`OAuth provider error: ${errorParam}`);
		}

		const code = url.searchParams.get('code');
		if (code === null) {
			throw new Error('No code found in auth response');
		}

		const tokenResponse = await tokenExchange(url, code);

		const allowed = await validateUserFromToken(tokenResponse.access_token, platform);
		if (!allowed) {
			return Response.redirect(`${url.origin}/notauthorised`, HTML_TEMPORARY_REDIRECT);
		}

		const newAuth = generateAuth();
		const expiration = new Date(Date.now() + tokenResponse.expires_in * 1000);
		const kvExpiration = Math.floor(expiration.getTime() / 1000); // KV expects expiration in seconds since epoch

		await platform.env.KV.put(newAuth, tokenResponse.access_token, {
			expiration: kvExpiration
		});

		const cookies = request.headers.get('cookie') || '';
		const redirectPath = cookies.match(/redirectPath=([^;]+)/)?.[1] || '/';

		return new Response(null, {
			// Changed from empty string to null for clarity
			status: HTML_TEMPORARY_REDIRECT,
			headers: {
				Location: `${url.origin}${redirectPath}`,
				'Set-Cookie': `auth=${newAuth}; Expires=${expiration.toUTCString()}; Path=/; Secure; SameSite=Lax`
			}
		});
	} catch (e) {
		// Keep this critical error log for production monitoring
		console.error(`${logPrefix} Critical error during auth flow:`, e.message, e.stack);
		// Optionally, redirect to an error page or return a generic error response
		return new Response('Authentication failed due to an internal error.', { status: 500 });
	}
}
