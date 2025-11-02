import { describe, it, expect, vi, afterEach } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalFetch = global.fetch;

const createRedirectMock = () =>
	vi.fn((status, location) => {
		const error = new Error('Redirect');
		error.status = status;
		error.location = location;
		throw error;
	});

async function setupModule(options = {}) {
	const { clientId, clientSecret } = options;
	const resolvedClientId = Object.prototype.hasOwnProperty.call(options, 'clientId')
		? clientId
		: 'client-id';
	const resolvedClientSecret = Object.prototype.hasOwnProperty.call(options, 'clientSecret')
		? clientSecret
		: 'client-secret';
	vi.resetModules();
	delete process.env.GITHUB_CLIENT_ID;
	delete process.env.GITHUB_CLIENT_SECRET;
	process.env.NODE_ENV = 'test';
	if (resolvedClientId !== undefined) {
		process.env.GITHUB_CLIENT_ID = resolvedClientId;
	}
	if (resolvedClientSecret !== undefined) {
		process.env.GITHUB_CLIENT_SECRET = resolvedClientSecret;
	}

	const redirectMock = createRedirectMock();
	const validateAuthState = vi.fn(() => true);
	const validateGitHubToken = vi.fn(() => ({
		success: true,
		authState: {
			token: 'github-app-token',
			expiresAt: new Date('2030-01-01T00:00:00Z'),
			metadata: { username: 'octocat' }
		}
	}));
	const initializeMock = vi.fn();
	const updateGitHubAuth = vi.fn(() => Promise.resolve(true));
	const getCurrentUser = vi.fn(() => Promise.resolve({ id: 'user-1', email: 'user@example.com' }));

	vi.doMock('@sveltejs/kit', () => ({ redirect: redirectMock }));

	vi.doMock('$lib/utils/auth-helpers.js', () => ({
		validateAuthState,
		validateGitHubToken
	}));

	vi.doMock('$lib/server/genproj-auth.js', () => ({
		genprojAuth: {
			initialize: initializeMock,
			updateGitHubAuth
		}
	}));

	vi.doMock('$lib/server/auth-helpers.js', () => ({
		getCurrentUser
	}));

	vi.doMock('$env/static/private', () => ({
		get GITHUB_CLIENT_ID() {
			return process.env.GITHUB_CLIENT_ID ?? 'placeholder';
		},
		get GITHUB_CLIENT_SECRET() {
			return process.env.GITHUB_CLIENT_SECRET ?? 'placeholder';
		}
	}));

	global.fetch = vi.fn();

	const module = await import('./+server.js');

	return {
		GET: module.GET,
		redirectMock,
		validateAuthState,
		validateGitHubToken,
		initializeMock,
		updateGitHubAuth,
		getCurrentUser
	};
}

afterEach(() => {
	delete process.env.GITHUB_CLIENT_ID;
	delete process.env.GITHUB_CLIENT_SECRET;
	process.env.NODE_ENV = originalNodeEnv;
	global.fetch = originalFetch;
	vi.resetModules();
});

const createRequest = (query) =>
	new Request(`https://example.com/projects/genproj/api/auth/github/callback${query}`);

const createPlatform = (overrides = {}) => ({
	env: {
		KV: {
			get: vi.fn().mockResolvedValue('stored-state'),
			delete: vi.fn().mockResolvedValue(undefined),
			...overrides
		}
	}
});

describe('GitHub Auth API - Callback', () => {
	it('exchanges code, validates user, and stores auth state', async () => {
		const {
			GET,
			redirectMock,
			validateAuthState,
			validateGitHubToken,
			initializeMock,
			updateGitHubAuth,
			getCurrentUser
		} = await setupModule();

		global.fetch.mockResolvedValueOnce({
			json: async () => ({ access_token: 'token-123', scope: 'repo,user:email' })
		});

		const platform = createPlatform();
		const request = createRequest('?code=abc123&state=my-state');

		await expect(
			GET({ request, platform })
		).rejects.toMatchObject({ status: 302, location: 'https://example.com/projects/genproj?auth=github_success' });

		expect(global.fetch).toHaveBeenCalledWith('https://github.com/login/oauth/access_token', expect.any(Object));
		const [, fetchOptions] = global.fetch.mock.calls[0];
		const body = fetchOptions.body;
		expect(body.get('code')).toBe('abc123');
		expect(body.get('redirect_uri')).toBe(
			'https://example.com/projects/genproj/api/auth/github/callback'
		);
		expect(validateAuthState).toHaveBeenCalledWith('my-state', 'stored-state');
		expect(platform.env.KV.delete).toHaveBeenCalledWith('github_oauth_state_my-state');
		expect(validateGitHubToken).toHaveBeenCalledWith('token-123');
		expect(getCurrentUser).toHaveBeenCalled();
		expect(initializeMock).toHaveBeenCalledWith({ id: 'user-1', email: 'user@example.com' }, platform);
		expect(updateGitHubAuth).toHaveBeenCalledWith({
			username: 'octocat',
			token: 'github-app-token',
			expiresAt: new Date('2030-01-01T00:00:00Z'),
			scopes: ['repo', 'user:email']
		});
		expect(redirectMock).toHaveBeenCalledWith(
			302,
			'https://example.com/projects/genproj?auth=github_success'
		);
	});

	it('redirects when provider returns error', async () => {
		const { GET } = await setupModule();
		await expect(
			GET({
				request: createRequest('?error=access_denied'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=github_auth_failed'
		});
	});

	it('redirects when authorization code is missing', async () => {
		const { GET } = await setupModule();
		await expect(
			GET({
				request: createRequest('?state=missing-code'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=github_auth_failed'
		});
	});

	it('redirects when state parameter is missing', async () => {
		const { GET } = await setupModule();
		await expect(
			GET({
				request: createRequest('?code=abc123'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=github_auth_failed'
		});
	});

	it('redirects with invalid_state when stored state is missing', async () => {
		const { GET, validateAuthState } = await setupModule();
		const platform = createPlatform({ get: vi.fn().mockResolvedValue(null) });
		await expect(
			GET({ request: createRequest('?code=abc&state=state-1'), platform })
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=invalid_state'
		});
		expect(validateAuthState).not.toHaveBeenCalled();
	});

	it('redirects with invalid_state when validation fails', async () => {
		const { GET, validateAuthState } = await setupModule();
		validateAuthState.mockReturnValue(false);
		await expect(
			GET({
				request: createRequest('?code=abc&state=state-1'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=invalid_state'
		});
	});

	it('redirects when token exchange returns an error', async () => {
		const { GET } = await setupModule();
		global.fetch.mockResolvedValueOnce({
			json: async () => ({ error: 'bad_verification_code' })
		});

		await expect(
			GET({
				request: createRequest('?code=abc&state=state-1'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=github_auth_failed'
		});
	});

	it('redirects when GitHub token validation fails', async () => {
		const { GET, validateGitHubToken } = await setupModule();
		global.fetch.mockResolvedValueOnce({
			json: async () => ({ access_token: 'token-123' })
		});
		validateGitHubToken.mockResolvedValueOnce({ success: false, error: 'bad-token' });

		await expect(
			GET({
				request: createRequest('?code=abc&state=state-1'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=token_validation_failed'
		});
	});

	it('redirects when Google authentication is missing', async () => {
		const { GET, getCurrentUser } = await setupModule();
		global.fetch.mockResolvedValueOnce({
			json: async () => ({ access_token: 'token-123' })
		});
		getCurrentUser.mockResolvedValueOnce(null);

		await expect(
			GET({
				request: createRequest('?code=abc&state=state-1'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=google_auth_required'
		});
	});

	it('redirects when persistence fails', async () => {
		const { GET, updateGitHubAuth } = await setupModule();
		global.fetch.mockResolvedValueOnce({
			json: async () => ({ access_token: 'token-123' })
		});
		updateGitHubAuth.mockResolvedValueOnce(false);

		await expect(
			GET({
				request: createRequest('?code=abc&state=state-1'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=github_auth_failed'
		});
	});

	it('redirects when client secret is not configured', async () => {
		const { GET } = await setupModule({ clientSecret: undefined });
		await expect(
			GET({
				request: createRequest('?code=abc&state=state-1'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=github_auth_failed'
		});
	});

	it('redirects when token exchange request throws', async () => {
		const { GET } = await setupModule();
		global.fetch.mockRejectedValueOnce(new Error('Network failure'));

		await expect(
			GET({
				request: createRequest('?code=abc&state=state-1'),
				platform: createPlatform()
			})
		).rejects.toMatchObject({
			status: 302,
			location: 'https://example.com/projects/genproj?error=github_auth_failed'
		});
	});
});
