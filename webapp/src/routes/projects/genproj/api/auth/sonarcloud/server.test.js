import { describe, it, expect, vi, beforeEach } from 'vitest';

const helperMocks = vi.hoisted(() => ({
	generateAuthState: vi.fn(),
	generateSonarCloudAuthUrl: vi.fn(),
	validateSonarCloudToken: vi.fn()
}));

const authManagerMocks = vi.hoisted(() => ({
	initialize: vi.fn(),
	updateSonarCloudAuth: vi.fn()
}));

const getCurrentUserMock = vi.hoisted(() => vi.fn());

vi.mock('@sveltejs/kit', () => ({
	json: (data, init) =>
		Response.json(data, {
			status: init?.status ?? 200,
			headers: {
				'Content-Type': 'application/json',
				...init?.headers
			}
		})
}));

vi.mock('$lib/utils/auth-helpers.js', () => helperMocks);

vi.mock('$lib/server/genproj-auth.js', () => ({
	genprojAuth: {
		...authManagerMocks,
		initializePlatform: vi.fn(),
		kv: null
	}
}));

vi.mock('$lib/server/auth-helpers.js', () => ({
	getCurrentUser: getCurrentUserMock
}));

import { GET, POST } from './+server.js';

const defaultPlatform = { env: { KV: {} } };

describe('SonarCloud Auth API', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		helperMocks.generateAuthState.mockReturnValue('generated-state');
		helperMocks.generateSonarCloudAuthUrl.mockReturnValue('https://sonarcloud.example/auth');
		helperMocks.validateSonarCloudToken.mockResolvedValue({
			success: true,
			authState: {
				token: 'sonar-token',
				expiresAt: new Date('2030-01-01T00:00:00Z'),
				metadata: { valid: true }
			}
		});
		authManagerMocks.updateSonarCloudAuth.mockResolvedValue(true);
		getCurrentUserMock.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
	});

	describe('GET', () => {
		it('returns auth URL and generated state when none provided', async () => {
			const request = new Request('https://example.com/projects/genproj/api/auth/sonarcloud');

			const response = await GET({ request });
			const body = await response.json();

			expect(helperMocks.generateAuthState).toHaveBeenCalledTimes(1);
			expect(helperMocks.generateSonarCloudAuthUrl).toHaveBeenCalledWith(
				'https://example.com/projects/genproj/api/auth/sonarcloud/callback',
				'generated-state'
			);
			expect(body.authUrl).toBe('https://sonarcloud.example/auth');
			expect(body.state).toBe('generated-state');
			expect(body.instructions).toContain('SonarCloud');
		});

		it('reuses provided state parameter', async () => {
			const request = new Request(
				'https://example.com/projects/genproj/api/auth/sonarcloud?state=provided-state'
			);

			const response = await GET({ request });
			const body = await response.json();

			expect(helperMocks.generateAuthState).not.toHaveBeenCalled();
			expect(helperMocks.generateSonarCloudAuthUrl).toHaveBeenCalledWith(
				'https://example.com/projects/genproj/api/auth/sonarcloud/callback',
				'provided-state'
			);
			expect(body.state).toBe('provided-state');
		});

		it('returns error response when helper throws', async () => {
			helperMocks.generateSonarCloudAuthUrl.mockImplementationOnce(() => {
				throw new Error('Generation failed');
			});

			const response = await GET({
				request: new Request('https://example.com/projects/genproj/api/auth/sonarcloud')
			});
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Generation failed');
		});
	});

	describe('POST', () => {
		const createRequest = (payload) =>
			new Request('https://example.com/projects/genproj/api/auth/sonarcloud', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

		it('returns 400 when token is missing', async () => {
			const response = await POST({ request: createRequest({}), platform: defaultPlatform });
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body.error).toBe('Token is required');
		});

		it('validates token and stores auth state', async () => {
			const response = await POST({
				request: createRequest({ token: 'valid-token' }),
				platform: defaultPlatform
			});
			const body = await response.json();

			expect(helperMocks.validateSonarCloudToken).toHaveBeenCalledWith('valid-token');
			expect(getCurrentUserMock).toHaveBeenCalled();
			expect(authManagerMocks.initialize).toHaveBeenCalledWith(
				{ id: 'user-1', email: 'test@example.com' },
				defaultPlatform
			);
			expect(authManagerMocks.updateSonarCloudAuth).toHaveBeenCalledWith({
				token: 'sonar-token',
				expiresAt: new Date('2030-01-01T00:00:00Z')
			});
			expect(response.status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.user).toEqual({ valid: true });
		});

		it('returns 401 when token validation fails', async () => {
			helperMocks.validateSonarCloudToken.mockResolvedValueOnce({
				success: false,
				error: 'Invalid token'
			});

			const response = await POST({
				request: createRequest({ token: 'bad-token' }),
				platform: defaultPlatform
			});
			const body = await response.json();

			expect(response.status).toBe(401);
			expect(body.error).toBe('Invalid token');
			expect(authManagerMocks.updateSonarCloudAuth).not.toHaveBeenCalled();
		});

		it('returns 401 when user is not authenticated', async () => {
			getCurrentUserMock.mockResolvedValueOnce(null);

			const response = await POST({
				request: createRequest({ token: 'valid-token' }),
				platform: defaultPlatform
			});
			const body = await response.json();

			expect(response.status).toBe(401);
			expect(body.error).toBe('Google authentication required');
			expect(authManagerMocks.updateSonarCloudAuth).not.toHaveBeenCalled();
		});

		it('returns 500 when persistence fails', async () => {
			// Mock initializePlatform to set kv property
			const { genprojAuth } = await import('$lib/server/genproj-auth.js');
			genprojAuth.kv = defaultPlatform.env.KV;
			authManagerMocks.updateSonarCloudAuth.mockResolvedValueOnce(false);

			const response = await POST({
				request: createRequest({ token: 'valid-token' }),
				platform: defaultPlatform
			});
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Failed to update SonarCloud authentication');
		});

		it('returns 500 when validation throws', async () => {
			helperMocks.validateSonarCloudToken.mockRejectedValueOnce(new Error('Network error'));

			const response = await POST({
				request: createRequest({ token: 'valid-token' }),
				platform: defaultPlatform
			});
			const body = await response.json();

			expect(response.status).toBe(500);
			expect(body.error).toBe('Network error');
		});
	});
});
