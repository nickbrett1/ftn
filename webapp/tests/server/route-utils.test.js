import { describe, it, expect, vi, beforeEach } from 'vitest';
import { json } from '@sveltejs/kit';
import { RouteUtils } from '../../src/lib/server/route-utils.js';

// Mock requireUser
vi.mock('../../src/lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

import { requireUser } from '../../src/lib/server/require-user.js';

describe('RouteUtils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('handleAuth', () => {
		it('should return user object when authenticated', async () => {
			const mockUser = { id: '123', email: 'test@example.com' };
			requireUser.mockResolvedValue(mockUser);

			const mockEvent = {
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			const result = await RouteUtils.handleAuth(mockEvent);

			expect(result).toBe(mockUser);
			expect(requireUser).toHaveBeenCalledWith(mockEvent);
		});

		it('should return error response when not authenticated', async () => {
			const errorResponse = new Response(JSON.stringify({ error: 'Not authenticated' }), {
				status: 401
			});
			requireUser.mockResolvedValue(errorResponse);

			const mockEvent = {
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			const result = await RouteUtils.handleAuth(mockEvent);

			expect(result).toBe(errorResponse);
			expect(requireUser).toHaveBeenCalledWith(mockEvent);
		});
	});

	describe('validateParams', () => {
		it('should return success when all required params are present', () => {
			const params = { id: '123', name: 'test' };
			const requiredFields = ['id', 'name'];

			const result = RouteUtils.validateParams(params, requiredFields);

			expect(result.success).toBe(true);
			expect(result.params).toBe(params);
		});

		it('should return error when required param is missing', () => {
			const params = { id: '123' };
			const requiredFields = ['id', 'name'];

			const result = RouteUtils.validateParams(params, requiredFields);

			expect(result.error).toBe('Missing required parameter: name');
			expect(result.status).toBe(400);
			expect(result.success).toBeUndefined();
		});

		it('should return error when param is empty string', () => {
			const params = { id: '123', name: '' };
			const requiredFields = ['id', 'name'];

			const result = RouteUtils.validateParams(params, requiredFields);

			expect(result.error).toBe('Missing required parameter: name');
			expect(result.status).toBe(400);
		});

		it('should use custom validator when provided', () => {
			const params = { id: '123', age: '25' };
			const requiredFields = ['id', 'age'];
			const validators = {
				age: (value) => {
					const age = Number.parseInt(value, 10);
					if (Number.isNaN(age) || age < 0) {
						return 'Age must be a positive number';
					}
					return true;
				}
			};

			const result = RouteUtils.validateParams(params, requiredFields, { validators });

			expect(result.success).toBe(true);
		});

		it('should return error from custom validator when validation fails', () => {
			const params = { id: '123', age: '-5' };
			const requiredFields = ['id', 'age'];
			const validators = {
				age: (value) => {
					const age = Number.parseInt(value, 10);
					if (Number.isNaN(age) || age < 0) {
						return 'Age must be a positive number';
					}
					return true;
				}
			};

			const result = RouteUtils.validateParams(params, requiredFields, { validators });

			expect(result.error).toBe('Age must be a positive number');
			expect(result.status).toBe(400);
		});

		it('should return default error when custom validator returns false', () => {
			const params = { id: '123', age: '25' };
			const requiredFields = ['id', 'age'];
			const validators = {
				age: () => false
			};

			const result = RouteUtils.validateParams(params, requiredFields, { validators });

			expect(result.error).toBe('Invalid parameter: age');
			expect(result.status).toBe(400);
		});
	});

	describe('parseInteger', () => {
		it('should parse valid integer', () => {
			const result = RouteUtils.parseInteger('123', 'id');
			expect(result).toBe(123);
		});

		it('should return error when value is missing', () => {
			const result = RouteUtils.parseInteger('', 'id');
			expect(result).toBe('Missing required parameter: id');
		});

		it('should return error when value is not a number', () => {
			const result = RouteUtils.parseInteger('abc', 'id');
			expect(result).toBe('Invalid id: must be a number');
		});

		it('should validate minimum value', () => {
			const result = RouteUtils.parseInteger('5', 'age', { min: 18 });
			expect(result).toBe('Invalid age: must be at least 18');
		});

		it('should validate maximum value', () => {
			const result = RouteUtils.parseInteger('101', 'age', { max: 100 });
			expect(result).toBe('Invalid age: must be at most 100');
		});

		it('should accept value within min and max range', () => {
			const result = RouteUtils.parseInteger('25', 'age', { min: 18, max: 100 });
			expect(result).toBe(25);
		});

		it('should accept value at minimum boundary', () => {
			const result = RouteUtils.parseInteger('18', 'age', { min: 18, max: 100 });
			expect(result).toBe(18);
		});

		it('should accept value at maximum boundary', () => {
			const result = RouteUtils.parseInteger('100', 'age', { min: 18, max: 100 });
			expect(result).toBe(100);
		});
	});

	describe('handleError', () => {
		it('should return error response with error message', () => {
			const error = new Error('Something went wrong');
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = RouteUtils.handleError(error, 'Test Context');

			expect(result).toBeInstanceOf(Response);
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it('should use error status if available', async () => {
			const error = { message: 'Not found', status: 404 };
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = RouteUtils.handleError(error, 'Test Context');
			const jsonResult = await result.json();

			expect(jsonResult.error).toBe('Not found');
			expect(result.status).toBe(404);
		});

		it('should use default status when error has no status', async () => {
			const error = new Error('Internal error');
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = RouteUtils.handleError(error, 'Test Context');
			const jsonResult = await result.json();

			expect(jsonResult.error).toBe('Internal error');
			expect(result.status).toBe(500);
		});

		it('should use custom default status', async () => {
			const error = new Error('Custom error');
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = RouteUtils.handleError(error, 'Test Context', { defaultStatus: 400 });
			const jsonResult = await result.json();

			expect(result.status).toBe(400);
		});

		it('should not log error when logError is false', () => {
			const error = new Error('Silent error');
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			RouteUtils.handleError(error, 'Test Context', { logError: false });

			expect(consoleSpy).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe('createSuccessResponse', () => {
		it('should create success response with data', async () => {
			const data = { id: '123', name: 'test' };
			const result = RouteUtils.createSuccessResponse(data, 'Operation successful');

			const jsonResult = await result.json();

			expect(jsonResult.success).toBe(true);
			expect(jsonResult.data).toEqual(data);
			expect(jsonResult.message).toBe('Operation successful');
			expect(result.status).toBe(200);
		});

		it('should use default message when not provided', async () => {
			const data = { id: '123' };
			const result = RouteUtils.createSuccessResponse(data);

			const jsonResult = await result.json();

			expect(jsonResult.message).toBe('Success');
		});

		it('should use custom status', async () => {
			const data = { id: '123' };
			const result = RouteUtils.createSuccessResponse(data, 'Created', { status: 201 });

			expect(result.status).toBe(201);
		});
	});

	describe('createErrorResponse', () => {
		it('should create error response with message', async () => {
			const result = RouteUtils.createErrorResponse('Something went wrong');

			const jsonResult = await result.json();

			expect(jsonResult.success).toBe(false);
			expect(jsonResult.error).toBe('Something went wrong');
			expect(result.status).toBe(400);
		});

		it('should include data when provided', async () => {
			const additionalData = { field: 'value' };
			const result = RouteUtils.createErrorResponse('Error occurred', { data: additionalData });

			const jsonResult = await result.json();

			expect(jsonResult.data).toEqual(additionalData);
		});

		it('should use custom status', async () => {
			const result = RouteUtils.createErrorResponse('Not found', { status: 404 });

			expect(result.status).toBe(404);
		});
	});

	describe('validateBody', () => {
		it('should return success when all required fields are present', () => {
			const body = { name: 'test', email: 'test@example.com' };
			const requiredFields = ['name', 'email'];

			const result = RouteUtils.validateBody(body, requiredFields);

			expect(result.success).toBe(true);
			expect(result.body).toBe(body);
		});

		it('should return error when body is not an object', () => {
			const body = 'not an object';
			const requiredFields = ['name'];

			const result = RouteUtils.validateBody(body, requiredFields);

			expect(result.error).toBe('Invalid request body');
			expect(result.status).toBe(400);
		});

		it('should return error when body is null', () => {
			const body = null;
			const requiredFields = ['name'];

			const result = RouteUtils.validateBody(body, requiredFields);

			expect(result.error).toBe('Invalid request body');
			expect(result.status).toBe(400);
		});

		it('should return error when required field is missing', () => {
			const body = { name: 'test' };
			const requiredFields = ['name', 'email'];

			const result = RouteUtils.validateBody(body, requiredFields);

			expect(result.error).toBe('Missing required field: email');
			expect(result.status).toBe(400);
		});

		it('should return error when required field is empty string', () => {
			const body = { name: 'test', email: '' };
			const requiredFields = ['name', 'email'];

			const result = RouteUtils.validateBody(body, requiredFields);

			expect(result.error).toBe('Missing required field: email');
			expect(result.status).toBe(400);
		});

		it('should use custom validator when provided', () => {
			const body = { email: 'test@example.com' };
			const requiredFields = ['email'];
			const validators = {
				email: (value) => {
					if (!value.includes('@')) {
						return 'Invalid email format';
					}
					return true;
				}
			};

			const result = RouteUtils.validateBody(body, requiredFields, { validators });

			expect(result.success).toBe(true);
		});

		it('should return error from custom validator when validation fails', () => {
			const body = { email: 'invalid-email' };
			const requiredFields = ['email'];
			const validators = {
				email: (value) => {
					if (!value.includes('@')) {
						return 'Invalid email format';
					}
					return true;
				}
			};

			const result = RouteUtils.validateBody(body, requiredFields, { validators });

			expect(result.error).toBe('Invalid email format');
			expect(result.status).toBe(400);
		});
	});

	describe('parseRequestBody', () => {
		it('should parse valid JSON body', async () => {
			const body = { name: 'test', email: 'test@example.com' };
			const request = new Request('http://example.com', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			const result = await RouteUtils.parseRequestBody(request);

			expect(result.success).toBe(true);
			expect(result.body).toEqual(body);
		});

		it('should return error when Content-Type is not application/json', async () => {
			const request = new Request('http://example.com', {
				method: 'POST',
				headers: { 'Content-Type': 'text/plain' },
				body: 'test'
			});

			const result = await RouteUtils.parseRequestBody(request);

			expect(result.error).toBe('Content-Type must be application/json');
			expect(result.status).toBe(400);
		});

		it('should return error when Content-Type is missing', async () => {
			const request = new Request('http://example.com', {
				method: 'POST',
				body: 'test'
			});

			const result = await RouteUtils.parseRequestBody(request);

			expect(result.error).toBe('Content-Type must be application/json');
			expect(result.status).toBe(400);
		});

		it('should return error when JSON is invalid', async () => {
			const request = new Request('http://example.com', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{ invalid json }'
			});

			const result = await RouteUtils.parseRequestBody(request);

			expect(result.error).toBe('Invalid JSON in request body');
			expect(result.status).toBe(400);
		});
	});

	describe('createRouteHandler', () => {
		it('should call handler when auth and validation pass', async () => {
			const mockUser = { id: '123' };
			requireUser.mockResolvedValue(mockUser);

			const handler = vi.fn().mockResolvedValue(json({ success: true }));

			const wrappedHandler = RouteUtils.createRouteHandler(handler, {
				requiredParams: ['id'],
				requireAuth: true
			});

			const mockEvent = {
				params: { id: '123' },
				request: { method: 'GET' },
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			await wrappedHandler(mockEvent);

			expect(handler).toHaveBeenCalled();
		});

		it('should return auth error when user is not authenticated', async () => {
			const errorResponse = new Response(JSON.stringify({ error: 'Not authenticated' }), {
				status: 401
			});
			requireUser.mockResolvedValue(errorResponse);

			const handler = vi.fn();

			const wrappedHandler = RouteUtils.createRouteHandler(handler, {
				requireAuth: true
			});

			const mockEvent = {
				params: {},
				request: { method: 'GET' },
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			const result = await wrappedHandler(mockEvent);

			expect(result).toBe(errorResponse);
			expect(handler).not.toHaveBeenCalled();
		});

		it('should validate required params before calling handler', async () => {
			const mockUser = { id: '123' };
			requireUser.mockResolvedValue(mockUser);

			const handler = vi.fn();

			const wrappedHandler = RouteUtils.createRouteHandler(handler, {
				requiredParams: ['id', 'name'],
				requireAuth: true
			});

			const mockEvent = {
				params: { id: '123' },
				request: { method: 'GET' },
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			const result = await wrappedHandler(mockEvent);
			const jsonResult = await result.json();

			expect(jsonResult.error).toBe('Missing required parameter: name');
			expect(handler).not.toHaveBeenCalled();
		});

		it('should parse and validate body for POST requests', async () => {
			const mockUser = { id: '123' };
			requireUser.mockResolvedValue(mockUser);

			const handler = vi.fn().mockResolvedValue(json({ success: true }));

			const wrappedHandler = RouteUtils.createRouteHandler(handler, {
				requiredBody: ['name'],
				requireAuth: true
			});

			const body = { name: 'test' };
			const mockEvent = {
				params: {},
				request: new Request('http://example.com', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				}),
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			await wrappedHandler(mockEvent);

			expect(handler).toHaveBeenCalledWith(mockEvent, body);
		});

		it('should not parse body for GET requests', async () => {
			const mockUser = { id: '123' };
			requireUser.mockResolvedValue(mockUser);

			const handler = vi.fn().mockResolvedValue(json({ success: true }));

			const wrappedHandler = RouteUtils.createRouteHandler(handler, {
				requiredBody: ['name'],
				requireAuth: true
			});

			const mockEvent = {
				params: {},
				request: { method: 'GET' },
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			await wrappedHandler(mockEvent);

			// Handler is called without body parameter when requiredBody is empty
			expect(handler).toHaveBeenCalled();
			const callArgs = handler.mock.calls[0];
			expect(callArgs[0]).toBe(mockEvent);
		});

		it('should handle errors thrown by handler', async () => {
			const mockUser = { id: '123' };
			requireUser.mockResolvedValue(mockUser);

			const handler = vi.fn().mockRejectedValue(new Error('Handler error'));

			const wrappedHandler = RouteUtils.createRouteHandler(handler, {
				requireAuth: true
			});

			const mockEvent = {
				params: {},
				request: { method: 'GET' },
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			const result = await wrappedHandler(mockEvent);
			const jsonResult = await result.json();

			expect(jsonResult.error).toBe('Handler error');
			expect(result.status).toBe(500);
		});

		it('should skip auth when requireAuth is false', async () => {
			const handler = vi.fn().mockResolvedValue(json({ success: true }));

			const wrappedHandler = RouteUtils.createRouteHandler(handler, {
				requireAuth: false
			});

			const mockEvent = {
				params: {},
				request: { method: 'GET' },
				cookies: { get: vi.fn() },
				platform: { env: { KV: { get: vi.fn() } } }
			};

			await wrappedHandler(mockEvent);

			expect(handler).toHaveBeenCalled();
			expect(requireUser).not.toHaveBeenCalled();
		});
	});
});

