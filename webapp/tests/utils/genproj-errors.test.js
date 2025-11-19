import { describe, it, expect, vi } from 'vitest';
import {
	GenprojError,
	ValidationError,
	AuthenticationError,
	AuthorizationError,
	NotFoundError,
	ExternalServiceError,
	RateLimitError,
	handleGenprojError,
	withErrorHandling,
	validateRequest,
	requireAuthentication,
	handleExternalServiceError,
	getUserFriendlyMessage,
	logError
} from '$lib/utils/genproj-errors.js';

describe('Genproj Custom Errors', () => {
	it('should create a GenprojError with correct properties', () => {
		const error = new GenprojError('Test message', 'TEST_CODE', 501);
		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(GenprojError);
		expect(error.message).toBe('Test message');
		expect(error.code).toBe('TEST_CODE');
		expect(error.statusCode).toBe(501);
	});

	it('should create a ValidationError with correct properties', () => {
		const error = new ValidationError('Invalid field', 'username');
		expect(error).toBeInstanceOf(ValidationError);
		expect(error.statusCode).toBe(400);
		expect(error.field).toBe('username');
	});
});

describe('handleGenprojError', () => {
	it('should handle GenprojError instances correctly', () => {
		const error = new RateLimitError('Too fast', 'GitHub', 60);
		const result = handleGenprojError(error);
		expect(result.status).toBe(429);
		expect(result.body.error).toBe('RATE_LIMIT_ERROR');
		expect(result.body.service).toBe('GitHub');
		expect(result.body.retryAfter).toBe(60);
	});

	it('should handle generic errors with specific keywords', () => {
		const dbError = new Error('database query failed');
		const result = handleGenprojError(dbError);
		expect(result.status).toBe(500);
		expect(result.body.error).toBe('DATABASE_ERROR');
	});

	it('should return a generic internal error for unknown errors', () => {
		const unknownError = new Error('Something weird happened');
		const result = handleGenprojError(unknownError);
		expect(result.status).toBe(500);
		expect(result.body.error).toBe('INTERNAL_ERROR');
	});
});

describe('withErrorHandling', () => {
	it('should wrap a handler and return its result on success', async () => {
		const mockHandler = vi.fn().mockResolvedValue({ status: 200, body: 'Success' });
		const wrappedHandler = withErrorHandling(mockHandler);
		const result = await wrappedHandler({});
		expect(result.status).toBe(200);
		expect(result.body).toBe('Success');
	});

	it('should catch errors and return a formatted error response', async () => {
		const error = new ValidationError('Bad input');
		const mockHandler = vi.fn().mockRejectedValue(error);
		const wrappedHandler = withErrorHandling(mockHandler);
		const result = await wrappedHandler({ request: {} }); // Mock event
		expect(result.status).toBe(400);
		expect(result.body.error).toBe('VALIDATION_ERROR');
	});
});

describe('validateRequest', () => {
	const schema = {
		name: { required: true, type: 'string', minLength: 2 },
		age: { required: false, type: 'number' },
		role: { required: true, enum: ['admin', 'user'] }
	};

	it('should not throw for valid data', () => {
		const data = { name: 'Jules', role: 'admin' };
		expect(() => validateRequest(data, schema)).not.toThrow();
	});

	it('should throw ValidationError for missing required field', () => {
		const data = { role: 'user' };
		expect(() => validateRequest(data, schema)).toThrow(ValidationError);
		expect(() => validateRequest(data, schema)).toThrow('name is required');
	});

	it('should throw ValidationError for invalid type', () => {
		const data = { name: 123, role: 'user' };
		expect(() => validateRequest(data, schema)).toThrow('name must be a string');
	});

	it('should throw ValidationError for minLength violation', () => {
		const data = { name: 'A', role: 'user' };
		expect(() => validateRequest(data, schema)).toThrow('name must be at least 2 characters');
	});

	it('should throw ValidationError for enum violation', () => {
		const data = { name: 'Jules', role: 'guest' };
		expect(() => validateRequest(data, schema)).toThrow('role must be one of: admin, user');
	});
});

describe('requireAuthentication', () => {
	it('should not throw if user is authenticated and no services are required', () => {
		const authState = { user: { id: 1 } };
		expect(() => requireAuthentication(authState)).not.toThrow();
	});

	it('should throw AuthenticationError if user is not authenticated', () => {
		expect(() => requireAuthentication({})).toThrow(AuthenticationError);
	});

	it('should throw AuthorizationError if required services are missing', () => {
		const authState = { user: { id: 1 }, github: true };
		expect(() => requireAuthentication(authState, ['github', 'doppler'])).toThrow(
			AuthorizationError
		);
	});
});

describe('handleExternalServiceError', () => {
	it('should throw RateLimitError for 429 status', () => {
		const error = { status: 429, headers: new Map([['Retry-After', '120']]) };
		expect(() => handleExternalServiceError(error, 'GitHub')).toThrow(RateLimitError);
	});

	it('should throw AuthenticationError for 401/403 status', () => {
		const error = { status: 401 };
		expect(() => handleExternalServiceError(error, 'Doppler')).toThrow(AuthenticationError);
	});

	it('should throw NotFoundError for 404 status', () => {
		const error = { status: 404 };
		expect(() => handleExternalServiceError(error, 'CircleCI')).toThrow(NotFoundError);
	});

	it('should throw ExternalServiceError for 5xx status', () => {
		const error = { status: 503 };
		expect(() => handleExternalServiceError(error, 'SonarCloud')).toThrow(ExternalServiceError);
	});

	it('should throw a generic ExternalServiceError for other errors', () => {
		const error = new Error('Network issue');
		expect(() => handleExternalServiceError(error, 'GenericAPI')).toThrow(ExternalServiceError);
	});
});

describe('getUserFriendlyMessage', () => {
	it('should return the correct message for each error type', () => {
		expect(getUserFriendlyMessage(new ValidationError('Bad name', 'name'))).toBe('Bad name');
		expect(getUserFriendlyMessage(new AuthenticationError('Sign in'))).toBe(
			'Please sign in to continue'
		);
		expect(getUserFriendlyMessage(new RateLimitError('Slow down'))).toBe(
			'Too many requests. Please wait a moment and try again.'
		);
		expect(getUserFriendlyMessage(new Error('Generic'))).toBe(
			'Something went wrong. Please try again.'
		);
	});
});

describe('logError', () => {
	it('should log the error with correct context', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const error = new GenprojError('Test log', 'LOG_CODE', 500);
		const context = { requestId: '123' };
		logError(error, context);
		expect(consoleSpy).toHaveBeenCalled();
		const logData = consoleSpy.mock.calls[0][1];
		expect(logData.error).toBe('Test log');
		expect(logData.code).toBe('LOG_CODE');
		expect(logData.requestId).toBe('123');
		consoleSpy.mockRestore();
	});
});
