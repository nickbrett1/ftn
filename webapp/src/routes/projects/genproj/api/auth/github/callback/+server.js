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
 * Build redirect URL with parameters and preserved selections
 * @param {string} baseUrl - Base URL
 * @param {Object} params - URL parameters object
 * @param {Object} preservedSelections - Preserved selections object
 * @returns {string} Complete redirect URL
 */
function buildRedirectUrl(baseUrl, params, preservedSelections) {
	const url = new URL(baseUrl);
	Object.entries(params).forEach(([key, value]) => {
		if (value) url.searchParams.set(key, value);
	});
	if (preservedSelections.selected) {
		url.searchParams.set('selected', preservedSelections.selected);
	}
	if (preservedSelections.projectName) {
		url.searchParams.set('projectName', preservedSelections.projectName);
	}
	if (preservedSelections.repositoryUrl) {
		url.searchParams.set('repositoryUrl', preservedSelections.repositoryUrl);
	}
	return url.toString();
}

/**
 * Get preserved selections from state data
 * @param {Object} stateData - State data object
 * @returns {Object} Preserved selections
 */
function getPreservedSelections(stateData) {
	return {
		selected: stateData?.selected || null,
		projectName: stateData?.projectName || null,
		repositoryUrl: stateData?.repositoryUrl || null
	};
}

/**
 * Validate state parameter and get state data from KV
 * @param {string} state - State parameter
 * @param {Object} platform - Platform object
 * @returns {Promise<Object>} State data and preserved selections
 */
async function validateAndGetStateData(state, platform) {
	if (!platform?.env?.KV) {
		throw new Error('KV not available');
	}

	const stateKey = `github_oauth_state_${state}`;
	const storedStateData = await platform.env.KV.get(stateKey);

	if (!storedStateData) {
		throw new Error('Invalid or expired state parameter');
	}

	try {
		const stateData = JSON.parse(storedStateData);
		if (!stateData.state || !validateAuthState(state, stateData.state)) {
			throw new Error('State mismatch');
		}
		return {
			stateData,
			preservedSelections: getPreservedSelections(stateData)
		};
	} catch (parseError) {
		// Legacy format: just state string
		if (!validateAuthState(state, storedStateData)) {
			throw new Error('Invalid state parameter');
		}
		return {
			stateData: null,
			preservedSelections: { selected: null, projectName: null, repositoryUrl: null }
		};
	}
}

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
 * Handle OAuth error from GitHub
 * @param {string} errorParam - Error parameter from GitHub
 * @param {Object} platform - Platform object
 * @param {URL} url - Request URL
 * @returns {never} Throws redirect
 */
async function handleOAuthError(errorParam, platform, url) {
	console.error(`${logPrefix} OAuth error from GitHub: ${errorParam}`);

	let preservedSelections = { selected: null, projectName: null, repositoryUrl: null };
	const stateParam = url.searchParams.get('state');

	if (stateParam && platform?.env?.KV) {
		const stateKey = `github_oauth_state_${stateParam}`;
		const storedStateData = await platform.env.KV.get(stateKey);
		if (storedStateData) {
			try {
				const stateData = JSON.parse(storedStateData);
				preservedSelections = getPreservedSelections(stateData);
			} catch (parseError) {
				console.warn(`${logPrefix} Failed to parse state data for OAuth error handling:`, parseError);
				// Continue with empty selections
			}
		}
	}

	throw redirect(302, buildRedirectUrl(`${url.origin}/projects/genproj`, { error: 'github_auth_failed' }, preservedSelections));
}

/**
 * Handle token validation error
 * @param {string} error - Error message
 * @param {Object} preservedSelections - Preserved selections
 * @param {URL} url - Request URL
 * @returns {never} Throws redirect
 */
function handleTokenValidationError(error, preservedSelections, url) {
	console.error(`${logPrefix} Token validation failed: ${error}`);
	throw redirect(302, buildRedirectUrl(`${url.origin}/projects/genproj`, { error: 'token_validation_failed' }, preservedSelections));
}

/**
 * Handle authentication initialization error
 * @param {string} errorType - Type of error
 * @param {Object} preservedSelections - Preserved selections
 * @param {URL} url - Request URL
 * @returns {never} Throws redirect
 */
function handleAuthInitializationError(errorType, preservedSelections, url) {
	throw redirect(302, buildRedirectUrl(`${url.origin}/projects/genproj`, { error: errorType }, preservedSelections));
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
			await handleOAuthError(errorParam, platform, url);
		}

		// Get and validate required parameters
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');

		if (!code) {
			throw new Error('No authorization code received from GitHub');
		}
		if (!state) {
			throw new Error('No state parameter received from GitHub');
		}

		// Validate state and get preserved selections
		const { preservedSelections } = await validateAndGetStateData(state, platform);

		// Delete state from KV after validation
		if (platform?.env?.KV) {
			await platform.env.KV.delete(`github_oauth_state_${state}`);
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
			handleTokenValidationError(validationResult.error, preservedSelections, url);
		}

		const { authState } = validationResult;

		// Get current user from Google auth
		const currentUser = await getCurrentUser(request, platform);
		if (!currentUser) {
			handleAuthInitializationError('google_auth_required', preservedSelections, url);
		}

		// Initialize auth manager
		if (!genprojAuth.kv) {
			genprojAuth.initializePlatform(platform);
		}
		if (!genprojAuth.kv) {
			console.error(`${logPrefix} KV not available. KV binding not configured in platform.env`);
			handleAuthInitializationError('kv_not_configured', preservedSelections, url);
		}

		const initialized = await genprojAuth.initialize(currentUser, platform);
		if (!initialized) {
			console.error(`${logPrefix} Failed to initialize authentication manager`);
			handleAuthInitializationError('auth_init_failed', preservedSelections, url);
		}

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
		throw redirect(302, buildRedirectUrl(`${url.origin}/projects/genproj`, { auth: 'github_success' }, preservedSelections));
	} catch (error) {
		// SvelteKit redirect throws, so we need to catch it
		if (error.status >= 300 && error.status < 400) {
			throw error; // Re-throw redirects
		}

		console.error(`${logPrefix} GitHub OAuth callback error:`, error);

		// Determine the appropriate error type based on the error message
		let errorType = 'github_auth_failed';
		if (error.message?.includes('Invalid') && error.message?.includes('state') ||
		    error.message?.includes('expired state') ||
		    error.message?.includes('state mismatch')) {
			errorType = 'invalid_state';
		}

		// Try to preserve selections on errors
		let preservedSelections = { selected: null, projectName: null, repositoryUrl: null };
		const errorRequestUrl = new URL(request.url);
		const stateParam = errorRequestUrl.searchParams.get('state');

		if (stateParam && platform?.env?.KV) {
			const stateKey = `github_oauth_state_${stateParam}`;
			const storedStateData = await platform.env.KV.get(stateKey);
			if (storedStateData) {
				try {
					const stateData = JSON.parse(storedStateData);
					preservedSelections = getPreservedSelections(stateData);
				} catch (parseError) {
					console.warn(`${logPrefix} Failed to parse state data for error handling:`, parseError);
					// Continue with empty selections
				}
			}
		}

		throw redirect(302, buildRedirectUrl(`${errorRequestUrl.origin}/projects/genproj`, { error: errorType }, preservedSelections));
	}
}
