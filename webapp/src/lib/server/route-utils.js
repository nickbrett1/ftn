import { json } from '@sveltejs/kit';
import { requireUser } from './require-user.js';

/**
 * Shared route utilities for server endpoints
 * Eliminates duplication in authentication, validation, and error handling
 */
export const RouteUtils = {
	/**
	 * Handle authentication for a route
	 * @param {Object} event - SvelteKit event object
	 * @returns {Promise<Object|Response>} - User object or error response
	 */
	async handleAuth(event) {
		return requireUser(event);
	},

	/**
	 * Validate route parameters
	 * @param {Object} params - Route parameters
	 * @param {Array} requiredFields - Array of required field names
	 * @param {Object} options - Validation options
	 * @param {Function} options.validators - Custom validators for each field
	 * @returns {Object} - Validated parameters or error response
	 */
	validateParams(parameters, requiredFields = [], options = {}) {
		const { validators = {} } = options;

		for (const field of requiredFields) {
			if (!parameters[field]) {
				return {
					error: `Missing required parameter: ${field}`,
					status: 400
				};
			}

			// Apply custom validator if provided
			if (validators[field]) {
				const validationResult = validators[field](parameters[field]);
				if (validationResult !== true) {
					return {
						error: validationResult || `Invalid parameter: ${field}`,
						status: 400
					};
				}
			}
		}

		return { success: true, params: parameters };
	},

	/**
	 * Parse and validate integer parameter
	 * @param {string} value - Parameter value
	 * @param {string} paramName - Parameter name for error messages
	 * @param {Object} options - Validation options
	 * @param {number} [options.min] - Minimum value
	 * @param {number} [options.max] - Maximum value
	 * @returns {number|string} - Parsed integer or error message
	 */
	parseInteger(value, parameterName, options = {}) {
		const { min, max } = options;

		if (!value) {
			return `Missing required parameter: ${parameterName}`;
		}

		const parsed = Number.parseInt(value, 10);
		if (Number.isNaN(parsed)) {
			return `Invalid ${parameterName}: must be a number`;
		}

		if (min !== undefined && parsed < min) {
			return `Invalid ${parameterName}: must be at least ${min}`;
		}

		if (max !== undefined && parsed > max) {
			return `Invalid ${parameterName}: must be at most ${max}`;
		}

		return parsed;
	},

	/**
	 * Handle errors in route handlers
	 * @param {Error} error - Error object
	 * @param {string} context - Context for error logging
	 * @param {Object} options - Error handling options
	 * @param {boolean} options.logError - Whether to log the error (default: true)
	 * @param {number} options.defaultStatus - Default HTTP status code (default: 500)
	 * @returns {Response} - Error response
	 */
	handleError(error, context = 'Unknown', options = {}) {
		const { logError = true, defaultStatus = 500 } = options;

		if (logError) {
			console.error(`❌ Error in ${context}:`, error);
		}

		const status = error.status || defaultStatus;
		const message = error.message || 'Internal server error';

		return json({ error: message }, { status });
	},

	/**
	 * Create a success response
	 * @param {Object} data - Response data
	 * @param {string} message - Success message
	 * @param {Object} options - Response options
	 * @param {number} options.status - HTTP status code (default: 200)
	 * @returns {Response} - Success response
	 */
	createSuccessResponse(data, message = 'Success', options = {}) {
		const { status = 200 } = options;

		return json(
			{
				success: true,
				data,
				message
			},
			{ status }
		);
	},

	/**
	 * Create an error response
	 * @param {string} message - Error message
	 * @param {Object} options - Response options
	 * @param {number} options.status - HTTP status code (default: 400)
	 * @param {Object} options.data - Additional error data
	 * @returns {Response} - Error response
	 */
	createErrorResponse(message, options = {}) {
		const { status = 400, data = null } = options;

		const response = {
			success: false,
			error: message
		};

		if (data) {
			response.data = data;
		}

		return json(response, { status });
	},

	/**
	 * Validate request body
	 * @param {Object} body - Request body
	 * @param {Array} requiredFields - Array of required field names
	 * @param {Object} options - Validation options
	 * @param {Function} options.validators - Custom validators for each field
	 * @returns {Object} - Validation result
	 */
	validateBody(body, requiredFields = [], options = {}) {
		const { validators = {} } = options;

		if (!body || typeof body !== 'object') {
			return {
				error: 'Invalid request body',
				status: 400
			};
		}

		for (const field of requiredFields) {
			if (!body[field]) {
				return {
					error: `Missing required field: ${field}`,
					status: 400
				};
			}

			// Apply custom validator if provided
			if (validators[field]) {
				const validationResult = validators[field](body[field]);
				if (validationResult !== true) {
					return {
						error: validationResult || `Invalid field: ${field}`,
						status: 400
					};
				}
			}
		}

		return { success: true, body };
	},

	/**
	 * Parse JSON request body with error handling
	 * @param {Request} request - Request object
	 * @param {Object} options - Parsing options
	 * @param {number} options.maxSize - Maximum body size in bytes (default: 1MB)
	 * @returns {Promise<Object>} - Parsed body or error
	 */
	async parseRequestBody(request, options = {}) {
		// const { maxSize = 1024 * 1024 } = options; // 1MB default - currently unused

		try {
			const contentType = request.headers.get('content-type');
			if (!contentType?.includes('application/json')) {
				return {
					error: 'Content-Type must be application/json',
					status: 400
				};
			}

			const body = await request.json();
			return { success: true, body };
		} catch {
			return {
				error: 'Invalid JSON in request body',
				status: 400
			};
		}
	},

	/**
	 * Create a standardized route handler wrapper
	 * @param {Function} handler - Route handler function
	 * @param {Object} options - Handler options
	 * @param {Array} options.requiredParams - Required route parameters
	 * @param {Array} options.requiredBody - Required body fields
	 * @param {boolean} options.requireAuth - Whether authentication is required (default: true)
	 * @returns {Function} - Wrapped route handler
	 */
	createRouteHandler(handler, options = {}) {
		const {
			requiredParams: requiredParameters = [],
			requiredBody = [],
			requireAuth = true
		} = options;

		return async (event) => {
			try {
				// Handle authentication
				if (requireAuth) {
					const authResult = await this.handleAuth(event);
					if (authResult instanceof Response) {
						return authResult;
					}
				}

				// Validate parameters first
				if (requiredParameters.length > 0) {
					const parameterValidation = this.validateParams(
						event.params,
						requiredParameters,
						options
					);
					if (!parameterValidation.success) {
						return this.createErrorResponse(parameterValidation.error, {
							status: parameterValidation.status
						});
					}
				}

				// Only parse and validate body if parameters are valid
				let parsedBody = null;
				if (requiredBody.length > 0 && ['POST', 'PUT', 'PATCH'].includes(event.request.method)) {
					const bodyResult = await this.parseRequestBody(event.request);
					if (!bodyResult.success) {
						return this.createErrorResponse(bodyResult.error, { status: bodyResult.status });
					}

					const bodyValidation = this.validateBody(bodyResult.body, requiredBody);
					if (!bodyValidation.success) {
						return this.createErrorResponse(bodyValidation.error, {
							status: bodyValidation.status
						});
					}

					parsedBody = bodyResult.body;
				}

				// Call the actual handler with parsed body (if any)
				return await (requiredBody.length > 0 ? handler(event, parsedBody) : handler(event));
			} catch (error) {
				return this.handleError(error, handler.name);
			}
		};
	}
};
