import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireUser, getCurrentUser } from '../../../src/lib/server/auth.js';

// The auth.js module is hard to mock internally (getCurrentUser from requireUser),
// so we'll test requireUser by passing an event that will make getCurrentUser succeed or fail.

// Mock redirect from sveltejs/kit
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		redirect: vi.fn((status, location) => {
			const err = new Error('REDIRECT');
			err.status = status;
			err.location = location;
			return err;
		})
	};
});

describe('auth.js', () => {
	describe('requireUser', () => {
		let mockEvent;

		beforeEach(() => {
			// Mock a request event that will fail getCurrentUser (no auth cookie)
			mockEvent = {
				request: {
					headers: new Headers()
				},
				url: new URL('http://localhost/some-page'),
				platform: {
					env: {
						KV: {
							get: vi.fn()
						}
					}
				}
			};
		});

		it('redirects to notauthorised for page routes when not authenticated', async () => {
			mockEvent.url = new URL('http://localhost/protected-page');

			await expect(requireUser(mockEvent)).rejects.toThrow('REDIRECT');

			try {
				await requireUser(mockEvent);
			} catch (err) {
				expect(err.status).toBe(303);
				expect(err.location).toBe('/notauthorised?redirectTo=%2Fprotected-page');
			}
		});

		it('throws an error for API routes when not authenticated', async () => {
			mockEvent.url = new URL('http://localhost/api/protected-data');

			await expect(requireUser(mockEvent)).rejects.toThrow('Unauthorized');
		});

		it('returns the user object when authenticated', async () => {
			// Setup a mock event that will succeed getCurrentUser
			// This is complex because we need to mock KV and fetch
			mockEvent.request.headers.set('cookie', 'auth=valid-cookie');
			mockEvent.platform.env.KV.get.mockResolvedValue('valid-google-token');

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					id: '123',
					email: 'test@example.com',
					name: 'Test User'
				})
			});

			const user = await requireUser(mockEvent);

			expect(user).toBeDefined();
			expect(user.email).toBe('test@example.com');
			expect(user.name).toBe('Test User');
		});
	});
});
