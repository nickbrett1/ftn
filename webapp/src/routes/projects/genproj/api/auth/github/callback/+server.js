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
	for (const [key, value] of Object.entries(params)) {
		if (value) url.searchParams.set(key, value);
	}
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

	let stateData, preservedSelections;

	try {
		stateData = JSON.parse(storedStateData);
		if (!stateData.state || !validateAuthState(state, stateData.state)) {
			throw new Error('State mismatch');
		}
		preservedSelections = getPreservedSelections(stateData);
	} catch (parseError) {
		// JSON parsing failed - fallback to legacy format (plain state string)
		// This handles migration from older state storage format
		if (parseError instanceof SyntaxError && !validateAuthState(state, storedStateData)) {
			throw new Error('Invalid state parameter');
		}
		if (!(parseError instanceof SyntaxError)) {
			// Re-throw non-JSON parsing errors
			throw parseError;
		}
		stateData = null;
		preservedSelections = { selected: null, projectName: null, repositoryUrl: null };
	}

	return { stateData, preservedSelections };
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
 * Get preserved selections from stored state data
 * @param {string} stateParam - State parameter
 * @param {Object} platform - Platform object
 * @returns {Promise<Object>} Preserved selections
 */
async function getPreservedSelectionsFromState(stateParam, platform) {
	let preservedSelections = { selected: null, projectName: null, repositoryUrl: null };

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

	return preservedSelections;
}

/**
 * Handle OAuth error from GitHub
 * @param {string} errorParam - Error parameter from GitHub
 * @param {Object} preservedSelections - Preserved selections
 * @param {URL} url - Request URL
 * @returns {never} Throws redirect
 */
function handleOAuthError(errorParam, preservedSelections, url) {
	console.error(`${logPrefix} OAuth error from GitHub: ${errorParam}`);

	throw redirect(
		302,
		buildRedirectUrl(
			`${url.origin}/projects/genproj`,
			{ error: 'github_auth_failed' },
			preservedSelections
		)
	);
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
	throw redirect(
		302,
		buildRedirectUrl(
			`${url.origin}/projects/genproj`,
			{ error: 'token_validation_failed' },
			preservedSelections
		)
	);
}

/**
 * Handle authentication initialization error
 * @param {string} errorType - Type of error
 * @param {Object} preservedSelections - Preserved selections
 * @param {URL} url - Request URL
 * @returns {never} Throws redirect
 */
function handleAuthInitializationError(errorType, preservedSelections, url) {
	throw redirect(
		302,
		buildRedirectUrl(`${url.origin}/projects/genproj`, { error: errorType }, preservedSelections)
	);
}

/**
 * Extract and validate request parameters from URL
 * @param {URL} url - Request URL
 * @param {Object} platform - Platform object
 * @returns {Promise<Object>} Validation result with code, state, and preserved selections
 */
async function extractAndValidateParams(url, platform) {
	// Check for OAuth errors
	const errorParam = url.searchParams.get('error');
	if (errorParam) {
		const preservedSelections = await getPreservedSelectionsFromState(
			url.searchParams.get('state'),
			platform
		);
		handleOAuthError(errorParam, preservedSelections, url);
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

	return { code, state, preservedSelections };
}

/**
 * Handle token exchange and validation
 * @param {string} code - Authorization code
 * @param {string} redirectUri - Redirect URI
 * @param {Object} preservedSelections - Preserved selections
 * @param {URL} url - Request URL
 * @returns {Promise<Object>} Token response and auth state
 */
async function handleTokenExchangeAndValidation(code, redirectUri, preservedSelections, url) {
	// Exchange code for access token
	const tokenResponse = await exchangeGitHubToken(code, redirectUri);

	if (!tokenResponse.access_token) {
		throw new Error('No access token received from GitHub');
	}

	// Validate token and get user info
	const validationResult = await validateGitHubToken(tokenResponse.access_token);
	if (!validationResult.success) {
		handleTokenValidationError(validationResult.error, preservedSelections, url);
	}

	return { tokenResponse, authState: validationResult.authState };
}

/**
 * Initialize authentication manager and validate user
 * @param {Object} request - Request object
 * @param {Object} platform - Platform object
 * @param {Object} preservedSelections - Preserved selections
 * @param {URL} url - Request URL
 * @returns {Promise<Object>} Current user
 */
async function initializeAuthAndValidateUser(request, platform, preservedSelections, url) {
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

	return currentUser;
}

/**
 * Process GitHub OAuth callback and update authentication
 * @param {Object} request - Request object
 * @param {URL} url - Request URL
 * @param {string} code - Authorization code
 * @param {string} state - State parameter
 * @param {Object} preservedSelections - Preserved selections
 * @param {Object} platform - Platform object
 * @returns {Promise<Object>} Success result with user info
 */
async function processGitHubCallback(request, url, code, state, preservedSelections, platform) {
	// Delete state from KV after validation
	if (platform?.env?.KV) {
		await platform.env.KV.delete(`github_oauth_state_${state}`);
	}

	// Handle token exchange and validation
	const redirectUri = `${url.origin}/projects/genproj/api/auth/github/callback`;
	const { tokenResponse, authState } = await handleTokenExchangeAndValidation(
		code,
		redirectUri,
		preservedSelections,
		url
	);

	// Initialize auth and validate user
	const currentUser = await initializeAuthAndValidateUser(
		request,
		platform,
		preservedSelections,
		url
	);

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

	return { currentUser, preservedSelections };
}

/**
 * Handle errors from GitHub OAuth callback processing
 * @param {Error} error - The error that occurred
 * @param {Object} preservedSelections - Preserved selections
 * @param {URL} errorRequestUrl - Request URL
 * @returns {never} Throws redirect
 */
function handleCallbackError(error, preservedSelections, errorRequestUrl) {
	console.error(`${logPrefix} GitHub OAuth callback error:`, error);

	// Determine the appropriate error type based on the error message
	let errorType = 'github_auth_failed';
	const errorMessage = error.message?.toLowerCase() || '';
	if (
		(errorMessage.includes('invalid') && errorMessage.includes('state')) ||
		errorMessage.includes('expired state') ||
		errorMessage.includes('state mismatch') ||
		errorMessage.includes('invalid or expired state')
	) {
		errorType = 'invalid_state';
	}

	throw redirect(
		302,
		buildRedirectUrl(
			`${errorRequestUrl.origin}/projects/genproj`,
			{ error: errorType },
			preservedSelections
		)
	);
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

		// Extract and validate request parameters
		const { code, state, preservedSelections } = await extractAndValidateParams(url, platform);

		// Process the callback and update authentication
		const { currentUser } = await processGitHubCallback(
			request,
			url,
			code,
			state,
			preservedSelections,
			platform
		);

		console.log(`${logPrefix} GitHub authentication successful for user: ${currentUser.email}`);

		// Redirect back to genproj page with success
		throw redirect(
			302,
			buildRedirectUrl(
				`${url.origin}/projects/genproj`,
				{ auth: 'github_success' },
				preservedSelections
			)
		);
	} catch (error) {
		// SvelteKit redirect throws, so we need to catch it
		if (error.status >= 300 && error.status < 400) {
			throw error; // Re-throw redirects
		}

		const errorRequestUrl = new URL(request.url);
		const preservedSelections = await getPreservedSelectionsFromState(
			errorRequestUrl.searchParams.get('state'),
			platform
		);
		handleCallbackError(error, preservedSelections, errorRequestUrl);
	}
}
