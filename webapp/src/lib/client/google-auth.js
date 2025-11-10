/**
 * Shared Google OAuth utility functions
 */

const GOOGLE_CLIENT_ID = '263846603498-57v6mk1hacurssur6atn1tiplsnv4j18.apps.googleusercontent.com';

/**
 * Get the appropriate redirect URI based on environment
 */
export function getRedirectUri() {
	// For development, use localhost
	if (process.env.NODE_ENV === 'development') {
		return 'http://127.0.0.1:5173/auth';
	}

	// For production/preview, use the current origin dynamically
	// This ensures preview deployments redirect back to the preview domain
	if (typeof globalThis !== 'undefined') {
		// Changed window to globalThis
		return `${globalThis.location.origin}/auth`; // Changed window to globalThis
	}

	// Fallback for SSR
	return 'https://fintechnick.com/auth';
}

/**
 * Check if user is currently authenticated
 */
export function isUserAuthenticated() {
	const match = document.cookie.match(/(^| )auth=([^;]+)/);
	const result = match !== null && match[2] !== 'deleted';
	return result;
}

/**
 * Initiate Google OAuth flow using the Google Identity Services library
 * This is the preferred method as it handles the OAuth flow properly
 * @param {string} redirectPath - Optional path to redirect to after successful auth (defaults to /projects/ccbilling)
 */
export async function initiateGoogleAuth(redirectPath = '/') {
	// Check if user is already logged in
	if (isUserAuthenticated()) {
		// If already logged in, redirect using SvelteKit navigation
		const { goto } = await import('$app/navigation');
		goto(redirectPath);
		return;
	}

	// Set a cookie to store the redirect path
	const expires = new Date(Date.now() + 5 * 60 * 1000).toUTCString();
	document.cookie = `redirectPath=${redirectPath}; expires=${expires}; path=/; secure; samesite=lax`;

	// Check if Google GIS is already loaded
	if (globalThis.google?.accounts?.oauth2) {
		// Changed window to globalThis
		// Use the existing GIS client if available
		await requestCodeWithGIS();
	} else {
		// Load Google GIS script and then request code
		await loadGoogleGISAndRequestCode();
	}
}

/**
 * Request authorization code using Google Identity Services
 */
async function requestCodeWithGIS() {
	// Check if Google GIS is properly loaded
	if (!globalThis.google?.accounts?.oauth2) {
		// Changed window to globalThis
		throw new Error('Google Identity Services not properly loaded');
	}

	const { nanoid } = await import('nanoid');
	const state = nanoid();

	const client = globalThis.google.accounts.oauth2.initCodeClient({
		// Changed window to globalThis
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
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.nonce = '%sveltekit.nonce%';
		script.addEventListener('load', async () => {
			try {
				// Check if Google GIS is properly loaded
				if (!globalThis.google?.accounts?.id) {
					// Changed window to globalThis
					reject(new Error('Google Identity Services failed to load properly'));
					return;
				}

				// Initialize Google Identity Services
				globalThis.google.accounts.id.initialize({
					// Changed window to globalThis
					client_id: GOOGLE_CLIENT_ID,
					callback: (response) => {
						if (!response.credential || !response.clientId) {
							reject(new Error('Failed to initialize google sign in'));
						}
					}
				});

				// Request authorization code
				await requestCodeWithGIS();
				resolve();
			} catch (error) {
				reject(error);
			}
		});
		script.onerror = () => {
			reject(new Error('Google gsi script failed to load'));
		};

		document.body.append(script);
	});
}
