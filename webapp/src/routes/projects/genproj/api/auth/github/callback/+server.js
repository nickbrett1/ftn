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
			
			// Try to get preserved selections from state
			let preservedSelections = {
				selected: null,
				projectName: null,
				repositoryUrl: null
			};
			
			const stateParam = url.searchParams.get('state');
			if (stateParam && platform?.env?.KV) {
				try {
					const stateKey = `github_oauth_state_${stateParam}`;
					const storedStateData = await platform.env.KV.get(stateKey);
					if (storedStateData) {
						const stateData = JSON.parse(storedStateData);
						preservedSelections = {
							selected: stateData.selected || null,
							projectName: stateData.projectName || null,
							repositoryUrl: stateData.repositoryUrl || null
						};
					}
				} catch (e) {
					// Ignore errors, just use empty selections
				}
			}
			
			// Build redirect URL with error and preserved selections
			const redirectParams = new URLSearchParams();
			redirectParams.set('error', 'github_auth_failed');
			if (preservedSelections.selected) {
				redirectParams.set('selected', preservedSelections.selected);
			}
			if (preservedSelections.projectName) {
				redirectParams.set('projectName', preservedSelections.projectName);
			}
			if (preservedSelections.repositoryUrl) {
				redirectParams.set('repositoryUrl', preservedSelections.repositoryUrl);
			}
			
			throw redirect(302, `${url.origin}/projects/genproj?${redirectParams.toString()}`);
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

		// Validate state from KV and get preserved selections
		let preservedSelections = {
			selected: null,
			projectName: null,
			repositoryUrl: null
		};

		if (platform?.env?.KV) {
			const stateKey = `github_oauth_state_${state}`;
			const storedStateData = await platform.env.KV.get(stateKey);

			if (!storedStateData) {
				console.error(`${logPrefix} Invalid or expired state parameter`);
				throw redirect(302, `${url.origin}/projects/genproj?error=invalid_state`);
			}
			
			try {
				const stateData = JSON.parse(storedStateData);
				if (!stateData.state || !validateAuthState(state, stateData.state)) {
					console.error(`${logPrefix} State mismatch`);
					throw redirect(302, `${url.origin}/projects/genproj?error=invalid_state`);
				}
				// Extract preserved selections
				preservedSelections = {
					selected: stateData.selected || null,
					projectName: stateData.projectName || null,
					repositoryUrl: stateData.repositoryUrl || null
				};
			} catch (parseError) {
				// Legacy format: just state string
				if (!validateAuthState(state, storedStateData)) {
					console.error(`${logPrefix} Invalid state parameter`);
					throw redirect(302, `${url.origin}/projects/genproj?error=invalid_state`);
				}
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
			
			// Build redirect URL with error and preserved selections
			const redirectParams = new URLSearchParams();
			redirectParams.set('error', 'token_validation_failed');
			if (preservedSelections.selected) {
				redirectParams.set('selected', preservedSelections.selected);
			}
			if (preservedSelections.projectName) {
				redirectParams.set('projectName', preservedSelections.projectName);
			}
			if (preservedSelections.repositoryUrl) {
				redirectParams.set('repositoryUrl', preservedSelections.repositoryUrl);
			}
			
			throw redirect(302, `${url.origin}/projects/genproj?${redirectParams.toString()}`);
		}

		const { authState } = validationResult;

		// Get current user from Google auth
		const currentUser = await getCurrentUser(request, platform);

		if (!currentUser) {
			// Build redirect URL with error and preserved selections
			const redirectParams = new URLSearchParams();
			redirectParams.set('error', 'google_auth_required');
			if (preservedSelections.selected) {
				redirectParams.set('selected', preservedSelections.selected);
			}
			if (preservedSelections.projectName) {
				redirectParams.set('projectName', preservedSelections.projectName);
			}
			if (preservedSelections.repositoryUrl) {
				redirectParams.set('repositoryUrl', preservedSelections.repositoryUrl);
			}
			
			throw redirect(302, `${url.origin}/projects/genproj?${redirectParams.toString()}`);
		}

		// Initialize auth manager with platform
		if (!genprojAuth.kv) {
			genprojAuth.initializePlatform(platform);
		}
		
		// Verify KV is available
		if (!genprojAuth.kv) {
			console.error(`${logPrefix} KV not available. KV binding not configured in platform.env`);
			const redirectParams = new URLSearchParams();
			redirectParams.set('error', 'kv_not_configured');
			if (preservedSelections.selected) {
				redirectParams.set('selected', preservedSelections.selected);
			}
			if (preservedSelections.projectName) {
				redirectParams.set('projectName', preservedSelections.projectName);
			}
			if (preservedSelections.repositoryUrl) {
				redirectParams.set('repositoryUrl', preservedSelections.repositoryUrl);
			}
			throw redirect(302, `${url.origin}/projects/genproj?${redirectParams.toString()}`);
		}
		
		const initialized = await genprojAuth.initialize(currentUser, platform);
		
		if (!initialized) {
			console.error(`${logPrefix} Failed to initialize authentication manager`);
			const redirectParams = new URLSearchParams();
			redirectParams.set('error', 'auth_init_failed');
			if (preservedSelections.selected) {
				redirectParams.set('selected', preservedSelections.selected);
			}
			if (preservedSelections.projectName) {
				redirectParams.set('projectName', preservedSelections.projectName);
			}
			if (preservedSelections.repositoryUrl) {
				redirectParams.set('repositoryUrl', preservedSelections.repositoryUrl);
			}
			throw redirect(302, `${url.origin}/projects/genproj?${redirectParams.toString()}`);
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

		// Build redirect path preserving user's selections
		const redirectParams = new URLSearchParams();
		redirectParams.set('auth', 'github_success');
		if (preservedSelections.selected) {
			redirectParams.set('selected', preservedSelections.selected);
		}
		if (preservedSelections.projectName) {
			redirectParams.set('projectName', preservedSelections.projectName);
		}
		if (preservedSelections.repositoryUrl) {
			redirectParams.set('repositoryUrl', preservedSelections.repositoryUrl);
		}

		const redirectPath = `/projects/genproj?${redirectParams.toString()}`;

		// Redirect back to genproj page with success and preserved selections
		throw redirect(302, `${url.origin}${redirectPath}`);
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
		
		// Try to preserve selections even on generic errors
		let preservedSelections = {
			selected: null,
			projectName: null,
			repositoryUrl: null
		};
		
		// Get URL from request (may not be in scope if error occurred early)
		const requestUrl = new URL(request.url);
		const stateParam = requestUrl.searchParams.get('state');
		
		if (stateParam && platform?.env?.KV) {
			try {
				const stateKey = `github_oauth_state_${stateParam}`;
				const storedStateData = await platform.env.KV.get(stateKey);
				if (storedStateData) {
					const stateData = JSON.parse(storedStateData);
					preservedSelections = {
						selected: stateData.selected || null,
						projectName: stateData.projectName || null,
						repositoryUrl: stateData.repositoryUrl || null
					};
				}
			} catch (e) {
				// Ignore errors, just use empty selections
			}
		}
		
		const redirectUrl = new URL('/projects/genproj', request.url);
		redirectUrl.searchParams.set('error', 'github_auth_failed');
		if (preservedSelections.selected) {
			redirectUrl.searchParams.set('selected', preservedSelections.selected);
		}
		if (preservedSelections.projectName) {
			redirectUrl.searchParams.set('projectName', preservedSelections.projectName);
		}
		if (preservedSelections.repositoryUrl) {
			redirectUrl.searchParams.set('repositoryUrl', preservedSelections.repositoryUrl);
		}
		
		throw redirect(302, redirectUrl.toString());
	}
}
