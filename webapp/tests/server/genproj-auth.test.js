import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GenprojAuthManager } from '../../src/lib/server/genproj-auth.js';

describe('GenprojAuthManager', () => {
	let manager;
	let mockKV;
	let mockPlatform;
	const user = {
		id: 'user-1',
		email: 'test@example.com',
		name: 'Test User',
		expiresAt: '2099-01-01T00:00:00Z'
	};

	beforeEach(() => {
		mockKV = {
			get: vi.fn(),
			put: vi.fn(),
			delete: vi.fn()
		};
		mockPlatform = { env: { KV: mockKV } };
		vi.clearAllMocks();
		manager = new GenprojAuthManager();
		manager.initializePlatform(mockPlatform);
	});

	it('initializes authentication state for new user', async () => {
		// Mock KV to return null (no existing state), then save new state
		mockKV.get.mockResolvedValueOnce(null);
		mockKV.put.mockResolvedValueOnce(undefined);

		const result = await manager.initialize(user, mockPlatform);

		expect(result).toBe(true);
		expect(mockKV.put).toHaveBeenCalledWith(
			`genproj_auth_${user.id}`,
			expect.stringContaining('"google"'),
			expect.objectContaining({ expiration: expect.any(Number) })
		);
		expect(manager.isGoogleAuthenticated()).toBe(true);
	});

	it('returns false when no authenticated user provided', async () => {
		const result = await manager.initialize(null);
		expect(result).toBe(false);
	});

	it('handles initialization errors gracefully', async () => {
		// Mock KV.get to fail, which should be caught and return null
		mockKV.get.mockRejectedValue(new Error('KV failure'));
		// Mock KV.put to also fail, so save fails
		mockKV.put.mockRejectedValue(new Error('KV save failure'));
		const result = await manager.initialize(user, mockPlatform);
		expect(result).toBe(false);
	});

	it('updates authentication providers and tracks state', async () => {
		// Mock initial state retrieval (null - new user)
		mockKV.get.mockResolvedValueOnce(null);
		mockKV.put.mockResolvedValue(undefined);

		await manager.initialize(user, mockPlatform);

		// Mock existing auth state for updates
		const existingState = {
			google: { authenticated: true, email: user.email, name: user.name },
			github: null,
			circleci: null,
			doppler: null,
			sonarcloud: null
		};

		mockKV.get
			.mockResolvedValueOnce(JSON.stringify(existingState)) // For GitHub update
			.mockResolvedValueOnce(JSON.stringify({ ...existingState, github: { authenticated: true } })) // For CircleCI update
			.mockResolvedValueOnce(
				JSON.stringify({
					...existingState,
					github: { authenticated: true },
					circleci: { authenticated: true }
				})
			) // For Doppler update
			.mockResolvedValueOnce(
				JSON.stringify({
					...existingState,
					github: { authenticated: true },
					circleci: { authenticated: true },
					doppler: { authenticated: true }
				})
			); // For SonarCloud update

		expect(
			await manager.updateGitHubAuth({
				username: 'dev',
				token: 'token',
				expiresAt: '2099-01-01',
				scopes: ['repo']
			})
		).toBe(true);
		expect(manager.isGitHubAuthenticated()).toBe(true);

		expect(
			await manager.updateCircleCIAuth({
				token: 'circle',
				expiresAt: '2099-01-01'
			})
		).toBe(true);
		expect(manager.isCircleCIAuthenticated()).toBe(true);

		expect(
			await manager.updateDopplerAuth({
				token: 'doppler',
				expiresAt: '2099-01-01'
			})
		).toBe(true);
		expect(manager.isDopplerAuthenticated()).toBe(true);

		expect(
			await manager.updateSonarCloudAuth({
				token: 'sonar',
				expiresAt: '2099-01-01'
			})
		).toBe(true);
		expect(manager.isSonarCloudAuthenticated()).toBe(true);
	});

	it('exposes authentication details and handles missing user updates', async () => {
		manager.authState = {
			google: { authenticated: true },
			github: { authenticated: true, username: 'dev' },
			circleci: { authenticated: false },
			doppler: null,
			sonarcloud: undefined
		};

		expect(manager.getGitHubAuth()).toEqual({ authenticated: true, username: 'dev' });
		expect(manager.getCircleCIAuth()).toEqual({ authenticated: false });
		expect(manager.getDopplerAuth()).toBeNull();
		expect(manager.getSonarCloudAuth()).toBeNull();

		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const updateResult = await manager.updateGitHubAuth({ username: 'dev' });
		expect(updateResult).toBe(false);
		errorSpy.mockRestore();
	});

	it('handles update failures gracefully', async () => {
		manager.currentUser = user;
		manager.authState = {
			google: { authenticated: true }
		};
		mockKV.get.mockResolvedValueOnce(JSON.stringify(manager.authState));
		mockKV.put.mockRejectedValue(new Error('KV failure'));

		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = await manager.updateDopplerAuth({ token: 'x', expiresAt: '2099-01-01' });
		expect(result).toBe(false);
		errorSpy.mockRestore();
	});

	it('reports required authentication and missing providers', () => {
		manager.currentUser = user;
		manager.authState = {
			google: { authenticated: true },
			github: { authenticated: true },
			circleci: { authenticated: false },
			doppler: null,
			sonarcloud: null
		};

		const required = manager.getRequiredAuthServices([
			'circleci',
			'doppler',
			'sonarcloud',
			'github-actions'
		]);
		expect(required.sort()).toEqual(['circleci', 'doppler', 'github', 'sonarcloud']);

		const status = manager.checkRequiredAuth(['circleci', 'doppler', 'sonarcloud']);
		expect(status.authenticated).toEqual([]);
		expect(status.missing.sort()).toEqual(['circleci', 'doppler', 'sonarcloud']);
		expect(status.allAuthenticated).toBe(false);
	});

	it('returns current auth state and can be cleared', async () => {
		manager.currentUser = user;
		manager.authState = {
			google: { authenticated: true },
			github: { authenticated: true }
		};

		const state = manager.getAuthState();
		expect(state.google).toBe(true);
		expect(state.github).toBe(true);

		mockKV.delete.mockResolvedValue(undefined);
		expect(await manager.clearAuthState()).toBe(true);
		expect(manager.currentUser).toBeNull();
		expect(manager.authState).toBeNull();
		expect(mockKV.delete).toHaveBeenCalledWith(`genproj_auth_${user.id}`);
	});
});
