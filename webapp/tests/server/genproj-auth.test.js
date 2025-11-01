import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = {
	getAuthenticationState: vi.fn(),
	createAuthenticationState: vi.fn(),
	updateAuthenticationState: vi.fn()
};

vi.mock('../../src/lib/server/genproj-database.js', () => ({
	genprojDb: mockDb
}));

import { GenprojAuthManager } from '../../src/lib/server/genproj-auth.js';

describe('GenprojAuthManager', () => {
	let manager;
	const user = {
		id: 'user-1',
		email: 'test@example.com',
		name: 'Test User',
		expiresAt: '2099-01-01T00:00:00Z'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		manager = new GenprojAuthManager();
	});

	it('initializes authentication state for new user', async () => {
		const initialState = {
			google: { authenticated: true }
		};

		mockDb.getAuthenticationState
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(initialState);
		mockDb.createAuthenticationState.mockResolvedValue(true);

		const result = await manager.initialize(user);

		expect(result).toBe(true);
		expect(mockDb.createAuthenticationState).toHaveBeenCalledWith(user.id, {
			google: {
				authenticated: true,
				email: user.email,
				name: user.name,
				expiresAt: user.expiresAt
			}
		});
		expect(manager.isGoogleAuthenticated()).toBe(true);
	});

	it('returns false when no authenticated user provided', async () => {
		const result = await manager.initialize(null);
		expect(result).toBe(false);
	});

	it('handles initialization errors gracefully', async () => {
		mockDb.getAuthenticationState.mockRejectedValue(new Error('db failure'));
		const result = await manager.initialize(user);
		expect(result).toBe(false);
	});

	it('updates authentication providers and tracks state', async () => {
		mockDb.getAuthenticationState
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({
				google: { authenticated: true }
			});
		mockDb.createAuthenticationState.mockResolvedValue(true);

		await manager.initialize(user);

		mockDb.updateAuthenticationState.mockResolvedValue(true);
		mockDb.getAuthenticationState
			.mockResolvedValueOnce({
				google: { authenticated: true },
				github: { authenticated: true }
			})
			.mockResolvedValueOnce({
				google: { authenticated: true },
				github: { authenticated: true },
				circleci: { authenticated: true }
			})
			.mockResolvedValueOnce({
				google: { authenticated: true },
				github: { authenticated: true },
				circleci: { authenticated: true },
				doppler: { authenticated: true }
			})
			.mockResolvedValueOnce({
				google: { authenticated: true },
				github: { authenticated: true },
				circleci: { authenticated: true },
				doppler: { authenticated: true },
				sonarcloud: { authenticated: true }
			});

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
		expect(status.authenticated).toEqual(['github']);
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

		expect(await manager.clearAuthState()).toBe(true);
		expect(manager.currentUser).toBeNull();
		expect(manager.authState).toBeNull();
	});
});
