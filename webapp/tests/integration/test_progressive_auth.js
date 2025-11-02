/**
 * @fileoverview Integration test for progressive authentication flow
 * @description Tests the complete authentication flow for project generation
 */

/* eslint-disable max-nested-callbacks */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GenprojAuthManager } from '$lib/server/genproj-auth.js';
import { genprojDb } from '$lib/server/genproj-database.js';

describe('Progressive Authentication Flow Integration', () => {
	let authManager;
	let mockUser;
	let mockPlatform;

	beforeEach(() => {
		authManager = new GenprojAuthManager();
		mockUser = {
			id: 'test-user-123',
			email: 'test@example.com',
			name: 'Test User'
		};
		mockPlatform = {
			env: {
				DB_GENPROJ: {
					prepare: vi.fn(() => ({
						bind: vi.fn(() => ({
							first: vi.fn(() => Promise.resolve(null)),
							all: vi.fn(() => Promise.resolve({ results: [] })),
							run: vi.fn(() => Promise.resolve({ changes: 1 }))
						}))
					}))
				}
			}
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with Google authentication', async () => {
		// Arrange
		genprojDb.db = mockPlatform.env.DB_GENPROJ;

		// Act
		const initialized = await authManager.initialize(mockUser);

		// Assert
		expect(initialized).toBe(true);
		expect(authManager.isGoogleAuthenticated()).toBe(true);
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
		authManager.authState = {
			google: { authenticated: true }
		};
		genprojDb.db = mockPlatform.env.DB_GENPROJ;

		const githubAuth = {
			username: 'testuser',
			token: 'test-github-token',
			expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			scopes: ['repo', 'user:email']
		};

		// Mock successful database update
		mockPlatform.env.DB_GENPROJ.prepare = vi.fn(() => ({
			bind: vi.fn(() => ({
				first: vi.fn(() =>
					Promise.resolve({
						user_id: mockUser.id,
						google_auth: JSON.stringify({ authenticated: true }),
						github_auth: JSON.stringify({
							authenticated: true,
							username: githubAuth.username,
							token: githubAuth.token
						}),
						circleci_auth: null,
						doppler_auth: null,
						sonarcloud_auth: null
					})
				),
				run: vi.fn(() => Promise.resolve({ changes: 1 }))
			}))
		}));

		// Act
		const updated = await authManager.updateGitHubAuth(githubAuth);

		// Assert
		expect(updated).toBe(true);
		expect(authManager.isGitHubAuthenticated()).toBe(true);
	});

	it('should handle authentication state persistence', async () => {
		// Arrange
		genprojDb.db = mockPlatform.env.DB_GENPROJ;

		// Mock existing auth state
		mockPlatform.env.DB_GENPROJ.prepare = vi.fn(() => ({
			bind: vi.fn(() => ({
				first: vi.fn(() =>
					Promise.resolve({
						user_id: mockUser.id,
						google_auth: JSON.stringify({ authenticated: true }),
						github_auth: JSON.stringify({ authenticated: true }),
						circleci_auth: null,
						doppler_auth: null,
						sonarcloud_auth: null
					})
				),
				run: vi.fn(() => Promise.resolve({ changes: 1 }))
			}))
		}));

		// Act
		await authManager.initialize(mockUser);

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
