/**
 * @fileoverview Authentication state management extending existing Google auth
 * @description Manages authentication state for genproj feature across multiple services
 */

import { genprojDb } from './genproj-database.js';

/**
 * Authentication state manager for genproj feature
 */
export class GenprojAuthManager {
  constructor() {
    this.currentUser = null;
    this.authState = null;
  }

  /**
   * Initialize authentication state
   * @param {Object} user - Current user from existing Google auth
   * @returns {Promise<boolean>} True if initialized successfully
   */
  async initialize(user) {
    try {
      this.currentUser = user;
      
      if (user?.id) {
        this.authState = await genprojDb.getAuthenticationState(user.id);
        
        // Create auth state if it doesn't exist
        if (!this.authState) {
          await genprojDb.createAuthenticationState(user.id, {
            google: {
              authenticated: true,
              email: user.email,
              name: user.name,
              expiresAt: user.expiresAt,
            },
          });
          this.authState = await genprojDb.getAuthenticationState(user.id);
        }
        
        console.log('✅ Genproj authentication initialized for user:', user.email);
        return true;
      } else {
        console.log('⚠️ No authenticated user found');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize genproj authentication:', error);
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

      const updated = await genprojDb.updateAuthenticationState(this.currentUser.id, {
        github: {
          authenticated: true,
          username: githubAuth.username,
          token: githubAuth.token, // This should be encrypted in production
          expiresAt: githubAuth.expiresAt,
          scopes: githubAuth.scopes || [],
        },
      });

      if (updated) {
        this.authState = await genprojDb.getAuthenticationState(this.currentUser.id);
        console.log('✅ GitHub authentication updated for user:', this.currentUser.email);
      }

      return updated;
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

      const updated = await genprojDb.updateAuthenticationState(this.currentUser.id, {
        circleci: {
          authenticated: true,
          token: circleciAuth.token, // This should be encrypted in production
          expiresAt: circleciAuth.expiresAt,
        },
      });

      if (updated) {
        this.authState = await genprojDb.getAuthenticationState(this.currentUser.id);
        console.log('✅ CircleCI authentication updated for user:', this.currentUser.email);
      }

      return updated;
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

      const updated = await genprojDb.updateAuthenticationState(this.currentUser.id, {
        doppler: {
          authenticated: true,
          token: dopplerAuth.token, // This should be encrypted in production
          expiresAt: dopplerAuth.expiresAt,
        },
      });

      if (updated) {
        this.authState = await genprojDb.getAuthenticationState(this.currentUser.id);
        console.log('✅ Doppler authentication updated for user:', this.currentUser.email);
      }

      return updated;
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

      const updated = await genprojDb.updateAuthenticationState(this.currentUser.id, {
        sonarcloud: {
          authenticated: true,
          token: sonarcloudAuth.token, // This should be encrypted in production
          expiresAt: sonarcloudAuth.expiresAt,
        },
      });

      if (updated) {
        this.authState = await genprojDb.getAuthenticationState(this.currentUser.id);
        console.log('✅ SonarCloud authentication updated for user:', this.currentUser.email);
      }

      return updated;
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
    const required = new Set();
    
    // Import capabilities dynamically to avoid circular dependency
    import('../config/capabilities.js').then(({ getRequiredAuthServices }) => {
      return getRequiredAuthServices(selectedCapabilities);
    });

    // For now, return based on common patterns
    if (selectedCapabilities.includes('circleci')) {
      required.add('circleci');
    }
    if (selectedCapabilities.includes('doppler')) {
      required.add('doppler');
    }
    if (selectedCapabilities.includes('sonarcloud')) {
      required.add('sonarcloud');
    }
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

    for (const service of required) {
      switch (service) {
        case 'github':
          if (this.isGitHubAuthenticated()) {
            authenticated.push(service);
          } else {
            missing.push(service);
          }
          break;
        case 'circleci':
          if (this.isCircleCIAuthenticated()) {
            authenticated.push(service);
          } else {
            missing.push(service);
          }
          break;
        case 'doppler':
          if (this.isDopplerAuthenticated()) {
            authenticated.push(service);
          } else {
            missing.push(service);
          }
          break;
        case 'sonarcloud':
          if (this.isSonarCloudAuthenticated()) {
            authenticated.push(service);
          } else {
            missing.push(service);
          }
          break;
      }
    }

    return {
      authenticated,
      missing,
      allAuthenticated: missing.length === 0,
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
      sonarcloud: this.isSonarCloudAuthenticated(),
    };
  }

  /**
   * Clear authentication state
   * @returns {Promise<boolean>} True if cleared successfully
   */
  async clearAuthState() {
    try {
      this.currentUser = null;
      this.authState = null;
      console.log('✅ Genproj authentication state cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear authentication state:', error);
      return false;
    }
  }
}

// Export singleton instance
export const genprojAuth = new GenprojAuthManager();
