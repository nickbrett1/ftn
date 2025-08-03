/**
 * Shared Google OAuth utility functions
 */

const GOOGLE_CLIENT_ID = '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com';

/**
 * Get the appropriate redirect URI based on environment
 */
export function getRedirectUri() {
	return process.env.NODE_ENV === 'development'
		? 'http://127.0.0.1:5173/auth'
		: 'https://fintechnick.com/auth';
}

/**
 * Initiate Google OAuth flow using the Google Identity Services library
 * This is the preferred method as it handles the OAuth flow properly
 * @param {string} redirectPath - Optional path to redirect to after successful auth (defaults to /projects/ccbilling)
 */
export async function initiateGoogleAuth(redirectPath = '/projects/ccbilling') {
	// Check if user is already logged in
	const match = document.cookie.match(/(^| )auth=([^;]+)/);
	const hasValidAuth = match !== null && match[2] !== 'deleted';

	if (hasValidAuth) {
		// If already logged in, redirect using SvelteKit navigation
		const { goto } = await import('$app/navigation');
		goto(redirectPath);
		return;
	}

	// Check if Google GIS is already loaded
	if (window.google?.accounts?.oauth2) {
		// Use the existing GIS client if available
		await requestCodeWithGIS();
	} else {
		// Load Google GIS script and then request code
		loadGoogleGISAndRequestCode();
	}
}

/**
 * Request authorization code using Google Identity Services
 */
async function requestCodeWithGIS() {
	const { nanoid } = await import('nanoid');
	const state = nanoid();

	const client = window.google.accounts.oauth2.initCodeClient({
		client_id: GOOGLE_CLIENT_ID,
		scope: 'openid profile email',
		ux_mode: 'redirect',
		state,
		redirect_uri: getRedirectUri(),
		callback: (response) => {
			if (response.error) {
				console.error('Google OAuth error:', response.error);
				throw new Error('Failed to initCodeClient', response.error);
			}
			if (response.state !== state) {
				throw new Error('State mismatch');
			}
		}
	});

	client.requestCode();
}

/**
 * Load Google GIS script and then request authorization code
 */
function loadGoogleGISAndRequestCode() {
	const script = document.createElement('script');
	script.src = 'https://accounts.google.com/gsi/client';
	script.nonce = '%sveltekit.nonce%';
	script.onload = () => {
		// Initialize Google Identity Services
		window.google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: (response) => {
				if (!response.credential || !response.clientId) {
					throw new Error('Failed to initialize google sign in');
				}
			}
		});

		// Request authorization code
		requestCodeWithGIS();
	};
	script.onerror = () => {
		throw new Error('Google gsi script failed to load');
	};

	document.body.appendChild(script);
}
