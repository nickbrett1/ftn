/**
 * Shared Google OAuth utility functions
 */

const GOOGLE_CLIENT_ID = '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com';

/**
 * Base64URL encode a string (URL-safe base64 encoding)
 * @param {string} str - String to encode
 * @returns {string} Base64URL encoded string
 */
function base64UrlEncode(str) {
	return btoa(str).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

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
	return atob(base64);
}

/**
 * Get the appropriate redirect URI based on environment
 * Note: Redirect URI must match exactly what's registered in Google Cloud Console
 */
export function getRedirectUri() {
	// For development, use localhost
	if (process.env.NODE_ENV === 'development') {
		return 'http://127.0.0.1:5173/auth';
	}

	// For production/preview, use the current origin dynamically
	// This ensures preview deployments redirect back to the preview domain
	const windowOrigin = globalThis.window?.location?.origin;
	if (windowOrigin) {
		return `${windowOrigin}/auth`;
	}

	// Fallback for SSR
	return 'https://fintechnick.com/auth';
}

/**
 * Check if user is currently authenticated
 */
export function isUserAuthenticated() {
	// Check if we're in a browser environment
	if (typeof document === 'undefined') {
		return false;
	}
	const regex = /(^| )auth=([^;]+)/;
	const match = regex.exec(document.cookie);
	const result = match !== null && match[2] !== 'deleted';
	return result;
}

/**
 * Initiate Google OAuth flow using the Google Identity Services library
 * This is the preferred method as it handles the OAuth flow properly
 * @param {string} redirectPath - Optional path to redirect to after successful auth (defaults to /projects/ccbilling)
 */
export async function initiateGoogleAuth(redirectPath = '/projects/ccbilling') {
	console.log('initiateGoogleAuth called with redirectPath:', redirectPath);

	// Check if user is already logged in
	if (isUserAuthenticated()) {
		console.log('User already authenticated, redirecting to:', redirectPath);
		// If already logged in, redirect using SvelteKit navigation
		const { goto } = await import('$app/navigation');
		goto(redirectPath);
		return;
	}

	console.log('User not authenticated, storing redirect path:', redirectPath);

	// Store the redirect path in localStorage so we can retrieve it after auth
	if (globalThis.window?.localStorage) {
		globalThis.window.localStorage.setItem('auth_redirect_path', redirectPath);
		console.log(
			'Stored value in localStorage:',
			globalThis.window.localStorage.getItem('auth_redirect_path')
		);
	} else {
		console.error('window or localStorage not available');
		return;
	}

	// Also encode redirect path in state for OAuth (as fallback if localStorage is cleared)
	// This is stored in the OAuth state parameter and can be passed via URL

	console.log('Checking if Google GIS is loaded...');

	// Check if Google GIS is already loaded
	if (globalThis.window?.google?.accounts?.oauth2) {
		console.log('Google GIS already loaded, using it');
		// Use the existing GIS client if available
		await requestCodeWithGIS();
	} else {
		console.log('Google GIS not loaded, loading it now...');
		// Load Google GIS script and then request code
		await loadGoogleGISAndRequestCode();
	}
}

/**
 * Request authorization code using Google Identity Services
 */
async function requestCodeWithGIS() {
	// Check if Google GIS is properly loaded
	if (!globalThis.window?.google?.accounts?.oauth2) {
		throw new Error('Google Identity Services not properly loaded');
	}

	const { nanoid } = await import('nanoid');

	// Get redirect path from localStorage (stored by initiateGoogleAuth)
	const redirectPath =
		globalThis.window?.localStorage?.getItem('auth_redirect_path') || '/projects/ccbilling';

	// Encode redirect path in the OAuth state parameter (OAuth spec allows this)
	// State parameter is roundtripped by Google, so we can decode it in the callback
	const csrfToken = nanoid(); // CSRF protection token
	const stateData = {
		csrf: csrfToken,
		redirect: redirectPath // Redirect path to use after auth
	};
	const state = base64UrlEncode(JSON.stringify(stateData));

	// Store CSRF token and original state for validation in callback
	if (globalThis.window?.sessionStorage) {
		globalThis.window.sessionStorage.setItem('oauth_csrf_token', csrfToken);
		globalThis.window.sessionStorage.setItem('oauth_state', state);
	}

	// Use the exact redirect URI that's registered in Google Cloud Console (no query params allowed)
	const redirectUri = getRedirectUri();

	const client = globalThis.window.google.accounts.oauth2.initCodeClient({
		client_id: GOOGLE_CLIENT_ID,
		scope: 'openid profile email',
		ux_mode: 'redirect',
		state,
		redirect_uri: redirectUri,
		callback: (response) => {
			if (response.error) {
				console.error('Google OAuth error:', response.error);
				throw new Error('Failed to initCodeClient', response.error);
			}
			// Validate state matches (Google roundtrips it, but we should still check)
			// For redirect mode, state validation happens on the server when redirecting back
			// But we can validate here if state is present in the response
			if (response.state) {
				const storedState = globalThis.window?.sessionStorage?.getItem('oauth_state');
				if (storedState && response.state !== storedState) {
					throw new Error('State mismatch');
				}
			}
		}
	});

	client.requestCode();
}

/**
 * Load Google GIS script and then request authorization code
 */
function loadGoogleGISAndRequestCode() {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.nonce = '%sveltekit.nonce%';
		script.onload = () => {
			try {
				// Check if Google GIS is properly loaded
				if (!globalThis.window?.google?.accounts?.id) {
					reject(new Error('Google Identity Services failed to load properly'));
					return;
				}

				// Initialize Google Identity Services
				globalThis.window.google.accounts.id.initialize({
					client_id: GOOGLE_CLIENT_ID,
					callback: (response) => {
						if (!response.credential || !response.clientId) {
							reject(new Error('Failed to initialize google sign in'));
						}
					}
				});

				// Request authorization code
				requestCodeWithGIS();
				resolve();
			} catch (error) {
				reject(error);
			}
		};
		script.onerror = () => {
			reject(new Error('Google gsi script failed to load'));
		};

		document.body.appendChild(script);
	});
}
