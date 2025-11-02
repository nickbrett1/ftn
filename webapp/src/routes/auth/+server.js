// Try to import environment variables, with fallbacks for build time
let GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET;
try {
	const env = await import('$env/static/private');
	GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
	GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
} catch (error) {
	// During build time, these might not be available
	// Set default values to prevent undefined errors
	// This catch block intentionally handles build-time compatibility by setting fallback values
	console.warn(
		'[AUTH_HANDLER] Environment variables not available at build time, using placeholders',
		error instanceof Error ? error.message : String(error)
	);
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

	for (const [key, value] of Object.entries(params)) {
		body.append(key, value);
	}

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

/**
 * Base64URL decode a string (URL-safe base64 decoding)
 * @param {string} str - Base64URL encoded string
 * @returns {string} Decoded string
 */
function base64UrlDecode(str) {
	// Add padding if needed
	let base64 = str.replaceAll('-', '+').replaceAll('_', '/');
	while (base64.length % 4) {
		base64 += '=';
	}
	try {
		return atob(base64);
	} catch (error) {
		throw new Error(`Failed to decode base64URL: ${error.message}`);
	}
}

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

		// Decode redirect path from OAuth state parameter
		// State contains: { csrf: string, redirect: string }
		let redirectPath = '/projects/ccbilling'; // Default fallback
		const stateParam = url.searchParams.get('state');
		if (stateParam) {
			try {
				// Base64URL decode the state parameter
				const decodedState = base64UrlDecode(stateParam);
				const stateData = JSON.parse(decodedState);
				if (stateData.redirect) {
					redirectPath = stateData.redirect;
				}
				// Note: In production, you should validate the CSRF token from stateData.csrf
				// against a stored value for additional security
			} catch (error) {
				console.warn(
					`${logPrefix} Failed to decode state parameter, using default redirect:`,
					error
				);
			}
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

		// Return an HTML page that sets the cookie via document.cookie and redirects
		// Redirect path is already decoded from OAuth state parameter above
		const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Authenticating...</title>
</head>
<body>
	<script>
		console.log('Auth callback: Redirecting to', '${redirectPath}');
		
		// Set the auth cookie (must be done client-side to work with http://localhost)
		document.cookie = 'auth=${newAuth}; Expires=${expiration.toUTCString()}; Path=/; Secure; SameSite=Lax';
		
		console.log('Auth callback: Cookie set, redirecting to', '${redirectPath}');
		
		// Clean up localStorage (remove old redirect path if present)
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('auth_redirect_path');
		}
		
		// Redirect to the intended page
		window.location.href = '${redirectPath}';
	</script>
</body>
</html>`;

		return new Response(html, {
			status: 200,
			headers: {
				'Content-Type': 'text/html'
			}
		});
	} catch (e) {
		// Keep this critical error log for production monitoring
		console.error(`${logPrefix} Critical error during auth flow:`, e.message, e.stack);
		// Optionally, redirect to an error page or return a generic error response
		return new Response('Authentication failed due to an internal error.', { status: 500 });
	}
}
