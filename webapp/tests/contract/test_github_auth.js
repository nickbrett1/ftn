/**
 * @fileoverview Contract test for GitHub OAuth endpoint
 * @description Tests the GitHub OAuth endpoint for project generation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('GitHub OAuth API Contract', () => {
	let githubAuthEndpoint;
	let githubCallbackEndpoint;

	beforeEach(() => {
		// Initialize test endpoints
		githubAuthEndpoint = '/projects/genproj/api/auth/github';
		githubCallbackEndpoint = '/projects/genproj/api/auth/github/callback';
	});

	afterEach(() => {
		// Cleanup
	});

	it('should accept GET requests to initiate GitHub OAuth', async () => {
		// Arrange
		const url = new URL(githubAuthEndpoint, 'http://localhost:5173');
		url.searchParams.set('state', 'test-state-123');

		// Act
		const response = await fetch(url.toString(), {
			method: 'GET'
		});

		// Assert
		expect(response).toBeDefined();
		// Should redirect to GitHub OAuth page
		expect([301, 302, 307, 308]).toContain(response.status);
		const location = response.headers.get('location');
		expect(location).toBeDefined();
		expect(location).toContain('github.com/login/oauth/authorize');
	});

	it('should include state parameter in GitHub OAuth URL', async () => {
		// Arrange
		const state = 'test-state-abc123';
		const url = new URL(githubAuthEndpoint, 'http://localhost:5173');
		url.searchParams.set('state', state);

		// Act
		const response = await fetch(url.toString(), {
			method: 'GET',
			redirect: 'manual'
		});

		// Assert
		const location = response.headers.get('location');
		expect(location).toBeDefined();
		const redirectUrl = new URL(location);
		expect(redirectUrl.searchParams.get('state')).toBe(state);
	});

	it('should accept GET requests to handle GitHub OAuth callback', async () => {
		// Arrange
		const url = new URL(githubCallbackEndpoint, 'http://localhost:5173');
		url.searchParams.set('code', 'test-code-123');
		url.searchParams.set('state', 'test-state-123');

		// Act
		const response = await fetch(url.toString(), {
			method: 'GET'
		});

		// Assert
		expect(response).toBeDefined();
		expect(response.status).toBeGreaterThanOrEqual(200);
		expect(response.status).toBeLessThan(500);
	});

	it('should return error if code is missing in callback', async () => {
		// Arrange
		const url = new URL(githubCallbackEndpoint, 'http://localhost:5173');
		url.searchParams.set('state', 'test-state-123');
		// No code parameter

		// Act
		const response = await fetch(url.toString(), {
			method: 'GET'
		});

		// Assert
		expect(response.status).toBeGreaterThanOrEqual(400);
		const data = await response.json().catch(() => null);
		if (data) {
			expect(data.error).toBeDefined();
		}
	});

	it('should return error if state is missing in callback', async () => {
		// Arrange
		const url = new URL(githubCallbackEndpoint, 'http://localhost:5173');
		url.searchParams.set('code', 'test-code-123');
		// No state parameter

		// Act
		const response = await fetch(url.toString(), {
			method: 'GET'
		});

		// Assert
		expect(response.status).toBeGreaterThanOrEqual(400);
		const data = await response.json().catch(() => null);
		if (data) {
			expect(data.error).toBeDefined();
		}
	});

	it('should validate state parameter matches stored state', async () => {
		// Arrange
		const state = 'test-state-xyz789';
		const authUrl = new URL(githubAuthEndpoint, 'http://localhost:5173');
		authUrl.searchParams.set('state', state);

		// Initiate auth to store state
		await fetch(authUrl.toString(), {
			method: 'GET',
			redirect: 'manual'
		});

		// Callback with different state
		const callbackUrl = new URL(githubCallbackEndpoint, 'http://localhost:5173');
		callbackUrl.searchParams.set('code', 'test-code-123');
		callbackUrl.searchParams.set('state', 'different-state');

		// Act
		const response = await fetch(callbackUrl.toString(), {
			method: 'GET'
		});

		// Assert
		expect(response.status).toBeGreaterThanOrEqual(400);
		const data = await response.json().catch(() => null);
		if (data) {
			expect(data.error).toContain('state');
		}
	});

	it('should include required OAuth scopes in GitHub authorization URL', async () => {
		// Arrange
		const url = new URL(githubAuthEndpoint, 'http://localhost:5173');
		url.searchParams.set('state', 'test-state-123');

		// Act
		const response = await fetch(url.toString(), {
			method: 'GET',
			redirect: 'manual'
		});

		// Assert
		const location = response.headers.get('location');
		const redirectUrl = new URL(location);
		const scope = redirectUrl.searchParams.get('scope');
		expect(scope).toBeDefined();
		expect(scope).toContain('repo');
		expect(scope).toContain('user:email');
	});
});
