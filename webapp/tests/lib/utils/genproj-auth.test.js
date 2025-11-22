import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenprojAuthManager, createGenprojAuth } from '$lib/server/genproj-auth.js';

// Mock dependencies
vi.mock('$lib/config/capabilities.js', () => ({
	getRequiredAuthServices: vi.fn((caps) => {
		const services = new Set();
		if (caps.includes('circleci')) services.add('circleci');
		if (caps.includes('doppler')) services.add('doppler');
		if (caps.includes('sonarcloud')) services.add('sonarcloud');
		if (caps.includes('github-actions')) services.add('github');
		return [...services];
	})
}));

describe('GenprojAuthManager', () => {
	let mockKv;
	let authManager;
	let mockPlatform;
	const mockUser = {
		id: 'user-123',
		email: 'test@example.com',
		name: 'Test User',
		expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
	};
	const authStateKey = `genproj_auth_${mockUser.id}`;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});

		// Mock KV store
		const kvStore = new Map();
		mockKv = {
			get: vi.fn(async (key) => kvStore.get(key)),
			put: vi.fn(async (key, value) => kvStore.set(key, value)),
			delete: vi.fn(async (key) => kvStore.delete(key))
		};

		mockPlatform = {
			env: {
				KV: mockKv
			}
		};

		authManager = new GenprojAuthManager();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Initialization', () => {
		it('should initialize platform and set KV store', () => {
			authManager.initializePlatform(mockPlatform);
			expect(authManager.kv).toBe(mockKv);
		});

		it('should fail to initialize if KV is not available', async () => {
			const result = await authManager.initialize(mockUser);
			expect(result).toBe(false);
			expect(console.error).toHaveBeenCalledWith(expect.stringContaining('KV not initialized'));
		});

		it('should fail to initialize if no user is provided', async () => {
			authManager.initializePlatform(mockPlatform);
			const result = await authManager.initialize(null);
			expect(result).toBe(false);
			expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No authenticated user'));
		});

		it('should create and save a new auth state if one does not exist', async () => {
			authManager.initializePlatform(mockPlatform);
			const result = await authManager.initialize(mockUser);

			expect(result).toBe(true);
			expect(mockKv.get).toHaveBeenCalledWith(authStateKey);
			expect(mockKv.put).toHaveBeenCalledWith(authStateKey, expect.any(String), {
				expiration: expect.any(Number)
			});
			expect(authManager.isGoogleAuthenticated()).toBe(true);
		});

		it('should load an existing auth state from KV', async () => {
			const existingState = { google: { authenticated: true }, github: { authenticated: true } };
			mockKv.get.mockResolvedValue(JSON.stringify(existingState));

			authManager.initializePlatform(mockPlatform);
			const result = await authManager.initialize(mockUser);

			expect(result).toBe(true);
			expect(mockKv.get).toHaveBeenCalledWith(authStateKey);
			expect(mockKv.put).not.toHaveBeenCalled();
			expect(authManager.isGitHubAuthenticated()).toBe(true);
		});

		it('should handle errors during initialization', async () => {
			mockKv.get.mockRejectedValue(new Error('KV get failed'));
			mockKv.put.mockRejectedValue(new Error('KV put failed'));
			authManager.initializePlatform(mockPlatform);

			const result = await authManager.initialize(mockUser);
			expect(result).toBe(false);
			expect(console.error).toHaveBeenCalledWith(
				'❌ Failed to get authentication state from KV:',
				expect.any(Error)
			);
			expect(console.error).toHaveBeenCalledWith('❌ Failed to save authentication state to KV');
		});
	});

	describe('Authentication State Management', () => {
		beforeEach(async () => {
			await authManager.initialize(mockUser, mockPlatform);
		});

		it('should correctly report Google authentication status', () => {
			expect(authManager.isGoogleAuthenticated()).toBe(true);
		});

		it('should correctly report other services as not authenticated initially', () => {
			expect(authManager.isGitHubAuthenticated()).toBe(false);
			expect(authManager.isCircleCIAuthenticated()).toBe(false);
			expect(authManager.isDopplerAuthenticated()).toBe(false);
			expect(authManager.isSonarCloudAuthenticated()).toBe(false);
		});

		it('should get the current auth state summary', () => {
			const state = authManager.getAuthState();
			expect(state.user).toEqual(mockUser);
			expect(state.google).toBe(true);
			expect(state.github).toBe(false);
		});

		it('should clear the entire auth state', async () => {
			await authManager.clearAuthState();
			expect(mockKv.delete).toHaveBeenCalledWith(authStateKey);
			expect(authManager.currentUser).toBeNull();
			expect(authManager.authState).toBeNull();
		});

		it('should handle clearing auth state when not initialized', async () => {
			const newManager = new GenprojAuthManager();
			const result = await newManager.clearAuthState();
			expect(result).toBe(true);
			expect(mockKv.delete).not.toHaveBeenCalled();
		});
	});

	describe('Service Authentication Updates', () => {
		const githubAuth = {
			username: 'gh-user',
			token: 'gh-token',
			expiresAt: new Date(Date.now() + 3600 * 1000)
		};
		const circleciAuth = { token: 'cc-token' };
		const dopplerAuth = { token: 'dp-token' };
		const sonarcloudAuth = { token: 'sc-token' };

		beforeEach(async () => {
			await authManager.initialize(mockUser, mockPlatform);
		});

		it('should update and save GitHub auth', async () => {
			const result = await authManager.updateGitHubAuth(githubAuth);
			expect(result).toBe(true);
			expect(authManager.isGitHubAuthenticated()).toBe(true);
			expect(authManager.getGitHubAuth().username).toBe('gh-user');
			expect(mockKv.put).toHaveBeenCalledTimes(2); // Initial + update
		});

		it('should update and save CircleCI auth', async () => {
			const result = await authManager.updateCircleCIAuth(circleciAuth);
			expect(result).toBe(true);
			expect(authManager.isCircleCIAuthenticated()).toBe(true);
			expect(authManager.getCircleCIAuth().token).toBe('cc-token');
		});

		it('should update and save Doppler auth', async () => {
			const result = await authManager.updateDopplerAuth(dopplerAuth);
			expect(result).toBe(true);
			expect(authManager.isDopplerAuthenticated()).toBe(true);
			expect(authManager.getDopplerAuth().token).toBe('dp-token');
		});

		it('should update and save SonarCloud auth', async () => {
			const result = await authManager.updateSonarCloudAuth(sonarcloudAuth);
			expect(result).toBe(true);
			expect(authManager.isSonarCloudAuthenticated()).toBe(true);
			expect(authManager.getSonarCloudAuth().token).toBe('sc-token');
		});

		it('should fail to update auth if not initialized', async () => {
			const newManager = new GenprojAuthManager();
			const result = await newManager.updateGitHubAuth(githubAuth);
			expect(result).toBe(false);
			expect(console.error).toHaveBeenCalledWith('❌ No authenticated user for GitHub auth update');
		});

		it('should clear only GitHub auth state', async () => {
			await authManager.updateGitHubAuth(githubAuth);
			expect(authManager.isGitHubAuthenticated()).toBe(true);

			const result = await authManager.clearGitHubAuth();
			expect(result).toBe(true);
			expect(authManager.isGitHubAuthenticated()).toBe(false);
			expect(mockKv.put).toHaveBeenCalledTimes(3); // init, update, clear
		});

		it('should handle clearing GitHub auth when it does not exist', async () => {
			const result = await authManager.clearGitHubAuth();
			expect(result).toBe(true);
			expect(console.log).toHaveBeenCalledWith(
				'⚠️ GitHub authentication not found for user:',
				mockUser.email
			);
		});

		it('should fail to clear GitHub auth if not initialized', async () => {
			const newManager = new GenprojAuthManager();
			const result = await newManager.clearGitHubAuth();
			expect(result).toBe(false);
			expect(console.error).toHaveBeenCalledWith(
				'❌ No authenticated user to clear GitHub auth for'
			);
		});
	});

	describe('Required Authentication Checks', () => {
		beforeEach(async () => {
			await authManager.initialize(mockUser, mockPlatform);
		});

		it('should return no required services for an empty capabilities list', () => {
			const required = authManager.getRequiredAuthServices([]);
			expect(required).toEqual([]);
		});

		it('should correctly identify required auth services from capabilities', async () => {
			const { getRequiredAuthServices } = await import('$lib/config/capabilities.js');
			const capabilities = ['circleci', 'sonarcloud', 'some-other-cap'];
			const required = authManager.getRequiredAuthServices(capabilities);

			expect(getRequiredAuthServices).toHaveBeenCalledWith(capabilities);
			expect(required).toContain('circleci');
			expect(required).toContain('sonarcloud');
			expect(required).not.toContain('github');
		});

		it('should require github for github-actions capability', () => {
			const required = authManager.getRequiredAuthServices(['github-actions']);
			expect(required).toEqual(['github']);
		});

		it('should report all authenticated when no services are required', () => {
			const status = authManager.checkRequiredAuth([]);
			expect(status.allAuthenticated).toBe(true);
			expect(status.missing).toEqual([]);
		});

		it('should report missing services when they are not authenticated', () => {
			const status = authManager.checkRequiredAuth(['circleci', 'github-actions']);
			expect(status.allAuthenticated).toBe(false);
			expect(status.missing).toEqual(['circleci', 'github']);
			expect(status.authenticated).toEqual([]);
		});

		it('should correctly report a mix of authenticated and missing services', async () => {
			await authManager.updateGitHubAuth({ token: 'gh-token' });
			const status = authManager.checkRequiredAuth(['circleci', 'github-actions']);

			expect(status.allAuthenticated).toBe(false);
			expect(status.missing).toEqual(['circleci']);
			expect(status.authenticated).toEqual(['github']);
		});

		it('should report all authenticated when all required services are present', async () => {
			await authManager.updateGitHubAuth({ token: 'gh-token' });
			await authManager.updateCircleCIAuth({ token: 'cc-token' });
			const status = authManager.checkRequiredAuth(['circleci', 'github-actions']);

			expect(status.allAuthenticated).toBe(true);
			expect(status.missing).toEqual([]);
			expect(status.authenticated.sort()).toEqual(['github', 'circleci'].sort());
		});
	});

	describe('Utility Functions', () => {
		it('getAuthStateKey should return the correct KV key', () => {
			const key = authManager.getAuthStateKey('test-user');
			expect(key).toBe('genproj_auth_test-user');
		});

		it('calculateExpirationTtl should use user expiration if available', () => {
			const future = Date.now() + 1000 * 60 * 30; // 30 minutes
			const userWithExpiry = { expiresAt: new Date(future).toISOString() };
			const ttl = authManager.calculateExpirationTtl(userWithExpiry);
			expect(ttl).toBeGreaterThan(1798);
			expect(ttl).toBeLessThanOrEqual(1800);
		});

		it('calculateExpirationTtl should use default TTL if user expiration is not available', () => {
			const userWithoutExpiry = {};
			const ttl = authManager.calculateExpirationTtl(userWithoutExpiry, 7200);
			expect(ttl).toBe(7200);
		});

		it('createInitialAuthState should return the correct initial state object', () => {
			const state = authManager.createInitialAuthState(mockUser);
			expect(state.google.authenticated).toBe(true);
			expect(state.google.email).toBe(mockUser.email);
			expect(state.github).toBeNull();
			expect(state.circleci).toBeNull();
			expect(state.doppler).toBeNull();
			expect(state.sonarcloud).toBeNull();
		});
	});

	describe('Factory Function', () => {
		it('createGenprojAuth should return an instance of GenprojAuthManager with platform initialized', () => {
			const factoryAuth = createGenprojAuth(mockPlatform);
			expect(factoryAuth).toBeInstanceOf(GenprojAuthManager);
			expect(factoryAuth.kv).toBe(mockKv);
		});
	});

	describe('Error Handling in KV Operations', () => {
		it('getAuthenticationState should return null on KV error', async () => {
			mockKv.get.mockRejectedValue(new Error('Get failed'));
			authManager.initializePlatform(mockPlatform);
			const state = await authManager.getAuthenticationState('user-123');
			expect(state).toBeNull();
			expect(console.error).toHaveBeenCalledWith(
				'❌ Failed to get authentication state from KV:',
				expect.any(Error)
			);
		});

		it('saveAuthenticationState should return false on KV error', async () => {
			mockKv.put.mockRejectedValue(new Error('Put failed'));
			authManager.initializePlatform(mockPlatform);
			const saved = await authManager.saveAuthenticationState('user-123', {});
			expect(saved).toBe(false);
			expect(console.error).toHaveBeenCalledWith(
				'❌ Failed to save authentication state to KV:',
				expect.any(Error)
			);
		});

		it('clearAuthState should return false on KV error', async () => {
			mockKv.delete.mockRejectedValue(new Error('Delete failed'));
			await authManager.initialize(mockUser, mockPlatform);
			const cleared = await authManager.clearAuthState();
			expect(cleared).toBe(false);
			expect(console.error).toHaveBeenCalledWith(
				'❌ Failed to clear authentication state:',
				expect.any(Error)
			);
		});
	});
});