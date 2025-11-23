import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../../../src/routes/auth/github/callback/+server.js';
import { github } from '$lib/server/auth.js';
import * as session from '$lib/server/session.js';
import * as environment from '$app/environment';

// Mock dependencies
vi.mock('$lib/server/auth.js', () => ({
	github: {
		validateAuthorizationCode: vi.fn()
	}
}));
vi.mock('$lib/server/session.js', () => ({
	createSession: vi.fn(),
	setSessionCookie: vi.fn()
}));
vi.mock('$app/environment');

describe('/auth/github/callback/+server.js', () => {
	let mockEvent;
	let mockFetch;

	beforeEach(() => {
		vi.resetAllMocks();
		mockFetch = vi.fn();
		global.fetch = mockFetch;
		vi.spyOn(environment, 'dev', 'get').mockReturnValue(true); // Default to dev environment

		mockEvent = {
			url: new URL('http://localhost/auth/github/callback'),
			cookies: {
				get: vi.fn(),
				set: vi.fn() // For session.js mock
			},
			platform: {
				env: {
					KV: {} // Mock KV environment
				}
			}
		};
	});

	// Test cases for invalid state/params
	it.each([
		{ name: 'missing code', code: null, state: 'state', cookie: 'state' },
		{ name: 'missing state', code: 'code', state: null, cookie: 'state' },
		{ name: 'missing cookie', code: 'code', state: 'state', cookie: null },
		{ name: 'state mismatch', code: 'code', state: 'state1', cookie: 'state2' }
	])('should return 400 on $name', async ({ code, state, cookie }) => {
		if (code) mockEvent.url.searchParams.set('code', code);
		if (state) mockEvent.url.searchParams.set('state', state);
		mockEvent.cookies.get.mockReturnValue(cookie);

		const response = await GET(mockEvent);
		expect(response.status).toBe(400);
	});

	// Test case for successful authentication
	it('should create a session and redirect on successful authentication', async () => {
		const code = 'valid-code';
		const state = 'valid-state';
		const accessToken = 'gh-token';
		const githubUser = { id: 12345, login: 'testuser' };
		const sessionData = { id: 'session-id', expiresAt: new Date() };

		mockEvent.url.searchParams.set('code', code);
		mockEvent.url.searchParams.set('state', state);
		mockEvent.cookies.get.mockReturnValue(state);

		vi.mocked(github.validateAuthorizationCode).mockResolvedValue({ accessToken });
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => githubUser
		});
		vi.mocked(session.createSession).mockResolvedValue(sessionData);

		const response = await GET(mockEvent);

		expect(github.validateAuthorizationCode).toHaveBeenCalledWith(code);
		expect(mockFetch).toHaveBeenCalledWith('https://api.github.com/user', expect.any(Object));
		expect(session.createSession).toHaveBeenCalledWith(
			mockEvent.platform.env.KV,
			githubUser.id.toString()
		);
		expect(session.setSessionCookie).toHaveBeenCalledWith(
			mockEvent.cookies,
			sessionData.id,
			sessionData.expiresAt,
			false // !dev
		);

		expect(response.status).toBe(302);
		expect(response.headers.get('Location')).toBe('/');
	});

	it('should set secure cookie in production', async () => {
		// Mock a successful flow but set dev to false
		vi.spyOn(environment, 'dev', 'get').mockReturnValue(false);
		const state = 'valid-state';
		mockEvent.url.searchParams.set('code', 'code');
		mockEvent.url.searchParams.set('state', state);
		mockEvent.cookies.get.mockReturnValue(state);
		vi.mocked(github.validateAuthorizationCode).mockResolvedValue({ accessToken: 'token' });
		mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
		vi.mocked(session.createSession).mockResolvedValue({ id: 'sid', expiresAt: new Date() });

		await GET(mockEvent);

		expect(session.setSessionCookie).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.anything(),
			true // !dev should be true now
		);
	});

	// Test cases for failure scenarios
	it('should return 500 if token validation fails', async () => {
		const state = 'valid-state';
		mockEvent.url.searchParams.set('code', 'code');
		mockEvent.url.searchParams.set('state', state);
		mockEvent.cookies.get.mockReturnValue(state);

		vi.mocked(github.validateAuthorizationCode).mockRejectedValue(new Error('Auth error'));

		const response = await GET(mockEvent);
		expect(response.status).toBe(500);
	});

	it('should return 500 if GitHub user fetch fails', async () => {
		const state = 'valid-state';
		mockEvent.url.searchParams.set('code', 'code');
		mockEvent.url.searchParams.set('state', state);
		mockEvent.cookies.get.mockReturnValue(state);
		vi.mocked(github.validateAuthorizationCode).mockResolvedValue({ accessToken: 'token' });
		mockFetch.mockRejectedValue(new Error('Network error'));

		const response = await GET(mockEvent);
		expect(response.status).toBe(500);
	});
});
