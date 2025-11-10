/**
 * Authentication Helper Utilities
 *
 * Provides utilities for handling authentication flows and token management
 * for external services in the genproj tool.
 *
 * @fileoverview Universal authentication helper utilities for genproj
 */

/**
 * @typedef {Object} AuthState
 * @property {string} service - Service name (github, circleci, doppler, sonarcloud)
 * @property {string} token - Authentication token
 * @property {Date} expiresAt - Token expiration date
 * @property {Object} [metadata] - Additional service-specific metadata
 */

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success - Whether authentication was successful
 * @property {string} [error] - Error message if authentication failed
 * @property {AuthState} [authState] - Authentication state if successful
 */

/**
 * Generates a secure random state parameter for OAuth flows
 * Uses crypto.getRandomValues() for cryptographically secure random generation
 * @param {number} [length=32] - Length of the state parameter
 * @returns {string} Random state parameter
 */
export function generateAuthState(length = 32) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const randomBytes = new Uint8Array(length);
	crypto.getRandomValues(randomBytes);
	let result = '';
	for (let index = 0; index < length; index++) {
		result += chars.charAt(randomBytes[index] % chars.length);
	}
	return result;
}

/**
 * Validates an OAuth state parameter
 * @param {string} state - State parameter to validate
 * @param {string} expectedState - Expected state parameter
 * @returns {boolean} Whether the state is valid
 */
export function validateAuthState(state, expectedState) {
	return state && expectedState && state === expectedState;
}

/**
 * Generates GitHub OAuth authorization URL
 * @param {string} clientId - GitHub OAuth client ID
 * @param {string} redirectUri - OAuth redirect URI
 * @param {string} state - State parameter for CSRF protection
 * @param {string[]} [scopes] - Requested OAuth scopes
 * @returns {string} GitHub OAuth authorization URL
 */
export function generateGitHubAuthUrl(
	clientId,
	redirectUri,
	state,
	scopes = ['repo', 'user:email']
) {
	const parameters = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: scopes.join(' '),
		state: state,
		response_type: 'code'
	});

	return `https://github.com/login/oauth/authorize?${parameters.toString()}`;
}

/**
 * Generates CircleCI API token authentication URL
 * @param {string} redirectUri - Redirect URI after token creation
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} CircleCI token creation URL
 */
export function generateCircleCIAuthUrl(redirectUri, state) {
	const parameters = new URLSearchParams({
		redirect_uri: redirectUri,
		state: state
	});

	return `https://app.circleci.com/settings/user/tokens?${parameters.toString()}`;
}

/**
 * Generates Doppler API token authentication URL
 * @param {string} redirectUri - Redirect URI after token creation
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} Doppler token creation URL
 */
export function generateDopplerAuthUrl(redirectUri, state) {
	const parameters = new URLSearchParams({
		redirect_uri: redirectUri,
		state: state
	});

	return `https://dashboard.doppler.com/security/tokens?${parameters.toString()}`;
}

/**
 * Generates SonarCloud API token authentication URL
 * @param {string} redirectUri - Redirect URI after token creation
 * @param {string} state - State parameter for CSRF protection
 * @returns {string} SonarCloud token creation URL
 */
export function generateSonarCloudAuthUrl(redirectUri, state) {
	const parameters = new URLSearchParams({
		redirect_uri: redirectUri,
		state: state
	});

	return `https://sonarcloud.io/account/security?${parameters.toString()}`;
}

/**
 * Validates a GitHub access token by making a test API call
 * @param {string} token - GitHub access token
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function validateGitHubToken(token) {
	try {
		const response = await fetch('https://api.github.com/user', {
			headers: {
				Authorization: `token ${token}`,
				Accept: 'application/vnd.github.v3+json',
				'User-Agent': 'genproj-tool'
			}
		});

		if (!response.ok) {
			return {
				success: false,
				error: `GitHub API error: ${response.status} ${response.statusText}`
			};
		}

		const user = await response.json();

		return {
			success: true,
			authState: {
				service: 'github',
				token: token,
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // GitHub tokens don't expire by default
				metadata: {
					username: user.login,
					userId: user.id,
					email: user.email
				}
			}
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to validate GitHub token: ${error.message}`
		};
	}
}

/**
 * Validates a CircleCI API token by making a test API call
 * @param {string} token - CircleCI API token
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function validateCircleCIToken(token) {
	try {
		const response = await fetch('https://circleci.com/api/v2/me', {
			headers: {
				'Circle-Token': token,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			return {
				success: false,
				error: `CircleCI API error: ${response.status} ${response.statusText}`
			};
		}

		const user = await response.json();

		return {
			success: true,
			authState: {
				service: 'circleci',
				token: token,
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // CircleCI tokens don't expire by default
				metadata: {
					username: user.name,
					userId: user.id,
					login: user.login
				}
			}
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to validate CircleCI token: ${error.message}`
		};
	}
}

/**
 * Validates a Doppler API token by making a test API call
 * @param {string} token - Doppler API token
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function validateDopplerToken(token) {
	try {
		const response = await fetch('https://api.doppler.com/v3/me', {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			return {
				success: false,
				error: `Doppler API error: ${response.status} ${response.statusText}`
			};
		}

		const user = await response.json();

		return {
			success: true,
			authState: {
				service: 'doppler',
				token: token,
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Doppler tokens don't expire by default
				metadata: {
					username: user.name,
					userId: user.id,
					email: user.email
				}
			}
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to validate Doppler token: ${error.message}`
		};
	}
}

/**
 * Validates a SonarCloud API token by making a test API call
 * @param {string} token - SonarCloud API token
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function validateSonarCloudToken(token) {
	try {
		const response = await fetch('https://sonarcloud.io/api/authentication/validate', {
			headers: {
				Authorization: `Basic ${btoa(token + ':')}`,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			return {
				success: false,
				error: `SonarCloud API error: ${response.status} ${response.statusText}`
			};
		}

		const result = await response.json();

		return {
			success: true,
			authState: {
				service: 'sonarcloud',
				token: token,
				expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // SonarCloud tokens don't expire by default
				metadata: {
					valid: result.valid
				}
			}
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to validate SonarCloud token: ${error.message}`
		};
	}
}

/**
 * Validates a token for a specific service
 * @param {string} service - Service name
 * @param {string} token - Authentication token
 * @returns {Promise<AuthResult>} Authentication result
 */
export async function validateServiceToken(service, token) {
	switch (service) {
		case 'github': {
			return validateGitHubToken(token);
		}
		case 'circleci': {
			return validateCircleCIToken(token);
		}
		case 'doppler': {
			return validateDopplerToken(token);
		}
		case 'sonarcloud': {
			return validateSonarCloudToken(token);
		}
		default: {
			return {
				success: false,
				error: `Unknown service: ${service}`
			};
		}
	}
}

/**
 * Checks if an authentication state is expired
 * @param {AuthState} authState - Authentication state to check
 * @returns {boolean} Whether the authentication state is expired
 */
export function isAuthStateExpired(authState) {
	return authState.expiresAt && new Date() > authState.expiresAt;
}

/**
 * Formats authentication error messages for user display
 * @param {string} service - Service name
 * @param {string} error - Error message
 * @returns {string} User-friendly error message
 */
export function formatAuthError(service, error) {
	const serviceNames = {
		github: 'GitHub',
		circleci: 'CircleCI',
		doppler: 'Doppler',
		sonarcloud: 'SonarCloud'
	};

	const serviceName = serviceNames[service] || service;

	if (error.includes('401') || error.includes('Unauthorized')) {
		return `Invalid ${serviceName} token. Please check your token and try again.`;
	}

	if (error.includes('403') || error.includes('Forbidden')) {
		return `Insufficient permissions for ${serviceName}. Please ensure your token has the required permissions.`;
	}

	if (error.includes('429') || error.includes('rate limit')) {
		return `${serviceName} rate limit exceeded. Please try again later.`;
	}

	if (error.includes('network') || error.includes('fetch')) {
		return `Network error connecting to ${serviceName}. Please check your internet connection and try again.`;
	}

	return `${serviceName} authentication failed: ${error}`;
}
