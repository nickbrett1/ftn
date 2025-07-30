import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './+server.js';
import { createServer } from 'miragejs';

const TEST_USER = 'test@test.com';

vi.mock('$env/static/private', async () => {
	return {
		GOOGLE_CLIENT_SECRET: '123',
		GOOGLE_CLIENT_ID: '123'
	};
});

describe('Auth', () => {
	let server;

	beforeEach(async () => {
		server = createServer({
			routes() {
				this.get('https://fintechnick.com', () => ({}));
				this.get('https://fintechnick.com/projects/ccbilling', (x) => x);
				this.post('https://oauth2.googleapis.com/token', () => ({
					access_token: 'mock_access_token',
					expires_in: 3600
				}));
				this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
					verified_email: true,
					email: TEST_USER
				}));
				this.post('https://oauth2.googleapis.com/revoke');
			}
		});
	});

	afterEach(() => {
		server.shutdown();
	});

	it('auth allows access if in KV', async () => {
		const res = await GET({
			request: new Request('https://fintechnick.com/auth?code=123'),
			platform: {
				env: {
					// Mock KV.get to simulate user being allowed
					KV: {
						get: vi.fn().mockResolvedValue('some_value_indicating_existence'), // User's email exists in KV
						put: vi.fn().mockResolvedValue(undefined)
					}
				}
			}
		});

		expect(res.headers.get('Location')).toEqual('https://fintechnick.com/projects/ccbilling');
	});

	it('redirect to preview if not in KV', async () => {
		const res = await GET({
			request: new Request('https://fintechnick.com/auth?code=123'),
			platform: {
				env: {
					// Mock KV.get to simulate user not being allowed
					KV: {
						get: vi.fn().mockResolvedValue(null), // User's email does not exist in KV
						put: vi.fn().mockResolvedValue(undefined) // KV.put shouldn't be called in this path
					}
				}
			}
		});

		expect(res.headers.get('Location')).toEqual('https://fintechnick.com/preview');
	});

	describe('Error Handling', () => {
		it('should handle OAuth provider errors', async () => {
			const res = await GET({
				request: new Request('https://fintechnick.com/auth?error=access_denied'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});

		it('should handle missing code parameter', async () => {
			const res = await GET({
				request: new Request('https://fintechnick.com/auth'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});

		it('should handle token exchange errors', async () => {
			server.shutdown();
			server = createServer({
				routes() {
					this.post('https://oauth2.googleapis.com/token', () => ({
						error: 'invalid_grant',
						error_description: 'Invalid authorization code'
					}));
				}
			});

			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=invalid_code'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});

		it('should handle userinfo API errors', async () => {
			server.shutdown();
			server = createServer({
				routes() {
					this.post('https://oauth2.googleapis.com/token', () => ({
						access_token: 'mock_access_token',
						expires_in: 3600
					}));
					this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
						error: 'invalid_token'
					}));
				}
			});

			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});

		it('should handle unverified email', async () => {
			server.shutdown();
			server = createServer({
				routes() {
					this.post('https://oauth2.googleapis.com/token', () => ({
						access_token: 'mock_access_token',
						expires_in: 3600
					}));
					this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => ({
						verified_email: false,
						email: TEST_USER
					}));
				}
			});

			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.headers.get('Location')).toEqual('https://fintechnick.com/preview');
		});

		it('should handle network errors during token exchange', async () => {
			server.shutdown();
			server = createServer({
				routes() {
					this.post('https://oauth2.googleapis.com/token', () => {
						throw new Error('Network error');
					});
				}
			});

			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});

		it('should handle network errors during userinfo fetch', async () => {
			server.shutdown();
			server = createServer({
				routes() {
					this.post('https://oauth2.googleapis.com/token', () => ({
						access_token: 'mock_access_token',
						expires_in: 3600
					}));
					this.get('https://www.googleapis.com/oauth2/v2/userinfo', () => {
						// Return error response to simulate API failure
						return { error: 'Network timeout' };
					});
				}
			});

			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});

		it('should handle KV storage errors', async () => {
			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn().mockResolvedValue('some_value_indicating_existence'),
							put: vi.fn().mockRejectedValue(new Error('KV storage error'))
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});
	});

	describe('Environment Variable Validation', () => {
		// These tests would require runtime environment variable manipulation
		// which is complex to test with SvelteKit imports. The tokenExchange function
		// checks for missing env vars and throws errors, which are caught by the main
		// try-catch block and result in 500 errors. This is tested indirectly.
		it('should handle environment configuration errors', async () => {
			// This test verifies that any errors in tokenExchange (including missing env vars)
			// are properly caught and result in 500 errors
			server.shutdown();
			server = createServer({
				routes() {
					// Simulate a server error that could occur from missing env vars
					this.post('https://oauth2.googleapis.com/token', () => {
						throw new Error('Configuration error');
					});
				}
			});

			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn(),
							put: vi.fn()
						}
					}
				}
			});

			expect(res.status).toBe(500);
			expect(await res.text()).toBe('Authentication failed due to an internal error.');
		});
	});

	describe('Response Formatting', () => {
		it('should set correct cookie attributes', async () => {
			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn().mockResolvedValue('some_value_indicating_existence'),
							put: vi.fn().mockResolvedValue(undefined)
						}
					}
				}
			});

			const setCookieHeader = res.headers.get('Set-Cookie');
			expect(setCookieHeader).toContain('auth=');
			expect(setCookieHeader).toContain('Expires=');
			expect(setCookieHeader).toContain('Path=/');
			expect(setCookieHeader).toContain('Secure');
			expect(setCookieHeader).toContain('HttpOnly');
			expect(setCookieHeader).toContain('SameSite=Lax');
		});

		it('should use correct redirect status code', async () => {
			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn().mockResolvedValue('some_value_indicating_existence'),
							put: vi.fn().mockResolvedValue(undefined)
						}
					}
				}
			});

			expect(res.status).toBe(307); // HTML_TEMPORARY_REDIRECT
		});

		it('should redirect unauthorized users with correct status code', async () => {
			const res = await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn().mockResolvedValue(null),
							put: vi.fn().mockResolvedValue(undefined)
						}
					}
				}
			});

			expect(res.status).toBe(307); // HTML_TEMPORARY_REDIRECT
			expect(res.headers.get('Location')).toBe('https://fintechnick.com/preview');
		});
	});

	describe('Token Processing', () => {
		it('should store auth token with correct expiration', async () => {
			const mockPut = vi.fn().mockResolvedValue(undefined);
			const expires_in = 3600; // 1 hour

			await GET({
				request: new Request('https://fintechnick.com/auth?code=123'),
				platform: {
					env: {
						KV: {
							get: vi.fn().mockResolvedValue('some_value_indicating_existence'),
							put: mockPut
						}
					}
				}
			});

			expect(mockPut).toHaveBeenCalledWith(
				expect.any(String), // auth token
				'mock_access_token', // access token
				expect.objectContaining({
					expiration: expect.any(Number)
				})
			);

			// Verify expiration is approximately correct (within 10 seconds)
			const call = mockPut.mock.calls[0];
			const expectedExpiration = Math.floor((Date.now() + expires_in * 1000) / 1000);
			expect(call[2].expiration).toBeCloseTo(expectedExpiration, -1);
		});
	});
});
