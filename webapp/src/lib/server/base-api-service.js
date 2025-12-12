/**
 * Base API Service
 *
 * Provides common functionality for all API service implementations
 * including request handling and token validation.
 *
 * @fileoverview Base class for API service implementations
 */

/**
 * Base API service class
 */
export class BaseAPIService {
	/**
	 * Creates a new base API service instance
	 * @param {string} token - API token
	 * @param {string} baseUrl - Base URL for API
	 * @param {Object} headers - Default headers
	 * @param {string} serviceName - Service name for logging
	 */
	constructor(token, baseUrl, headers, serviceName) {
		this.token = token;
		this.baseUrl = baseUrl;
		this.headers = headers;
		this.serviceName = serviceName;
	}

	/**
	 * Makes an authenticated request to the API
	 * @param {string} endpoint - API endpoint
	 * @param {Object} [options] - Request options
	 * @returns {Promise<Response>} API response
	 */
	async makeRequest(endpoint, options = {}) {
		const url = `${this.baseUrl}${endpoint}`;
		const requestOptions = {
			headers: this.headers,
			...options
		};

		console.log(`🔍 Making ${this.serviceName} API request to: ${endpoint}`);

		try {
			const response = await fetch(url, requestOptions);

			if (!response.ok) {
				let errorDetails = '';
				try {
					const text = await response.text();
					if (text) {
						errorDetails = ` - ${text}`;
					}
				} catch (e) {
					console.warn(`Could not read error response body: ${e.message}`);
				}

				console.error(
					`❌ ${this.serviceName} API error: ${response.status} ${response.statusText}${errorDetails}`
				);
				throw new Error(
					`${this.serviceName} API error: ${response.status} ${response.statusText}${errorDetails}`
				);
			}

			console.log(`✅ ${this.serviceName} API request successful: ${endpoint}`);
			return response;
		} catch (error) {
			// If we already enhanced the error, rethrow it
			if (error.message.startsWith(`${this.serviceName} API error:`)) {
				throw error;
			}
			console.error(`❌ ${this.serviceName} API request failed: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Validates the API token by making a test API call
	 * @param {Function} validateMethod - Method to call for validation
	 * @returns {Promise<boolean>} Whether the token is valid
	 */
	async validateToken(validateMethod) {
		try {
			await validateMethod.call(this);
			return true;
		} catch (error) {
			console.error(`❌ ${this.serviceName} token validation failed: ${error.message}`);
			return false;
		}
	}
}
