/**
 * @fileoverview Tests for authentication helper utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	generateAuthState,
	validateAuthState,
	generateGitHubAuthUrl,
	generateCircleCIAuthUrl,
	generateDopplerAuthUrl,
	generateSonarCloudAuthUrl,
	validateGitHubToken,
	validateCircleCIToken,
	validateDopplerToken,
	validateSonarCloudToken,
	validateServiceToken,
	isAuthStateExpired,
	formatAuthError
} from './auth-helpers.js';

describe('Auth Helpers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	describe('generateAuthState', () => {
		it('should generate a random state string', () => {
			const state = generateAuthState();
			expect(state).toBeDefined();
			expect(typeof state).toBe('string');
			expect(state.length).toBeGreaterThan(0);
		});

		it('should generate unique states', () => {
			const state1 = generateAuthState();
			const state2 = generateAuthState();
			expect(state1).not.toBe(state2);
		});

		it('should generate state with specified length', () => {
			const state = generateAuthState(64);
			expect(state.length).toBe(64);
		});

		it('should generate state with default length', () => {
			const state = generateAuthState();
			expect(state.length).toBe(32);
		});

		it('should only use allowed characters', () => {
			const state = generateAuthState();
			const allowedChars = /^[A-Za-z0-9]+$/;
			expect(state).toMatch(allowedChars);
		});
	});

	describe('validateAuthState', () => {
		it('should validate matching states', () => {
			const state = 'test-state-123';
			expect(validateAuthState(state, state)).toBe(true);
		});

		it('should reject non-matching states', () => {
			expect(validateAuthState('state-1', 'state-2')).toBe(false);
		});

		it('should reject null states', () => {
			expect(validateAuthState(null, 'state')).toBeFalsy();
			expect(validateAuthState('state', null)).toBeFalsy();
		});

		it('should reject undefined states', () => {
			expect(validateAuthState(undefined, 'state')).toBeFalsy();
			expect(validateAuthState('state')).toBeFalsy();
		});

		it('should reject empty strings', () => {
			expect(validateAuthState('', 'state')).toBeFalsy();
			expect(validateAuthState('state', '')).toBeFalsy();
		});
	});

	describe('generateGitHubAuthUrl', () => {
		it('should generate correct GitHub OAuth URL', () => {
			const url = generateGitHubAuthUrl('client-123', 'https://example.com/callback', 'state-456');
			expect(url).toContain('https://github.com/login/oauth/authorize');
			expect(url).toContain('client_id=client-123');
			expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
			expect(url).toContain('state=state-456');
			expect(url).toContain('scope=repo+user%3Aemail');
			expect(url).toContain('response_type=code');
		});

		it('should use custom scopes when provided', () => {
			const url = generateGitHubAuthUrl('client-123', 'https://example.com/callback', 'state-456', [
				'read:user'
			]);
			expect(url).toContain('scope=read%3Auser');
		});

		it('should handle multiple scopes', () => {
			const url = generateGitHubAuthUrl('client-123', 'https://example.com/callback', 'state-456', [
				'repo',
				'read:user'
			]);
			expect(url).toContain('scope=repo+read%3Auser');
		});
	});

	describe('generateCircleCIAuthUrl', () => {
		it('should generate correct CircleCI token URL', () => {
			const url = generateCircleCIAuthUrl('https://example.com/callback', 'state-123');
			expect(url).toContain('https://app.circleci.com/settings/user/tokens');
			expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
			expect(url).toContain('state=state-123');
		});
	});

	describe('generateDopplerAuthUrl', () => {
		it('should generate correct Doppler token URL', () => {
			const url = generateDopplerAuthUrl('https://example.com/callback', 'state-123');
			expect(url).toContain('https://dashboard.doppler.com/security/tokens');
			expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
			expect(url).toContain('state=state-123');
		});
	});

	describe('generateSonarCloudAuthUrl', () => {
		it('should generate correct SonarCloud token URL', () => {
			const url = generateSonarCloudAuthUrl('https://example.com/callback', 'state-123');
			expect(url).toContain('https://sonarcloud.io/account/security');
			expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
			expect(url).toContain('state=state-123');
		});
	});

	describe('validateGitHubToken', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should validate valid GitHub token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					login: 'testuser',
					id: 12_345,
					email: 'test@example.com'
				})
			});

			const result = await validateGitHubToken('valid-token');

			expect(result.success).toBe(true);
			expect(result.authState).toBeDefined();
			expect(result.authState.service).toBe('github');
			expect(result.authState.token).toBe('valid-token');
			expect(result.authState.metadata.username).toBe('testuser');
			expect(result.authState.metadata.email).toBe('test@example.com');
		});

		it('should reject invalid GitHub token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			});

			const result = await validateGitHubToken('invalid-token');

			expect(result.success).toBe(false);
			expect(result.error).toContain('GitHub API error');
			expect(result.error).toContain('401');
		});

		it('should handle network errors', async () => {
			globalThis.fetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await validateGitHubToken('token');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Failed to validate GitHub token');
		});
	});

	describe('validateCircleCIToken', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should validate valid CircleCI token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					name: 'Test User',
					id: 'user-123',
					login: 'testuser'
				})
			});

			const result = await validateCircleCIToken('valid-token');

			expect(result.success).toBe(true);
			expect(result.authState).toBeDefined();
			expect(result.authState.service).toBe('circleci');
			expect(result.authState.token).toBe('valid-token');
		});

		it('should reject invalid CircleCI token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			});

			const result = await validateCircleCIToken('invalid-token');

			expect(result.success).toBe(false);
			expect(result.error).toContain('CircleCI API error');
		});
	});

	describe('validateDopplerToken', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should validate valid Doppler token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					name: 'Test User',
					id: 'user-123',
					email: 'test@example.com'
				})
			});

			const result = await validateDopplerToken('valid-token');

			expect(result.success).toBe(true);
			expect(result.authState).toBeDefined();
			expect(result.authState.service).toBe('doppler');
			expect(result.authState.token).toBe('valid-token');
		});

		it('should reject invalid Doppler token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			});

			const result = await validateDopplerToken('invalid-token');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Doppler API error');
		});
	});

	describe('validateSonarCloudToken', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should validate valid SonarCloud token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					valid: true
				})
			});

			const result = await validateSonarCloudToken('valid-token');

			expect(result.success).toBe(true);
			expect(result.authState).toBeDefined();
			expect(result.authState.service).toBe('sonarcloud');
			expect(result.authState.token).toBe('valid-token');
		});

		it('should reject invalid SonarCloud token', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: false,
				status: 401,
				statusText: 'Unauthorized'
			});

			const result = await validateSonarCloudToken('invalid-token');

			expect(result.success).toBe(false);
			expect(result.error).toContain('SonarCloud API error');
		});
	});

	describe('validateServiceToken', () => {
		beforeEach(() => {
			globalThis.fetch = vi.fn();
		});

		it('should route to GitHub validator', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ login: 'testuser', id: 123 })
			});

			const result = await validateServiceToken('github', 'token');

			expect(result.success).toBe(true);
			expect(result.authState.service).toBe('github');
		});

		it('should route to CircleCI validator', async () => {
			globalThis.fetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ name: 'Test', id: '123' })
			});

			const result = await validateServiceToken('circleci', 'token');

			expect(result.success).toBe(true);
			expect(result.authState.service).toBe('circleci');
		});

		it('should return error for unknown service', async () => {
			const result = await validateServiceToken('unknown', 'token');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Unknown service');
		});
	});

	describe('isAuthStateExpired', () => {
		it('should detect expired state', () => {
			const authState = {
				service: 'github',
				token: 'token',
				expiresAt: new Date(Date.now() - 1000) // expired 1 second ago
			};
			expect(isAuthStateExpired(authState)).toBe(true);
		});

		it('should detect non-expired state', () => {
			const authState = {
				service: 'github',
				token: 'token',
				expiresAt: new Date(Date.now() + 1000) // expires in 1 second
			};
			expect(isAuthStateExpired(authState)).toBe(false);
		});

		it('should handle state without expiration', () => {
			const authState = {
				service: 'github',
				token: 'token'
			};
			expect(isAuthStateExpired(authState)).toBeFalsy();
		});
	});

	describe('formatAuthError', () => {
		it('should format 401 errors', () => {
			const error = formatAuthError('github', '401 Unauthorized');
			expect(error).toContain('Invalid GitHub token');
		});

		it('should format 403 errors', () => {
			const error = formatAuthError('circleci', '403 Forbidden');
			expect(error).toContain('Insufficient permissions');
		});

		it('should format rate limit errors', () => {
			const error = formatAuthError('github', '429 rate limit exceeded');
			expect(error).toContain('rate limit exceeded');
		});

		it('should format network errors', () => {
			const error = formatAuthError('doppler', 'network');
			expect(error).toContain('Network error connecting to Doppler');
		});

		it('should format generic errors', () => {
			const error = formatAuthError('sonarcloud', 'Something went wrong');
			expect(error).toContain('SonarCloud authentication failed');
		});

		it('should handle unknown service names', () => {
			const error = formatAuthError('unknown', 'Some error');
			expect(error).toContain('unknown authentication failed');
		});
	});
});
