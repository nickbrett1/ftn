/**
 * @fileoverview Authentication state management extending existing Google auth
 * @description Manages authentication state for genproj feature across multiple services
 */

import { getRequiredAuthServices as resolveRequiredAuthServices } from '../config/capabilities.js';

/**
 * Authentication state manager for genproj feature
 * Uses KV storage (similar to Google auth) instead of D1 database
 */
export class GenprojAuthManager {
	currentUser = null;
	authState = null;
	kv = null;

	/**
	 * Initialize with platform (required before using other methods)
	 * @param {Object} platform - Platform object with env
	 */
	initializePlatform(platform) {
		this.kv = platform?.env?.KV || null;
	}

	/**
	 * Get KV key for user's auth state
	 * @param {string} userId - User ID
	 * @returns {string} KV key
	 */
	getAuthStateKey(userId) {
		return `genproj_auth_${userId}`;
	}

	/**
	 * Calculate expiration TTL based on user expiration or default
	 * @param {Object} user - User object with optional expiresAt
	 * @param {number} defaultTtl - Default TTL in seconds (default: 3600)
	 * @returns {number} TTL in seconds
	 */
	calculateExpirationTtl(user, defaultTtl = 3600) {
		if (user?.expiresAt) {
			return Math.floor((new Date(user.expiresAt).getTime() - Date.now()) / 1000);
		}
		return defaultTtl;
	}

	/**
	 * Create initial authentication state for a user
	 * @param {Object} user - User object
	 * @returns {Object} Initial auth state
	 */
	createInitialAuthState(user) {
		return {
			google: {
				authenticated: true,
				email: user.email,
				name: user.name,
				expiresAt: user.expiresAt
			},
			github: null,
			circleci: null,
			doppler: null,
			sonarcloud: null
		};
	}

	/**
	 * Get authentication state from KV
	 * @param {string} userId - User ID
	 * @returns {Promise<Object|null>} Authentication state
	 */
	async getAuthenticationState(userId) {
		if (!this.kv) {
			return null;
		}

		try {
			const key = this.getAuthStateKey(userId);
			const stored = await this.kv.get(key);
			if (!stored) {
				return null;
			}
			return JSON.parse(stored);
		} catch (error) {
			console.error('❌ Failed to get authentication state from KV:', error);
			return null;
		}
	}

	/**
	 * Save authentication state to KV
	 * @param {string} userId - User ID
	 * @param {Object} authState - Authentication state
	 * @param {number} [expirationTtl] - Expiration time in seconds (default: 1 hour)
	 * @returns {Promise<boolean>} True if saved successfully
	 */
	async saveAuthenticationState(userId, authState, expirationTtl = 3600) {
		if (!this.kv) {
			console.error('❌ KV not initialized');
			return false;
		}

		try {
			const key = this.getAuthStateKey(userId);
			const expiration = Math.floor(Date.now() / 1000) + expirationTtl;
			await this.kv.put(key, JSON.stringify(authState), { expiration });
			return true;
		} catch (error) {
			console.error('❌ Failed to save authentication state to KV:', error);
			return false;
		}
	}

	/**
	 * Initialize authentication state
	 * @param {Object} user - Current user from existing Google auth
	 * @param {Object} platform - Platform object with env (optional if already initialized)
	 * @returns {Promise<boolean>} True if initialized successfully
	 */
	async initialize(user, platform = null) {
		// Initialize platform if provided
		if (platform && !this.kv) {
			this.initializePlatform(platform);
		}

		if (!this.kv) {
			console.error(
				'❌ KV not initialized. Call initializePlatform() or pass platform to initialize()'
			);
			return false;
		}

		if (!user?.id) {
			console.log('⚠️ No authenticated user found');
			return false;
		}

		this.currentUser = user;

		try {
			this.authState = await this.getAuthenticationState(user.id);

			// Create auth state if it doesn't exist
			if (!this.authState) {
				this.authState = this.createInitialAuthState(user);
				const expirationTtl = this.calculateExpirationTtl(user);
				const saved = await this.saveAuthenticationState(user.id, this.authState, expirationTtl);
				if (!saved) {
					console.error('❌ Failed to save authentication state to KV');
					return false;
				}
			}

			console.log('✅ Genproj authentication initialized for user:', user.email);
			return true;
		} catch (error) {
			console.error('❌ Failed to get/save authentication state:', error);
			return false;
		}
	}

	/**
	 * Check if user is authenticated with Google
	 * @returns {boolean} True if authenticated
	 */
	isGoogleAuthenticated() {
		return this.currentUser?.id && this.authState?.google?.authenticated;
	}

	/**
	 * Check if user is authenticated with GitHub
	 * @returns {boolean} True if authenticated
	 */
	isGitHubAuthenticated() {
		return this.authState?.github?.authenticated === true;
	}

	/**
	 * Check if user is authenticated with CircleCI
	 * @returns {boolean} True if authenticated
	 */
	isCircleCIAuthenticated() {
		return this.authState?.circleci?.authenticated === true;
	}

	/**
	 * Check if user is authenticated with Doppler
	 * @returns {boolean} True if authenticated
	 */
	isDopplerAuthenticated() {
		return this.authState?.doppler?.authenticated === true;
	}

	/**
	 * Check if user is authenticated with SonarCloud
	 * @returns {boolean} True if authenticated
	 */
	isSonarCloudAuthenticated() {
		return this.authState?.sonarcloud?.authenticated === true;
	}

	/**
	 * Get GitHub authentication info
	 * @returns {Object|null} GitHub auth info
	 */
	getGitHubAuth() {
		return this.authState?.github || null;
	}

	/**
	 * Get CircleCI authentication info
	 * @returns {Object|null} CircleCI auth info
	 */
	getCircleCIAuth() {
		return this.authState?.circleci || null;
	}

	/**
	 * Get Doppler authentication info
	 * @returns {Object|null} Doppler auth info
	 */
	getDopplerAuth() {
		return this.authState?.doppler || null;
	}

	/**
	 * Get SonarCloud authentication info
	 * @returns {Object|null} SonarCloud auth info
	 */
	getSonarCloudAuth() {
		return this.authState?.sonarcloud || null;
	}

	/**
	 * Update GitHub authentication
	 * @param {Object} githubAuth - GitHub authentication data
	 * @returns {Promise<boolean>} True if updated successfully
	 */
	async updateGitHubAuth(githubAuth) {
		try {
			if (!this.currentUser?.id) {
				console.error('❌ No authenticated user for GitHub auth update');
				return false;
			}

			if (!this.kv) {
				console.error('❌ KV not initialized');
				return false;
			}

			// Update auth state
			if (!this.authState) {
				this.authState = await this.getAuthenticationState(this.currentUser.id);
			}

			if (!this.authState) {
				console.error('❌ No existing auth state found');
				return false;
			}

			this.authState.github = {
				authenticated: true,
				username: githubAuth.username,
				token: githubAuth.token, // This should be encrypted in production
				expiresAt: githubAuth.expiresAt,
				scopes: githubAuth.scopes || []
			};

			// Save to KV with expiration based on token expiration
			const expirationTtl = githubAuth.expiresAt
				? Math.floor((new Date(githubAuth.expiresAt).getTime() - Date.now()) / 1000)
				: 3600;
			const saved = await this.saveAuthenticationState(
				this.currentUser.id,
				this.authState,
				expirationTtl
			);

			if (saved) {
				console.log('✅ GitHub authentication updated for user:', this.currentUser.email);
			}

			return saved;
		} catch (error) {
			console.error('❌ Failed to update GitHub authentication:', error);
			return false;
		}
	}

	/**
	 * Update CircleCI authentication
	 * @param {Object} circleciAuth - CircleCI authentication data
	 * @returns {Promise<boolean>} True if updated successfully
	 */
	async updateCircleCIAuth(circleciAuth) {
		try {
			if (!this.currentUser?.id) {
				console.error('❌ No authenticated user for CircleCI auth update');
				return false;
			}

			if (!this.kv) {
				console.error('❌ KV not initialized');
				return false;
			}

			// Update auth state
			if (!this.authState) {
				this.authState = await this.getAuthenticationState(this.currentUser.id);
			}

			if (!this.authState) {
				console.error('❌ No existing auth state found');
				return false;
			}

			this.authState.circleci = {
				authenticated: true,
				token: circleciAuth.token, // This should be encrypted in production
				expiresAt: circleciAuth.expiresAt
			};

			// Save to KV with expiration based on token expiration
			const expirationTtl = circleciAuth.expiresAt
				? Math.floor((new Date(circleciAuth.expiresAt).getTime() - Date.now()) / 1000)
				: 3600;
			const saved = await this.saveAuthenticationState(
				this.currentUser.id,
				this.authState,
				expirationTtl
			);

			if (saved) {
				console.log('✅ CircleCI authentication updated for user:', this.currentUser.email);
			}

			return saved;
		} catch (error) {
			console.error('❌ Failed to update CircleCI authentication:', error);
			return false;
		}
	}

	/**
	 * Update Doppler authentication
	 * @param {Object} dopplerAuth - Doppler authentication data
	 * @returns {Promise<boolean>} True if updated successfully
	 */
	async updateDopplerAuth(dopplerAuth) {
		try {
			if (!this.currentUser?.id) {
				console.error('❌ No authenticated user for Doppler auth update');
				return false;
			}

			if (!this.kv) {
				console.error('❌ KV not initialized');
				return false;
			}

			// Update auth state
			if (!this.authState) {
				this.authState = await this.getAuthenticationState(this.currentUser.id);
			}

			if (!this.authState) {
				console.error('❌ No existing auth state found');
				return false;
			}

			this.authState.doppler = {
				authenticated: true,
				token: dopplerAuth.token, // This should be encrypted in production
				expiresAt: dopplerAuth.expiresAt
			};

			// Save to KV with expiration based on token expiration
			const expirationTtl = dopplerAuth.expiresAt
				? Math.floor((new Date(dopplerAuth.expiresAt).getTime() - Date.now()) / 1000)
				: 3600;
			const saved = await this.saveAuthenticationState(
				this.currentUser.id,
				this.authState,
				expirationTtl
			);

			if (saved) {
				console.log('✅ Doppler authentication updated for user:', this.currentUser.email);
			}

			return saved;
		} catch (error) {
			console.error('❌ Failed to update Doppler authentication:', error);
			return false;
		}
	}

	/**
	 * Update SonarCloud authentication
	 * @param {Object} sonarcloudAuth - SonarCloud authentication data
	 * @returns {Promise<boolean>} True if updated successfully
	 */
	async updateSonarCloudAuth(sonarcloudAuth) {
		try {
			if (!this.currentUser?.id) {
				console.error('❌ No authenticated user for SonarCloud auth update');
				return false;
			}

			if (!this.kv) {
				console.error('❌ KV not initialized');
				return false;
			}

			// Update auth state
			if (!this.authState) {
				this.authState = await this.getAuthenticationState(this.currentUser.id);
			}

			if (!this.authState) {
				console.error('❌ No existing auth state found');
				return false;
			}

			this.authState.sonarcloud = {
				authenticated: true,
				token: sonarcloudAuth.token, // This should be encrypted in production
				expiresAt: sonarcloudAuth.expiresAt
			};

			// Save to KV with expiration based on token expiration
			const expirationTtl = sonarcloudAuth.expiresAt
				? Math.floor((new Date(sonarcloudAuth.expiresAt).getTime() - Date.now()) / 1000)
				: 3600;
			const saved = await this.saveAuthenticationState(
				this.currentUser.id,
				this.authState,
				expirationTtl
			);

			if (saved) {
				console.log('✅ SonarCloud authentication updated for user:', this.currentUser.email);
			}

			return saved;
		} catch (error) {
			console.error('❌ Failed to update SonarCloud authentication:', error);
			return false;
		}
	}

	/**
	 * Get required authentication services for capabilities
	 * @param {string[]} selectedCapabilities - Selected capability IDs
	 * @returns {string[]} Required authentication services
	 */
	getRequiredAuthServices(selectedCapabilities) {
		const required = new Set(resolveRequiredAuthServices(selectedCapabilities));

		if (selectedCapabilities.includes('github-actions')) {
			required.add('github');
		}

		return Array.from(required);
	}

	/**
	 * Check if all required services are authenticated
	 * @param {string[]} selectedCapabilities - Selected capability IDs
	 * @returns {Object} Authentication status
	 */
	checkRequiredAuth(selectedCapabilities) {
		const required = this.getRequiredAuthServices(selectedCapabilities);
		const authenticated = [];
		const missing = [];

		const checks = {
			github: () => this.isGitHubAuthenticated(),
			circleci: () => this.isCircleCIAuthenticated(),
			doppler: () => this.isDopplerAuthenticated(),
			sonarcloud: () => this.isSonarCloudAuthenticated()
		};

		for (const service of required) {
			const isAuthenticated = checks[service]?.();
			if (isAuthenticated) {
				authenticated.push(service);
			} else {
				missing.push(service);
			}
		}

		return {
			authenticated,
			missing,
			allAuthenticated: missing.length === 0
		};
	}

	/**
	 * Get current authentication state
	 * @returns {Object} Current authentication state
	 */
	getAuthState() {
		return {
			user: this.currentUser,
			google: this.isGoogleAuthenticated(),
			github: this.isGitHubAuthenticated(),
			circleci: this.isCircleCIAuthenticated(),
			doppler: this.isDopplerAuthenticated(),
			sonarcloud: this.isSonarCloudAuthenticated()
		};
	}

	/**
	 * Clear authentication state
	 * @returns {Promise<boolean>} True if cleared successfully
	 */
	async clearAuthState() {
		try {
			if (this.currentUser?.id && this.kv) {
				const key = this.getAuthStateKey(this.currentUser.id);
				await this.kv.delete(key);
			}
			this.currentUser = null;
			this.authState = null;
			console.log('✅ Genproj authentication state cleared');
			return true;
		} catch (error) {
			console.error('❌ Failed to clear authentication state:', error);
			return false;
		}
	}

	/**
	 * Clear GitHub authentication state
	 * @returns {Promise<boolean>} True if cleared successfully
	 */
	async clearGitHubAuth() {
		try {
			if (!this.currentUser?.id) {
				console.error('❌ No authenticated user to clear GitHub auth for');
				return false;
			}

			if (!this.kv) {
				console.error('❌ KV not initialized');
				return false;
			}

			// Load current auth state if not already loaded
			if (!this.authState) {
				this.authState = await this.getAuthenticationState(this.currentUser.id);
			}

			if (this.authState && this.authState.github) {
				this.authState.github = null;
				const saved = await this.saveAuthenticationState(this.currentUser.id, this.authState);
				if (saved) {
					console.log('✅ GitHub authentication state cleared for user:', this.currentUser.email);
				}
				return saved;
			} else {
				console.log('⚠️ GitHub authentication not found for user:', this.currentUser.email);
				return true; // Already cleared or never existed
			}
		} catch (error) {
			console.error('❌ Failed to clear GitHub authentication state:', error);
			return false;
		}
	}
}

// Export factory function to create auth manager with platform
export function createGenprojAuth(platform) {
	const auth = new GenprojAuthManager();
	auth.initializePlatform(platform);
	return auth;
}

// Export a default instance (will need platform set via initializePlatform)
// This is primarily for backward compatibility in route handlers
export const genprojAuth = new GenprojAuthManager();
