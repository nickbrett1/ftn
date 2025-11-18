import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../src/routes/logout/+server.js';

// Mock fetch globally
globalThis.fetch = vi.fn();

// Mock the redirect function
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

// Mock the cookie module
vi.mock('cookie', () => ({
	serialize: vi.fn(() => 'auth=; Path=/; HttpOnly; Secure; SameSite=Strict')
}));

describe('Logout Server Route', () => {
	let mockRequest;
	let mockPlatform;

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset fetch mock
		globalThis.fetch.mockReset();

		// Mock platform environment
		mockPlatform = {
			env: {
				KV: {
					get: vi.fn(),
					delete: vi.fn()
				}
			}
		};
	});

	describe('GET handler', () => {
		it('should redirect to /notauthorised when no cookies are present', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => null)
				}
			};

			const { redirect } = await import('@sveltejs/kit');

			await expect(GET({ request: mockRequest, platform: mockPlatform })).rejects.toThrow();
			expect(redirect).toHaveBeenCalledWith(307, '/notauthorised');
		});

		it('should redirect to /notauthorised when auth cookie is not present', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => 'otherCookie=value; anotherCookie=value2')
				}
			};

			const { redirect } = await import('@sveltejs/kit');

			await expect(GET({ request: mockRequest, platform: mockPlatform })).rejects.toThrow();
			expect(redirect).toHaveBeenCalledWith(307, '/notauthorised');
		});

		it('should return redirect response when no token is found in KV', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => 'auth=testAuthKey; otherCookie=value')
				}
			};

			mockPlatform.env.KV.get.mockResolvedValue(null);

			const response = await GET({ request: mockRequest, platform: mockPlatform });

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(307);
			expect(response.headers.get('set-cookie')).toContain('auth=;');
			expect(response.headers.get('location')).toBe('/');
			expect(mockPlatform.env.KV.get).toHaveBeenCalledWith('testAuthKey');
		});

		it('should revoke Google token and delete from KV when token exists', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => 'auth=testAuthKey; otherCookie=value')
				}
			};

			const mockToken = 'google_oauth_token_123';
			mockPlatform.env.KV.get.mockResolvedValue(mockToken);
			mockPlatform.env.KV.delete.mockResolvedValue();

			// Mock successful Google token revocation
			globalThis.fetch.mockResolvedValue({
				ok: true,
				statusText: 'OK'
			});

			const response = await GET({ request: mockRequest, platform: mockPlatform });

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(307);
			expect(response.headers.get('set-cookie')).toContain('auth=;');
			expect(response.headers.get('location')).toBe('/');

			// Verify Google token revocation was called
			expect(globalThis.fetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/revoke', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: expect.any(URLSearchParams)
			});

			// Verify the token was passed correctly
			const callArguments = globalThis.fetch.mock.calls[0];
			const body = callArguments[1].body;
			expect(body.get('token')).toBe(mockToken);

			// Verify KV operations
			expect(mockPlatform.env.KV.get).toHaveBeenCalledWith('testAuthKey');
			expect(mockPlatform.env.KV.delete).toHaveBeenCalledWith('testAuthKey');
		});

		it('should handle Google token revocation failure gracefully', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => 'auth=testAuthKey; otherCookie=value')
				}
			};

			const mockToken = 'google_oauth_token_123';
			mockPlatform.env.KV.get.mockResolvedValue(mockToken);
			mockPlatform.env.KV.delete.mockResolvedValue();

			// Mock failed Google token revocation
			globalThis.fetch.mockResolvedValue({
				ok: false,
				statusText: 'Bad Request'
			});

			// Mock console.error to capture the error message
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const response = await GET({ request: mockRequest, platform: mockPlatform });

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(307);
			expect(response.headers.get('set-cookie')).toContain('auth=;');
			expect(response.headers.get('location')).toBe('/');

			// Verify error was logged
			expect(consoleSpy).toHaveBeenCalledWith('Failed to revoke Google token:', 'Bad Request');

			// Verify KV operations still happened
			expect(mockPlatform.env.KV.get).toHaveBeenCalledWith('testAuthKey');
			expect(mockPlatform.env.KV.delete).toHaveBeenCalledWith('testAuthKey');

			consoleSpy.mockRestore();
		});

		it('should handle network errors during Google token revocation', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => 'auth=testAuthKey; otherCookie=value')
				}
			};

			const mockToken = 'google_oauth_token_123';
			mockPlatform.env.KV.get.mockResolvedValue(mockToken);
			mockPlatform.env.KV.delete.mockResolvedValue();

			// Mock network error
			globalThis.fetch.mockRejectedValue(new Error('Network error'));

			// The current implementation doesn't handle network errors gracefully
			// so we expect it to throw an error
			await expect(GET({ request: mockRequest, platform: mockPlatform })).rejects.toThrow(
				'Network error'
			);
		});

		it('should handle auth cookie with special characters', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => 'auth=test%40auth%3Dkey; otherCookie=value')
				}
			};

			mockPlatform.env.KV.get.mockResolvedValue(null);

			const response = await GET({ request: mockRequest, platform: mockPlatform });

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(307);
			expect(response.headers.get('set-cookie')).toContain('auth=;');
			expect(response.headers.get('location')).toBe('/');
			expect(mockPlatform.env.KV.get).toHaveBeenCalledWith('test%40auth%3Dkey');
		});

		it('should handle multiple auth cookies by using the first one', async () => {
			mockRequest = {
				headers: {
					get: vi.fn(() => 'auth=firstKey; auth=secondKey; otherCookie=value')
				}
			};

			mockPlatform.env.KV.get.mockResolvedValue(null);

			const response = await GET({ request: mockRequest, platform: mockPlatform });

			expect(response).toBeInstanceOf(Response);
			expect(response.status).toBe(307);
			expect(response.headers.get('set-cookie')).toContain('auth=;');
			expect(response.headers.get('location')).toBe('/');
			expect(mockPlatform.env.KV.get).toHaveBeenCalledWith('firstKey');
		});
	});

	describe('revokeGoogleToken function', () => {
		it('should make correct request to Google OAuth revoke endpoint', async () => {
			const testToken = 'test_google_token';

			// Mock successful response
			globalThis.fetch.mockResolvedValue({
				ok: true,
				statusText: 'OK'
			});

			// Test through the GET handler since revokeGoogleToken is not exported
			mockRequest = {
				headers: {
					get: vi.fn(() => 'auth=testAuthKey')
				}
			};

			mockPlatform.env.KV.get.mockResolvedValue(testToken);
			mockPlatform.env.KV.delete.mockResolvedValue();

			await GET({ request: mockRequest, platform: mockPlatform });

			expect(globalThis.fetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/revoke', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: expect.any(URLSearchParams)
			});

			const callArguments = globalThis.fetch.mock.calls[0];
			const body = callArguments[1].body;
			expect(body.get('token')).toBe(testToken);
		});
	});
});
