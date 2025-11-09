/**
 * Service Utilities
 *
 * Provides common functionality for initializing and validating external service clients
 *
 * @fileoverview Shared utilities for service management
 */

import { GitHubAPIService } from './github-api.js';
import { CircleCIAPIService } from './circleci-api.js';
import { DopplerAPIService } from './doppler-api.js';
import { SonarCloudAPIService } from './sonarcloud-api.js';

/**
 * Service class mappings
 */
const SERVICE_CLASSES = {
	github: GitHubAPIService,
	circleci: CircleCIAPIService,
	doppler: DopplerAPIService,
	sonarcloud: SonarCloudAPIService
};

/**
 * Initializes service clients from authentication tokens
 * @param {Object} authTokens - Authentication tokens for external services
 * @param {string[]} [allowedServices] - Optional list of allowed service names
 * @returns {Object} Initialized service clients
 */
export function initializeServices(authTokens, allowedServices = null) {
	const services = {};
	const serviceList = allowedServices || Object.keys(SERVICE_CLASSES);

	for (const serviceName of serviceList) {
		const ServiceClass = SERVICE_CLASSES[serviceName];
		const token = authTokens[serviceName];

		if (token && ServiceClass) {
			services[serviceName] = new ServiceClass(token);
		}
	}

	return services;
}

/**
 * Validates all authentication tokens
 * @param {Object} authTokens - Authentication tokens
 * @param {Object} services - Initialized service clients
 * @returns {Promise<Object>} Validation results
 */
export async function validateAllTokens(authTokens, services) {
	const results = {};

	for (const [service, token] of Object.entries(authTokens)) {
		if (token && services[service]) {
			try {
				results[service] = await services[service].validateToken();
			} catch (error) {
				// eslint-disable-next-line sonarjs/no-useless-catch
				// Intentionally catch and ignore errors to set default value for token validation
				console.log(`⚠️ Token validation failed for ${service}: ${error.message}`);
				results[service] = false;
			}
		} else {
			results[service] = false;
		}
	}

	return results;
}
