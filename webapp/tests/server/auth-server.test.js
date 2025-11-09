import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

const originalFetch = globalThis.fetch;
let randomValuesSpy;

const mockIsUserAllowed = vi.fn();

vi.mock('$env/static/private', () => ({
	GOOGLE_CLIENT_ID: 'unit-test-client',
	GOOGLE_CLIENT_SECRET: 'unit-test-secret'
}));

vi.mock('$lib/server/user-validation.js', () => ({
	isUserAllowed: (...args) => mockIsUserAllowed(...args)
}));

const createJsonResponse = (data, init = {}) =>
	new Response(JSON.stringify(data), {
		status: init.status ?? 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});

describe('Auth server route', () => {
	beforeEach(() => {
		vi.resetModules();
		mockIsUserAllowed.mockReset();
		globalThis.fetch = vi.fn();
		randomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
			const values = Array.from({ length: array.length }, (_, index) => (index * 7) % 256);
			array.set(values);
			return array;
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
		randomValuesSpy.mockRestore();
	});

	afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	const loadModule = () => import('../../src/routes/auth/+server.js');

	it('exchanges a code and sets auth cookie for allowed users', async () => {
		const { GET } = await loadModule();
		mockIsUserAllowed.mockResolvedValue(true);

		globalThis.fetch
			.mockResolvedValueOnce(
				createJsonResponse({
					access_token: 'google-access-token',
					expires_in: 3600
				})
			)
			.mockResolvedValueOnce(
				createJsonResponse({
					verified_email: true,
					email: 'user@example.com'
				})
			);

		const kvPut = vi.fn().mockResolvedValue(undefined);
		const platform = {
			env: {
				KV: {
					put: kvPut
				}
			}
		};

		const request = new Request('https://app.test/auth?code=abc123', {
			headers: {
				Cookie: 'redirectPath=/projects/ccbilling'
			}
		});
		const response = await GET({ request, platform });

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('https://app.test/projects/ccbilling');
		expect(response.headers.get('Set-Cookie')).toMatch(
			/^auth=.+; Expires=.+; Path=\/; Secure; SameSite=Lax$/
		);

		expect(mockIsUserAllowed).toHaveBeenCalledWith('user@example.com', platform.env.KV);
		expect(kvPut).toHaveBeenCalledTimes(1);

		const [authKey, tokenValue, options] = kvPut.mock.calls[0];
		expect(authKey).toMatch(/^[0-9a-z]+$/);
		expect(authKey.length).toBeGreaterThanOrEqual(20);
		expect(tokenValue).toBe('google-access-token');
		expect(options.expiration).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it('redirects disallowed users to the notauthorised page', async () => {
		const { GET } = await loadModule();
		mockIsUserAllowed.mockResolvedValue(false);

		globalThis.fetch
			.mockResolvedValueOnce(
				createJsonResponse({
					access_token: 'blocked-token',
					expires_in: 3600
				})
			)
			.mockResolvedValueOnce(
				createJsonResponse({
					verified_email: true,
					email: 'blocked@example.com'
				})
			);

		const platform = {
			env: {
				KV: {
					put: vi.fn()
				}
			}
		};

		const response = await GET({
			request: new Request('https://app.test/auth?code=abc123'),
			platform
		});

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('https://app.test/notauthorised');
		expect(platform.env.KV.put).not.toHaveBeenCalled();
	});

	it('returns a server error when the provider reports an error', async () => {
		const { GET } = await loadModule();

		const response = await GET({
			request: new Request('https://app.test/auth?error=access_denied'),
			platform: { env: { KV: { put: vi.fn() } } }
		});

		expect(response.status).toBe(500);
		expect(await response.text()).toContain('Authentication failed');
	});

	it('handles token exchange failures gracefully', async () => {
		const { GET } = await loadModule();
		mockIsUserAllowed.mockResolvedValue(true);

		globalThis.fetch.mockResolvedValueOnce(
			createJsonResponse({
				error: 'invalid_grant',
				error_description: 'invalid code'
			})
		);
		const response = await GET({
			request: new Request('https://app.test/auth?code=badcode'),
			platform: { env: { KV: { put: vi.fn() } } }
		});

		expect(response.status).toBe(500);
		expect(await response.text()).toContain('Authentication failed');
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	it('responds with an error when the auth code parameter is missing', async () => {
		const { GET } = await loadModule();

		const response = await GET({
			request: new Request('https://app.test/auth'),
			platform: { env: { KV: { put: vi.fn() } } }
		});

		expect(response.status).toBe(500);
		expect(await response.text()).toContain('Authentication failed');
	});
});
