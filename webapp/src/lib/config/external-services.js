/**
 * @fileoverview External API service integration configuration
 * @description Configuration for GitHub, CircleCI, Doppler, and SonarCloud API integrations
 */

/**
 * External service configuration
 * @typedef {Object} ServiceConfig
 * @property {string} name - Service name
 * @property {string} baseUrl - API base URL
 * @property {string[]} requiredScopes - Required OAuth scopes
 * @property {Object} rateLimits - Rate limiting configuration
 * @property {Object} auth - Authentication configuration
 */

/**
 * External service configurations
 * @type {Object<string, ServiceConfig>}
 */
export const serviceConfigs = {
	github: {
		name: 'GitHub',
		baseUrl: 'https://api.github.com',
		requiredScopes: ['repo', 'user', 'read:org'],
		rateLimits: {
			requestsPerHour: 5000,
			burstLimit: 100
		},
		auth: {
			type: 'oauth2',
			authUrl: 'https://github.com/login/oauth/authorize',
			tokenUrl: 'https://github.com/login/oauth/access_token',
			scopes: ['repo', 'user', 'read:org']
		}
	},
	circleci: {
		name: 'CircleCI',
		baseUrl: 'https://circleci.com/api/v2',
		requiredScopes: [],
		rateLimits: {
			requestsPerHour: 200,
			burstLimit: 10
		},
		auth: {
			type: 'api_token',
			tokenHeader: 'Circle-Token',
			instructions: 'Generate API token from CircleCI dashboard'
		}
	},
	doppler: {
		name: 'Doppler',
		baseUrl: 'https://api.doppler.com',
		requiredScopes: [],
		rateLimits: {
			requestsPerHour: 1000,
			burstLimit: 50
		},
		auth: {
			type: 'api_token',
			tokenHeader: 'Authorization',
			tokenPrefix: 'Bearer ',
			instructions: 'Generate service token from Doppler dashboard'
		}
	},
	sonarcloud: {
		name: 'SonarCloud',
		baseUrl: 'https://sonarcloud.io/api',
		requiredScopes: [],
		rateLimits: {
			requestsPerHour: 200,
			burstLimit: 10
		},
		auth: {
			type: 'api_token',
			tokenHeader: 'Authorization',
			tokenPrefix: 'Basic ',
			instructions: 'Generate user token from SonarCloud account settings'
		}
	}
};

/**
 * Get service configuration by name
 * @param {string} serviceName - Service name
 * @returns {ServiceConfig|undefined} Service configuration
 */
export function getServiceConfig(serviceName) {
	return serviceConfigs[serviceName];
}

/**
 * Get all service names
 * @returns {string[]} Array of service names
 */
export function getServiceNames() {
	return Object.keys(serviceConfigs);
}

/**
 * Check if service requires OAuth
 * @param {string} serviceName - Service name
 * @returns {boolean} True if service requires OAuth
 */
export function requiresOAuth(serviceName) {
	const config = getServiceConfig(serviceName);
	return config?.auth?.type === 'oauth2';
}

/**
 * Get OAuth configuration for service
 * @param {string} serviceName - Service name
 * @returns {Object|undefined} OAuth configuration
 */
export function getOAuthConfig(serviceName) {
	const config = getServiceConfig(serviceName);
	return config?.auth?.type === 'oauth2' ? config.auth : undefined;
}

/**
 * Get API token configuration for service
 * @param {string} serviceName - Service name
 * @returns {Object|undefined} API token configuration
 */
export function getApiTokenConfig(serviceName) {
	const config = getServiceConfig(serviceName);
	return config?.auth?.type === 'api_token' ? config.auth : undefined;
}

/**
 * Environment variable names for services
 * @type {Object<string, Object>}
 */
export const envVarNames = {
	github: {
		clientId: 'GITHUB_CLIENT_ID',
		clientSecret: 'GITHUB_CLIENT_SECRET',
		redirectUri: 'GITHUB_REDIRECT_URI'
	},
	circleci: {
		apiToken: 'CIRCLECI_API_TOKEN'
	},
	doppler: {
		apiToken: 'DOPPLER_API_TOKEN'
	},
	sonarcloud: {
		apiToken: 'SONARCLOUD_API_TOKEN'
	}
};

/**
 * Get environment variable name for service
 * @param {string} serviceName - Service name
 * @param {string} varType - Variable type (clientId, clientSecret, apiToken, etc.)
 * @returns {string|undefined} Environment variable name
 */
export function getEnvVarName(serviceName, varType) {
	return envVarNames[serviceName]?.[varType];
}

/**
 * Validate service configuration
 * @param {string} serviceName - Service name
 * @param {Object} config - Service configuration to validate
 * @returns {Object} Validation result
 */
export function validateServiceConfig(serviceName, config) {
	const serviceConfig = getServiceConfig(serviceName);
	if (!serviceConfig) {
		return { valid: false, error: `Unknown service: ${serviceName}` };
	}

	const errors = [];

	// Validate required fields
	if (!config.name || config.name !== serviceConfig.name) {
		errors.push('Invalid service name');
	}

	if (!config.baseUrl || config.baseUrl !== serviceConfig.baseUrl) {
		errors.push('Invalid base URL');
	}

	// Validate authentication configuration
	if (serviceConfig.auth.type === 'oauth2') {
		if (!config.auth?.clientId || !config.auth?.clientSecret) {
			errors.push('OAuth2 requires clientId and clientSecret');
		}
	} else if (serviceConfig.auth.type === 'api_token') {
		if (!config.auth?.apiToken) {
			errors.push('API token authentication requires apiToken');
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Rate limiting configuration
 * @type {Object<string, Object>}
 */
export const rateLimitConfig = {
	default: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // limit each IP to 100 requests per windowMs
		message: 'Too many requests from this IP, please try again later.'
	},
	github: {
		windowMs: 60 * 60 * 1000, // 1 hour
		max: 5000, // GitHub allows 5000 requests per hour
		message: 'GitHub API rate limit exceeded'
	},
	circleci: {
		windowMs: 60 * 60 * 1000, // 1 hour
		max: 200, // CircleCI allows 200 requests per hour
		message: 'CircleCI API rate limit exceeded'
	},
	doppler: {
		windowMs: 60 * 60 * 1000, // 1 hour
		max: 1000, // Doppler allows 1000 requests per hour
		message: 'Doppler API rate limit exceeded'
	},
	sonarcloud: {
		windowMs: 60 * 60 * 1000, // 1 hour
		max: 200, // SonarCloud allows 200 requests per hour
		message: 'SonarCloud API rate limit exceeded'
	}
};

/**
 * Get rate limit configuration for service
 * @param {string} serviceName - Service name
 * @returns {Object} Rate limit configuration
 */
export function getRateLimitConfig(serviceName) {
	return rateLimitConfig[serviceName] || rateLimitConfig.default;
}
