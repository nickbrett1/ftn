import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { GET } from '../../../src/routes/logout/+server.js';
import { genprojAuth } from '$lib/server/genproj-auth.js';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status, location) => ({ status, location, isRedirect: true }))
}));
vi.mock('$lib/server/genproj-auth.js', () => ({
	genprojAuth: {
		initialize: vi.fn(),
		clearGitHubAuth: vi.fn()
	}
}));

describe('/logout/+server.js', () => {
	let mockEvent;
	let mockFetch;
	let consoleErrorSpy;

	beforeEach(() => {
		mockFetch = vi.fn();
		global.fetch = mockFetch;

		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		mockEvent = {
			request: {
				headers: new Map()
			},
			platform: {
				env: {
					KV: {
						get: vi.fn(),
						delete: vi.fn()
					}
				}
			}
		};
		vi.mocked(redirect).mockClear();
		vi.mocked(genprojAuth.initialize).mockClear();
		vi.mocked(genprojAuth.clearGitHubAuth).mockClear();
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
	});

	it('redirects to notauthorised if no cookie is present', async () => {
		await expect(GET(mockEvent)).rejects.toEqual({
			status: 307,
			location: '/notauthorised',
			isRedirect: true
		});
	});

	it('redirects to notauthorised if auth cookie is missing', async () => {
		mockEvent.request.headers.set('cookie', 'some_other_cookie=value');
		await expect(GET(mockEvent)).rejects.toEqual({
			status: 307,
			location: '/notauthorised',
			isRedirect: true
		});
	});

	it('clears cookie and redirects home if token not in KV', async () => {
		const authCookieKey = 'test-cookie-key';
		mockEvent.request.headers.set('cookie', `auth=${authCookieKey}`);
		mockEvent.platform.env.KV.get.mockResolvedValue(null);

		const response = await GET(mockEvent);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('/');
		expect(response.headers.get('set-cookie')).toMatch(/^auth=/);
		expect(mockFetch).not.toHaveBeenCalled();
		expect(mockEvent.platform.env.KV.delete).not.toHaveBeenCalled();
	});

	it('performs a full logout if token exists in KV', async () => {
		const authCookieKey = 'test-cookie-key';
		const token = 'test-google-token';
		mockEvent.request.headers.set('cookie', `auth=${authCookieKey}`);
		mockEvent.platform.env.KV.get.mockResolvedValue(token);
		mockFetch.mockResolvedValue({ ok: true });

		const response = await GET(mockEvent);

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('/');
		expect(response.headers.get('set-cookie')).toMatch(/^auth=/);

		// Verify Google token revocation
		expect(mockFetch).toHaveBeenCalledWith(
			'https://oauth2.googleapis.com/revoke',
			expect.any(Object)
		);
		const fetchBody = mockFetch.mock.calls[0][1].body;
		expect(fetchBody.get('token')).toBe(token);

		// Verify KV delete
		expect(mockEvent.platform.env.KV.delete).toHaveBeenCalledWith(authCookieKey);

		// Verify genproj auth clear
		expect(genprojAuth.initialize).toHaveBeenCalledWith(
			{ id: authCookieKey, email: 'unknown@example.com' },
			mockEvent.platform
		);
		expect(genprojAuth.clearGitHubAuth).toHaveBeenCalled();
	});

	it('completes logout even if Google token revocation fails', async () => {
		const authCookieKey = 'test-cookie-key';
		const token = 'test-google-token';
		mockEvent.request.headers.set('cookie', `auth=${authCookieKey}`);
		mockEvent.platform.env.KV.get.mockResolvedValue(token);
		mockFetch.mockResolvedValue({ ok: false, statusText: 'API Error' });

		const response = await GET(mockEvent);

		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to revoke Google token:', 'API Error');

		expect(response.status).toBe(307);
		expect(mockEvent.platform.env.KV.delete).toHaveBeenCalledWith(authCookieKey);
		expect(genprojAuth.clearGitHubAuth).toHaveBeenCalled();
	});
});