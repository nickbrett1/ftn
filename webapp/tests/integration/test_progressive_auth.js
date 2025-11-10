/**
 * @fileoverview Integration test for progressive authentication flow
 * @description Tests the complete authentication flow for project generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GenprojAuthManager } from '$lib/server/genproj-auth.js';

describe('Progressive Authentication Flow Integration', () => {
	let authManager;
	let mockUser;
	let mockPlatform;
	let mockKV;

	beforeEach(() => {
		authManager = new GenprojAuthManager();
		mockUser = {
			id: 'test-user-123',
			email: 'test@example.com',
			name: 'Test User'
		};
		mockKV = {
			get: vi.fn(),
			put: vi.fn(),
			delete: vi.fn()
		};
		mockPlatform = {
			env: {
				KV: mockKV
			}
		};
		authManager.initializePlatform(mockPlatform);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with Google authentication', async () => {
		// Arrange
		mockKV.get.mockResolvedValueOnce(null); // No existing state
		mockKV.put.mockResolvedValueOnce(); // Save new state

		// Act
		const initialized = await authManager.initialize(mockUser, mockPlatform);

		// Assert
		expect(initialized).toBe(true);
		expect(authManager.isGoogleAuthenticated()).toBe(true);
		expect(mockKV.put).toHaveBeenCalledWith(
			`genproj_auth_${mockUser.id}`,
			expect.stringContaining('"google"'),
			expect.objectContaining({ expiration: expect.any(Number) })
		);
	});

	it('should check required auth services for selected capabilities', () => {
		// Arrange
		authManager.currentUser = mockUser;
		authManager.authState = {
			google: { authenticated: true }
		};

		const selectedCapabilities = ['circleci', 'doppler'];

		// Act
		const required = authManager.getRequiredAuthServices(selectedCapabilities);

		// Assert
		expect(required).toContain('circleci');
		expect(required).toContain('doppler');
	});

	it('should identify missing authentication services', () => {
		// Arrange
		authManager.currentUser = mockUser;
		authManager.authState = {
			google: { authenticated: true },
			github: { authenticated: true },
			circleci: null,
			doppler: null
		};

		const selectedCapabilities = ['circleci', 'doppler'];

		// Act
		const status = authManager.checkRequiredAuth(selectedCapabilities);

		// Assert
		expect(status.allAuthenticated).toBe(false);
		expect(status.missing).toContain('circleci');
		expect(status.missing).toContain('doppler');
	});

	it('should confirm all services authenticated when complete', () => {
		// Arrange
		authManager.currentUser = mockUser;
		authManager.authState = {
			google: { authenticated: true },
			github: { authenticated: true },
			circleci: { authenticated: true },
			doppler: { authenticated: true }
		};

		const selectedCapabilities = ['circleci', 'doppler'];

		// Act
		const status = authManager.checkRequiredAuth(selectedCapabilities);

		// Assert
		expect(status.allAuthenticated).toBe(true);
		expect(status.missing.length).toBe(0);
	});

	it('should update GitHub authentication state', async () => {
		// Arrange
		authManager.currentUser = mockUser;
		const existingState = {
			google: { authenticated: true, email: mockUser.email, name: mockUser.name }
		};
		mockKV.get.mockResolvedValueOnce(JSON.stringify(existingState));
		mockKV.put.mockResolvedValueOnce();

		const githubAuth = {
			username: 'testuser',
			token: 'test-github-token',
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			scopes: ['repo', 'user:email']
		};

		// Act
		const updated = await authManager.updateGitHubAuth(githubAuth);

		// Assert
		expect(updated).toBe(true);
		expect(authManager.isGitHubAuthenticated()).toBe(true);
		expect(mockKV.put).toHaveBeenCalledWith(
			`genproj_auth_${mockUser.id}`,
			expect.stringContaining('"github"'),
			expect.objectContaining({ expiration: expect.any(Number) })
		);
	});

	it('should handle authentication state persistence', async () => {
		// Arrange
		const existingState = {
			google: { authenticated: true, email: mockUser.email, name: mockUser.name },
			github: { authenticated: true }
		};
		mockKV.get.mockResolvedValueOnce(JSON.stringify(existingState));

		// Act
		await authManager.initialize(mockUser, mockPlatform);

		// Assert
		expect(authManager.isGoogleAuthenticated()).toBe(true);
		expect(authManager.isGitHubAuthenticated()).toBe(true);
	});

	it('should return current authentication state', () => {
		// Arrange
		authManager.currentUser = mockUser;
		authManager.authState = {
			google: { authenticated: true },
			github: { authenticated: true },
			circleci: null,
			doppler: { authenticated: true },
			sonarcloud: null
		};

		// Act
		const state = authManager.getAuthState();

		// Assert
		expect(state.google).toBe(true);
		expect(state.github).toBe(true);
		expect(state.doppler).toBe(true);
		expect(state.circleci).toBe(false);
		expect(state.sonarcloud).toBe(false);
	});
});
