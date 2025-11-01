import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

const fixedDate = new Date('2024-01-01T00:00:00.000Z');

describe('genproj error utilities', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(fixedDate);
		vi.spyOn(globalThis.console, 'error').mockImplementation(() => {});
		vi.spyOn(globalThis.console, 'warn').mockImplementation(() => {});
		if (globalThis.crypto?.randomUUID) {
			vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('test-request-id');
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('error classes', () => {
		it('preserves message, code, and status', () => {
			const err = new GenprojError('boom', 'GENPROJ', 418);
			expect(err.message).toBe('boom');
			expect(err.code).toBe('GENPROJ');
			expect(err.statusCode).toBe(418);
		});

		it('sets subclass-specific fields', () => {
			const validation = new ValidationError('missing field', 'field');
			expect(validation.statusCode).toBe(400);
			expect(validation.field).toBe('field');

			const auth = new AuthenticationError('unauthenticated', 'github');
			expect(auth.statusCode).toBe(401);
			expect(auth.service).toBe('github');

			const authorization = new AuthorizationError('denied', ['github']);
			expect(authorization.statusCode).toBe(403);
			expect(authorization.requiredAuth).toEqual(['github']);

			const notFound = new NotFoundError('not here', 'resource');
			expect(notFound.statusCode).toBe(404);
			expect(notFound.resource).toBe('resource');

			const external = new ExternalServiceError('broken', 'service', new Error('boom'));
			expect(external.statusCode).toBe(502);
			expect(external.service).toBe('service');

			const rateLimited = new RateLimitError('slow down', 'github', 120);
			expect(rateLimited.statusCode).toBe(429);
			expect(rateLimited.retryAfter).toBe(120);
		});
	});

	describe('handleGenprojError', () => {
		it('handles known GenprojError instances', () => {
			const error = new ValidationError('Invalid data', 'field');
			const response = handleGenprojError(error, { requestId: 'abc' });
			expect(response.status).toBe(400);
			expect(response.body).toMatchObject({
				error: 'VALIDATION_ERROR',
				message: 'Invalid data',
				field: 'field',
				requestId: 'abc',
				timestamp: fixedDate.toISOString()
			});
		});

		it('handles non-genproj validation, auth, database, and external errors', () => {
			const validation = handleGenprojError(new Error('validation failed'));
			expect(validation.status).toBe(400);
			expect(validation.body.error).toBe('VALIDATION_ERROR');

			const auth = handleGenprojError(new Error('User unauthorized'));
			expect(auth.status).toBe(401);
			expect(auth.body.error).toBe('AUTHENTICATION_ERROR');

			const database = handleGenprojError(new Error('database timeout'));
			expect(database.status).toBe(500);
			expect(database.body.error).toBe('DATABASE_ERROR');

			const external = handleGenprojError(new Error('API failure'));
			expect(external.status).toBe(502);
			expect(external.body.error).toBe('EXTERNAL_SERVICE_ERROR');
		});

		it('falls back to internal error response', () => {
			const response = handleGenprojError(new Error('mystery'));
			expect(response.status).toBe(500);
			expect(response.body.error).toBe('INTERNAL_ERROR');
		});
	});

	describe('withErrorHandling', () => {
		it('returns handler result when successful', async () => {
			const handler = withErrorHandling(async () => ({ status: 200 }));
			await expect(handler({ request: { method: 'GET' } })).resolves.toEqual({ status: 200 });
		});

		it('converts thrown errors to response payload', async () => {
			const handler = withErrorHandling(async () => {
				throw new ValidationError('bad request', 'field');
			});

			const event = {
				requestId: 'event-id',
				request: { method: 'POST' },
				url: new URL('https://example.com')
			};

			const response = await handler(event);
			expect(response.status).toBe(400);
			expect(response.body.requestId).toBe('event-id');
		});
	});

	describe('validateRequest', () => {
		const schema = {
			name: { required: true, type: 'string', minLength: 3, maxLength: 5 },
			email: { pattern: /^[^@]+@[^@]+$/ },
			status: { enum: ['active', 'pending'] }
		};

		it('throws on missing required value', () => {
			expect(() => validateRequest({}, schema)).toThrowError(ValidationError);
		});

		it('throws on invalid type, length, pattern, and enum', () => {
			expect(() =>
				validateRequest({ name: 123, email: 'bad', status: 'disabled' }, schema)
			).toThrowError(ValidationError);
		});

		it('passes with valid payload', () => {
			expect(() =>
				validateRequest({ name: 'alex', email: 'user@example.com', status: 'active' }, schema)
			).not.toThrow();
		});
	});

	describe('requireAuthentication', () => {
		it('throws when user missing', () => {
			expect(() => requireAuthentication({})).toThrowError(AuthenticationError);
		});

		it('throws when service auth missing', () => {
			const authState = { user: { id: '123' }, github: true };
			expect(() => requireAuthentication(authState, ['github', 'doppler'])).toThrowError(
				AuthorizationError
			);
		});

		it('passes when user and services are present', () => {
			expect(() =>
				requireAuthentication(
					{
						user: { id: '123' },
						github: true,
						doppler: true
					},
					['github', 'doppler']
				)
			).not.toThrow();
		});
	});

	describe('handleExternalServiceError', () => {
		const baseError = { message: 'boom', headers: new Map(), status: 400 };

		it('translates rate limit errors', () => {
			const error = { ...baseError, status: 429, headers: new Map([['Retry-After', 90]]) };
			expect(() => handleExternalServiceError(error, 'github')).toThrowError(RateLimitError);
		});

		it('translates auth, not found, server, and default errors', () => {
			expect(() => handleExternalServiceError({ ...baseError, status: 401 }, 'github')).toThrowError(
				AuthenticationError
			);

			expect(() => handleExternalServiceError({ ...baseError, status: 404 }, 'github')).toThrowError(
				NotFoundError
			);

			expect(() => handleExternalServiceError({ ...baseError, status: 503 }, 'github')).toThrowError(
				ExternalServiceError
			);

			expect(() => handleExternalServiceError(baseError, 'github')).toThrowError(
				ExternalServiceError
			);
		});
	});

	describe('getUserFriendlyMessage', () => {
		it('returns custom messages for known errors', () => {
			expect(getUserFriendlyMessage(new ValidationError('bad', 'field'))).toBe('bad');
			expect(getUserFriendlyMessage(new AuthenticationError('auth', 'github'))).toBe(
				'Please sign in to continue'
			);
			expect(
				getUserFriendlyMessage(new AuthorizationError('nope', ['GitHub', 'Doppler']))
			).toBe('Additional authentication required: GitHub, Doppler');
			expect(getUserFriendlyMessage(new NotFoundError('missing', 'resource'))).toBe(
				'The requested resource was not found'
			);
			expect(getUserFriendlyMessage(new ExternalServiceError('fail', 'service'))).toBe(
				'External service is temporarily unavailable. Please try again later.'
			);
			expect(getUserFriendlyMessage(new RateLimitError('slow', 'service', 10))).toBe(
				'Too many requests. Please wait a moment and try again.'
			);
		});

		it('returns default message otherwise', () => {
			expect(getUserFriendlyMessage(new Error('unknown'))).toBe(
				'Something went wrong. Please try again.'
			);
		});
	});

	describe('logError', () => {
		it('logs with context and includes metadata', () => {
			const error = new ValidationError('invalid', 'field');
			logError(error, { context: 'testing' });
			expect(console.error).toHaveBeenCalled();
			const [message, payload] = console.error.mock.calls.at(-1);
			expect(message).toContain('Genproj error logged:');
			expect(payload).toMatchObject({
				error: 'invalid',
				context: 'testing',
				code: 'VALIDATION_ERROR',
				statusCode: 400,
				timestamp: fixedDate.toISOString()
			});
		});
	});
});
