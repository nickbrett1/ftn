import { describe, it, expect, vi, afterEach } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;

const createRedirectMock = () =>
	vi.fn((status, location) => {
		const error = new Error('Redirect');
		error.status = status;
		error.location = location;
		throw error;
	});

const createJsonMock = () =>
	vi.fn((data, init) =>
		new Response(JSON.stringify(data), {
			status: init?.status ?? 200,
			headers: {
				'Content-Type': 'application/json',
				...(init?.headers ?? {})
			}
		})
	);

async function setupModule(options = {}) {
	const { clientId, nodeEnv = 'test' } = options;
	const resolvedClientId = Object.prototype.hasOwnProperty.call(options, 'clientId')
		? clientId
		: 'client-id';
	vi.resetModules();
	delete process.env.GITHUB_CLIENT_ID;
	delete process.env.GITHUB_CLIENT_SECRET;
	process.env.NODE_ENV = nodeEnv;
	if (resolvedClientId !== undefined) {
		process.env.GITHUB_CLIENT_ID = resolvedClientId;
	}

	const redirectMock = createRedirectMock();
	const jsonMock = createJsonMock();
	const generateAuthState = vi.fn(() => 'generated-state');
	const generateGitHubAuthUrl = vi.fn(() => 'https://github.com/oauth');

	vi.doMock('@sveltejs/kit', () => ({
		json: jsonMock,
		redirect: redirectMock
	}));

	vi.doMock('$lib/utils/auth-helpers.js', () => ({
		generateAuthState,
		generateGitHubAuthUrl
	}));

	vi.doMock('$env/static/private', () => ({
		get GITHUB_CLIENT_ID() {
			return process.env.GITHUB_CLIENT_ID ?? 'placeholder';
		}
	}));

	const module = await import('./+server.js');
	const kit = await import('@sveltejs/kit');
	const helpers = await import('$lib/utils/auth-helpers.js');

	return {
		GET: module.GET,
		jsonMock: kit.json,
		redirectMock: kit.redirect,
		generateAuthState: helpers.generateAuthState,
		generateGitHubAuthUrl: helpers.generateGitHubAuthUrl
	};
}

afterEach(() => {
	delete process.env.GITHUB_CLIENT_ID;
	delete process.env.GITHUB_CLIENT_SECRET;
	process.env.NODE_ENV = originalNodeEnv;
	vi.resetModules();
});

describe('GitHub Auth API - Initiation', () => {
	it('redirects to GitHub OAuth when configured', async () => {
		const { GET, redirectMock, generateAuthState, generateGitHubAuthUrl } = await setupModule();
		generateGitHubAuthUrl.mockReturnValue('https://github.com/login/oauth/authorize?state=test');
		const kvPut = vi.fn();
		const request = new Request('https://example.com/projects/genproj/api/auth/github');

		await expect(
			GET({
				request,
				platform: { env: { KV: { put: kvPut } } }
			})
		).rejects.toMatchObject({ status: 302, location: 'https://github.com/login/oauth/authorize?state=test' });

		expect(generateAuthState).toHaveBeenCalledTimes(1);
		expect(generateGitHubAuthUrl).toHaveBeenCalledWith(
			'client-id',
			'https://example.com/projects/genproj/api/auth/github/callback',
			'generated-state',
			['repo', 'user:email']
		);
		expect(kvPut).toHaveBeenCalledWith(
			'github_oauth_state_generated-state',
			JSON.stringify({
				state: 'generated-state',
				selected: null,
				projectName: null,
				repositoryUrl: null
			}),
			expect.objectContaining({ expiration: expect.any(Number) })
		);
		expect(redirectMock).toHaveBeenCalledWith(
			302,
			'https://github.com/login/oauth/authorize?state=test'
		);
	});

	it('uses provided state parameter without regenerating', async () => {
		const { GET, generateAuthState } = await setupModule();
		const kvPut = vi.fn();
		const request = new Request(
			'https://example.com/projects/genproj/api/auth/github?state=provided-state'
		);

		await expect(
			GET({
				request,
				platform: { env: { KV: { put: kvPut } } }
			})
		).rejects.toMatchObject({ status: 302 });

		expect(generateAuthState).not.toHaveBeenCalled();
		expect(kvPut).toHaveBeenCalledWith(
			'github_oauth_state_provided-state',
			JSON.stringify({
				state: 'provided-state',
				selected: null,
				projectName: null,
				repositoryUrl: null
			}),
			expect.any(Object)
		);
	});

	it('returns JSON error response when client ID is not configured', async () => {
		const { GET, generateGitHubAuthUrl } = await setupModule({ clientId: undefined });
		const response = await GET({
			request: new Request('https://example.com/projects/genproj/api/auth/github'),
			platform: { env: { KV: { put: vi.fn() } } }
		});
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBe('GitHub OAuth not configured');
		expect(generateGitHubAuthUrl).not.toHaveBeenCalled();
	});

	it('returns HTML guidance in development when client ID missing', async () => {
		const { GET } = await setupModule({ clientId: undefined, nodeEnv: 'development' });
		const response = await GET({
			request: new Request('https://example.com/projects/genproj/api/auth/github'),
			platform: { env: { KV: { put: vi.fn() } } }
		});
		const text = await response.text();

		expect(response.status).toBe(500);
		expect(response.headers.get('Content-Type')).toBe('text/html');
		expect(text).toContain('<html>');
		expect(text).toContain('GitHub OAuth Configuration Required');
	});

	it('returns error response when URL generation fails', async () => {
		const { GET, generateGitHubAuthUrl } = await setupModule();
		generateGitHubAuthUrl.mockImplementation(() => {
			throw new Error('URL generation failed');
		});
		const response = await GET({
			request: new Request('https://example.com/projects/genproj/api/auth/github'),
			platform: { env: { KV: { put: vi.fn() } } }
		});
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBe('URL generation failed');
	});
});
