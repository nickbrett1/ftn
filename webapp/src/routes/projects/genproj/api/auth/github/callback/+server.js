/**
 * @fileoverview GitHub OAuth callback handler
 * @description Handles GitHub OAuth callback and stores authentication tokens
 */

import { redirect } from '@sveltejs/kit';
import { validateAuthState, validateGitHubToken } from '$lib/utils/auth-helpers.js';
import { genprojAuth } from '$lib/server/genproj-auth.js';
import { getCurrentUser } from '$lib/server/auth-helpers.js';

// Try to import environment variables, with fallbacks for build time
let GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET;
try {
	const env = await import('$env/static/private');
	GITHUB_CLIENT_ID = env.GITHUB_CLIENT_ID;
	GITHUB_CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;
} catch (error) {
	console.warn(
		'[GITHUB_CALLBACK] Environment variables not available at build time, using placeholders',
		error instanceof Error ? error.message : String(error)
	);
	GITHUB_CLIENT_ID = process.env?.GITHUB_CLIENT_ID || 'placeholder';
	GITHUB_CLIENT_SECRET = process.env?.GITHUB_CLIENT_SECRET || 'placeholder';
}

const logPrefix = '[GITHUB_CALLBACK]';

/**
 * Exchange GitHub authorization code for access token
 * @param {string} code - Authorization code from GitHub
 * @param {string} redirectUri - Redirect URI used in OAuth flow
 * @returns {Promise<Object>} Token response
 */
async function exchangeGitHubToken(code, redirectUri) {
	if (!GITHUB_CLIENT_SECRET || GITHUB_CLIENT_SECRET === 'placeholder') {
		throw new Error('GitHub client secret not configured');
	}
	if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID === 'placeholder') {
		throw new Error('GitHub client ID not configured');
	}

	const body = new URLSearchParams({
		client_id: GITHUB_CLIENT_ID,
		client_secret: GITHUB_CLIENT_SECRET,
		code,
		redirect_uri: redirectUri
	});

	const response = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body
	});

	const data = await response.json();

	if (data.error) {
		console.error(`${logPrefix} Token exchange error: ${data.error_description || data.error}`);
		throw new Error(data.error_description || data.error);
	}

	return data;
}

/**
 * GET handler for GitHub OAuth callback
 * @param {Object} params - Request parameters
 * @param {Object} params.request - Request object
 * @param {Object} params.platform - Platform object with env
 * @returns {Response} Redirect or error
 */
export async function GET({ request, platform }) {
	try {
		const url = new URL(request.url);

		// Check for OAuth errors
		const errorParam = url.searchParams.get('error');
		if (errorParam) {
			console.error(`${logPrefix} OAuth error from GitHub: ${errorParam}`);
			throw redirect(302, `${url.origin}/projects/genproj?error=github_auth_failed`);
		}

		// Get authorization code and state
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');

		if (!code) {
			throw new Error('No authorization code received from GitHub');
		}

		if (!state) {
			throw new Error('No state parameter received from GitHub');
		}

		// Validate state from KV
		if (platform?.env?.KV) {
			const stateKey = `github_oauth_state_${state}`;
			const storedState = await platform.env.KV.get(stateKey);

			if (!storedState || !validateAuthState(state, storedState)) {
				console.error(`${logPrefix} Invalid or expired state parameter`);
				throw redirect(302, `${url.origin}/projects/genproj?error=invalid_state`);
			}

			// Delete state from KV after validation
			await platform.env.KV.delete(stateKey);
		}

		// Exchange code for access token
		const redirectUri = `${url.origin}/projects/genproj/api/auth/github/callback`;
		const tokenResponse = await exchangeGitHubToken(code, redirectUri);

		if (!tokenResponse.access_token) {
			throw new Error('No access token received from GitHub');
		}

		// Validate token and get user info
		const validationResult = await validateGitHubToken(tokenResponse.access_token);

		if (!validationResult.success) {
			console.error(`${logPrefix} Token validation failed: ${validationResult.error}`);
			throw redirect(302, `${url.origin}/projects/genproj?error=token_validation_failed`);
		}

		const { authState } = validationResult;

		// Get current user from Google auth
		const currentUser = await getCurrentUser(request, platform);

		if (!currentUser) {
			throw redirect(302, `${url.origin}/projects/genproj?error=google_auth_required`);
		}

		// Initialize auth manager with platform
		await genprojAuth.initialize(currentUser, platform);

		// Update GitHub authentication
		const updated = await genprojAuth.updateGitHubAuth({
			username: authState.metadata.username,
			token: authState.token,
			expiresAt: authState.expiresAt,
			scopes: tokenResponse.scope ? tokenResponse.scope.split(',') : []
		});

		if (!updated) {
			throw new Error('Failed to update GitHub authentication');
		}

		console.log(`${logPrefix} GitHub authentication successful for user: ${currentUser.email}`);

		// Redirect back to genproj page with success
		throw redirect(302, `${url.origin}/projects/genproj?auth=github_success`);
	} catch (error) {
		// SvelteKit redirect throws, so we need to catch it
		if (
			error.status === 302 ||
			error.status === 301 ||
			error.status === 307 ||
			error.status === 308
		) {
			throw error; // Re-throw redirects
		}

		console.error(`${logPrefix} GitHub OAuth callback error:`, error);
		const redirectUrl = new URL('/projects/genproj', request.url);
		redirectUrl.searchParams.set('error', 'github_auth_failed');
		throw redirect(302, redirectUrl.toString());
	}
}
