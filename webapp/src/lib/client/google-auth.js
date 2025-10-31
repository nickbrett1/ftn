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
	if (typeof window !== 'undefined') {
		return `${window.location.origin}/auth`;
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
	const match = document.cookie.match(/(^| )auth=([^;]+)/);
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
	if (typeof window !== 'undefined' && window.localStorage) {
		window.localStorage.setItem('auth_redirect_path', redirectPath);
		console.log('Stored value in localStorage:', window.localStorage.getItem('auth_redirect_path'));
	} else {
		console.error('window or localStorage not available');
		return;
	}

	console.log('Checking if Google GIS is loaded...');

	// Check if Google GIS is already loaded
	if (window.google?.accounts?.oauth2) {
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
	if (!window.google?.accounts?.oauth2) {
		throw new Error('Google Identity Services not properly loaded');
	}

	const { nanoid } = await import('nanoid');
	const state = nanoid();

	// Use the exact redirect URI that's registered in Google Cloud Console
	// The redirect path is already stored in localStorage by initiateGoogleAuth
	const redirectUri = getRedirectUri();

	const client = window.google.accounts.oauth2.initCodeClient({
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
		script.onload = () => {
			try {
				// Check if Google GIS is properly loaded
				if (!window.google?.accounts?.id) {
					reject(new Error('Google Identity Services failed to load properly'));
					return;
				}

				// Initialize Google Identity Services
				window.google.accounts.id.initialize({
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
