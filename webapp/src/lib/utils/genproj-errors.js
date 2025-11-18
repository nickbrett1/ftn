/**
 * @fileoverview Error handling infrastructure using RouteUtils.handleError
 * @description Centralized error handling for genproj feature
 */

/**
 * Genproj-specific error types
 */
export class GenprojError extends Error {
	constructor(message, code, statusCode = 500) {
		super(message);
		this.name = 'GenprojError';
		this.code = code;
		this.statusCode = statusCode;
	}
}

export class ValidationError extends GenprojError {
	constructor(message, field) {
		super(message, 'VALIDATION_ERROR', 400);
		this.field = field;
	}
}

export class AuthenticationError extends GenprojError {
	constructor(message, service) {
		super(message, 'AUTHENTICATION_ERROR', 401);
		this.service = service;
	}
}

export class AuthorizationError extends GenprojError {
	constructor(message, requiredAuth) {
		super(message, 'AUTHORIZATION_ERROR', 403);
		this.requiredAuth = requiredAuth;
	}
}

export class NotFoundError extends GenprojError {
	constructor(message, resource) {
		super(message, 'NOT_FOUND_ERROR', 404);
		this.resource = resource;
	}
}

export class ExternalServiceError extends GenprojError {
	constructor(message, service, originalError) {
		super(message, 'EXTERNAL_SERVICE_ERROR', 502);
		this.service = service;
		this.originalError = originalError;
	}
}

export class RateLimitError extends GenprojError {
	constructor(message, service, retryAfter) {
		super(message, 'RATE_LIMIT_ERROR', 429);
		this.service = service;
		this.retryAfter = retryAfter;
	}
}

function createErrorResponseBody(code, message, details, context) {
	return {
		error: code,
		message,
		...(details && { details }),
		timestamp: new Date().toISOString(),
		requestId: context.requestId || crypto.randomUUID()
	};
}
/**
 * Error handler for genproj API routes
 * @param {Error} error - Error to handle
 * @param {Object} context - Request context
 * @returns {Object} Error response
 */
export function handleGenprojError(error, context = {}) {
	console.error('❌ Genproj error:', error);

	if (error instanceof GenprojError) {
		return {
			status: error.statusCode,
			body: {
				...createErrorResponseBody(error.code, error.message, null, context),
				...(error.field && { field: error.field }),
				...(error.service && { service: error.service }),
				...(error.resource && { resource: error.resource }),
				...(error.retryAfter && { retryAfter: error.retryAfter })
			}
		};
	}

	if (error.name === 'ValidationError') {
		return {
			status: 400,
			body: createErrorResponseBody('VALIDATION_ERROR', 'Invalid request data', error.message, context)
		};
	}

	if (error.message?.includes('validation')) {
		return {
			status: 400,
			body: createErrorResponseBody('VALIDATION_ERROR', 'Invalid request data', error.message, context)
		};
	}
	if (error.message?.includes('unauthorized') || error.message?.includes('authentication')) {
		return {
			status: 401,
			body: createErrorResponseBody('AUTHENTICATION_ERROR', 'Authentication required', null, context)
		};
	}
	if (error.message?.includes('database') || error.message?.includes('SQL')) {
		return {
			status: 500,
			body: createErrorResponseBody('DATABASE_ERROR', 'Database operation failed', null, context)
		};
	}
	if (error.message?.includes('fetch') || error.message?.includes('API')) {
		return {
			status: 502,
			body: createErrorResponseBody(
				'EXTERNAL_SERVICE_ERROR',
				'External service unavailable',
				null,
				context
			)
		};
	}
	return {
		status: 500,
		body: createErrorResponseBody('INTERNAL_ERROR', 'An unexpected error occurred', null, context)
	};
}

/**
 * Async error wrapper for API routes
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
	return async (event) => {
		try {
			return await handler(event);
		} catch (error) {
			return handleGenprojError(error, {
				requestId: event.requestId,
				url: event.url,
				method: event.request.method
			});
		}
	};
}

/**
 * Validate request and throw appropriate errors
 * @param {Object} data - Request data to validate
 * @param {Object} schema - Validation schema
 * @throws {ValidationError} If validation fails
 */
export function validateRequest(data, schema) {
	for (const [field, rules] of Object.entries(schema)) {
		const error = validateFieldRules(field, rules, data[field]);
		if (error) {
			throw error;
		}
	}
}

function validateFieldRules(field, rules, value) {
	const empty = value === undefined || value === null || value === '';

	if (rules.required && empty) {
		return new ValidationError(`${field} is required`, field);
	}

	if (empty) {
		return null;
	}

	if (rules.type && typeof value !== rules.type) {
		return new ValidationError(`${field} must be a ${rules.type}`, field);
	}

	if (typeof value === 'string') {
		const stringRuleError = validateStringRules(field, rules, value);
		if (stringRuleError) {
			return stringRuleError;
		}
	}

	if (Array.isArray(rules.enum) && !rules.enum.includes(value)) {
		return new ValidationError(`${field} must be one of: ${rules.enum.join(', ')}`, field);
	}

	return null;
}

function validateStringRules(field, rules, value) {
	if (rules.minLength !== undefined && value.length < rules.minLength) {
		return new ValidationError(`${field} must be at least ${rules.minLength} characters`, field);
	}

	if (rules.maxLength !== undefined && value.length > rules.maxLength) {
		return new ValidationError(
			`${field} must be no more than ${rules.maxLength} characters`,
			field
		);
	}

	if (rules.pattern instanceof RegExp && !rules.pattern.test(value)) {
		return new ValidationError(`${field} format is invalid`, field);
	}

	return null;
}

/**
 * Check authentication and throw appropriate errors
 * @param {Object} authState - Current authentication state
 * @param {string[]} requiredServices - Required authentication services
 * @throws {AuthenticationError|AuthorizationError} If authentication fails
 */
export function requireAuthentication(authState, requiredServices = []) {
	if (!authState?.user?.id) {
		throw new AuthenticationError('User authentication required');
	}

	const serviceChecks = {
		github: ['GitHub', () => Boolean(authState.github)],
		circleci: ['CircleCI', () => Boolean(authState.circleci)],
		doppler: ['Doppler', () => Boolean(authState.doppler)],
		sonarcloud: ['SonarCloud', () => Boolean(authState.sonarcloud)]
	};

	const missingServices = requiredServices
		.map((service) => serviceChecks[service])
		.filter((entry) => entry && !entry[1]())
		.map(([label]) => label);

	if (missingServices.length > 0) {
		throw new AuthorizationError(
			`Authentication required for: ${missingServices.join(', ')}`,
			missingServices
		);
	}
}

/**
 * Handle external service errors
 * @param {Error} error - Original error
 * @param {string} service - Service name
 * @throws {ExternalServiceError|RateLimitError} Appropriate genproj error
 */
export function handleExternalServiceError(error, service) {
	console.error(`❌ External service error (${service}):`, error);

	// Handle rate limiting
	if (error.status === 429 || error.message?.includes('rate limit')) {
		const retryAfter = error.headers?.get('Retry-After') || 60;
		throw new RateLimitError(`${service} API rate limit exceeded`, service, retryAfter);
	}

	// Handle authentication errors
	if (error.status === 401 || error.status === 403) {
		throw new AuthenticationError(`${service} authentication failed`, service);
	}

	// Handle not found errors
	if (error.status === 404) {
		throw new NotFoundError(`${service} resource not found`, service);
	}

	// Handle server errors
	if (error.status >= 500) {
		throw new ExternalServiceError(`${service} service unavailable`, service, error);
	}

	// Default external service error
	throw new ExternalServiceError(`${service} API error: ${error.message}`, service, error);
}

/**
 * Create user-friendly error messages
 * @param {Error} error - Error to convert
 * @returns {string} User-friendly message
 */
export function getUserFriendlyMessage(error) {
	if (error instanceof ValidationError) {
		return error.message;
	}

	if (error instanceof AuthenticationError) {
		return 'Please sign in to continue';
	}

	if (error instanceof AuthorizationError) {
		return `Additional authentication required: ${error.requiredAuth.join(', ')}`;
	}

	if (error instanceof NotFoundError) {
		return 'The requested resource was not found';
	}

	if (error instanceof ExternalServiceError) {
		return 'External service is temporarily unavailable. Please try again later.';
	}

	if (error instanceof RateLimitError) {
		return 'Too many requests. Please wait a moment and try again.';
	}

	return 'Something went wrong. Please try again.';
}

/**
 * Log error with context
 * @param {Error} error - Error to log
 * @param {Object} context - Additional context
 */
export function logError(error, context = {}) {
	const logData = {
		error: error.message,
		stack: error.stack,
		name: error.name,
		...context,
		timestamp: new Date().toISOString()
	};

	if (error instanceof GenprojError) {
		logData.code = error.code;
		logData.statusCode = error.statusCode;
	}

	console.error('❌ Genproj error logged:', logData);
}
