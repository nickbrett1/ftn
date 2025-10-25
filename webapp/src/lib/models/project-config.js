/**
 * @fileoverview Base project configuration model for genproj feature
 * @description Core model for managing project configurations and state
 */

import { genprojDb } from '../server/genproj-database.js';
import { validateProjectConfiguration } from './validation.js';
import { logger } from './logging.js';

/**
 * Project configuration model class
 */
export class ProjectConfiguration {
  constructor(data = {}) {
    this.id = data.id || crypto.randomUUID();
    this.userId = data.userId || null;
    this.projectName = data.projectName || '';
    this.repositoryUrl = data.repositoryUrl || null;
    this.selectedCapabilities = data.selectedCapabilities || [];
    this.configuration = data.configuration || {};
    this.status = data.status || 'draft';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Validate project configuration
   * @returns {Object} Validation result
   */
  validate() {
    return validateProjectConfiguration({
      projectName: this.projectName,
      repositoryUrl: this.repositoryUrl,
      selectedCapabilities: this.selectedCapabilities,
      configuration: this.configuration,
    });
  }

  /**
   * Save project configuration to database
   * @returns {Promise<boolean>} True if saved successfully
   */
  async save() {
    try {
      // Validate before saving
      const validation = this.validate();
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if configuration exists
      const existing = await genprojDb.getProjectConfiguration(this.id);
      
      if (existing) {
        // Update existing configuration
        const updated = await genprojDb.updateProjectConfiguration(this.id, {
          projectName: this.projectName,
          repositoryUrl: this.repositoryUrl,
          selectedCapabilities: this.selectedCapabilities,
          configuration: this.configuration,
          status: this.status,
        });

        if (updated) {
          this.updatedAt = new Date().toISOString();
          logger.success('Project configuration updated', { id: this.id });
          return true;
        }
      } else {
        // Create new configuration
        await genprojDb.createProjectConfiguration({
          id: this.id,
          userId: this.userId,
          projectName: this.projectName,
          repositoryUrl: this.repositoryUrl,
          selectedCapabilities: this.selectedCapabilities,
          configuration: this.configuration,
          status: this.status,
        });

        logger.success('Project configuration created', { id: this.id });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to save project configuration', { 
        id: this.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Load project configuration from database
   * @param {string} id - Configuration ID
   * @returns {Promise<ProjectConfiguration|null>} Loaded configuration
   */
  static async load(id) {
    try {
      const data = await genprojDb.getProjectConfiguration(id);
      if (!data) {
        return null;
      }

      return new ProjectConfiguration(data);
    } catch (error) {
      logger.error('Failed to load project configuration', { 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete project configuration
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete() {
    try {
      // Delete related artifacts and integrations
      await this.deleteRelatedData();
      
      // Delete configuration
      const result = await genprojDb.run(
        'DELETE FROM project_configurations WHERE id = ?',
        [this.id]
      );

      if (result.changes > 0) {
        logger.success('Project configuration deleted', { id: this.id });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to delete project configuration', { 
        id: this.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete related data (artifacts and integrations)
   * @returns {Promise<void>}
   */
  async deleteRelatedData() {
    try {
      // Delete generated artifacts
      await genprojDb.run(
        'DELETE FROM generated_artifacts WHERE project_config_id = ?',
        [this.id]
      );

      // Delete external service integrations
      await genprojDb.run(
        'DELETE FROM external_service_integrations WHERE project_config_id = ?',
        [this.id]
      );

      logger.info('Related data deleted', { id: this.id });
    } catch (error) {
      logger.error('Failed to delete related data', { 
        id: this.id, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update project status
   * @param {string} status - New status
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateStatus(status) {
    try {
      const validStatuses = ['draft', 'preview', 'generating', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const updated = await genprojDb.updateProjectConfiguration(this.id, {
        status,
      });

      if (updated) {
        this.status = status;
        this.updatedAt = new Date().toISOString();
        logger.success('Project status updated', { id: this.id, status });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to update project status', { 
        id: this.id, 
        status, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Add capability to configuration
   * @param {string} capabilityId - Capability ID
   * @param {Object} config - Capability configuration
   * @returns {Promise<boolean>} True if added successfully
   */
  async addCapability(capabilityId, config = {}) {
    try {
      if (this.selectedCapabilities.includes(capabilityId)) {
        logger.warn('Capability already selected', { id: this.id, capabilityId });
        return false;
      }

      this.selectedCapabilities.push(capabilityId);
      this.configuration[capabilityId] = config;

      const saved = await this.save();
      if (saved) {
        logger.success('Capability added', { id: this.id, capabilityId });
      }

      return saved;
    } catch (error) {
      logger.error('Failed to add capability', { 
        id: this.id, 
        capabilityId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Remove capability from configuration
   * @param {string} capabilityId - Capability ID
   * @returns {Promise<boolean>} True if removed successfully
   */
  async removeCapability(capabilityId) {
    try {
      const index = this.selectedCapabilities.indexOf(capabilityId);
      if (index === -1) {
        logger.warn('Capability not found', { id: this.id, capabilityId });
        return false;
      }

      this.selectedCapabilities.splice(index, 1);
      delete this.configuration[capabilityId];

      const saved = await this.save();
      if (saved) {
        logger.success('Capability removed', { id: this.id, capabilityId });
      }

      return saved;
    } catch (error) {
      logger.error('Failed to remove capability', { 
        id: this.id, 
        capabilityId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update capability configuration
   * @param {string} capabilityId - Capability ID
   * @param {Object} config - New configuration
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateCapabilityConfig(capabilityId, config) {
    try {
      if (!this.selectedCapabilities.includes(capabilityId)) {
        throw new Error(`Capability not selected: ${capabilityId}`);
      }

      this.configuration[capabilityId] = config;

      const saved = await this.save();
      if (saved) {
        logger.success('Capability configuration updated', { id: this.id, capabilityId });
      }

      return saved;
    } catch (error) {
      logger.error('Failed to update capability configuration', { 
        id: this.id, 
        capabilityId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get capability configuration
   * @param {string} capabilityId - Capability ID
   * @returns {Object|null} Capability configuration
   */
  getCapabilityConfig(capabilityId) {
    return this.configuration[capabilityId] || null;
  }

  /**
   * Check if capability is selected
   * @param {string} capabilityId - Capability ID
   * @returns {boolean} True if selected
   */
  hasCapability(capabilityId) {
    return this.selectedCapabilities.includes(capabilityId);
  }

  /**
   * Get project metadata
   * @returns {Object} Project metadata
   */
  getMetadata() {
    return {
      id: this.id,
      userId: this.userId,
      projectName: this.projectName,
      repositoryUrl: this.repositoryUrl,
      selectedCapabilities: this.selectedCapabilities,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Get configuration summary
   * @returns {Object} Configuration summary
   */
  getSummary() {
    return {
      projectName: this.projectName,
      capabilityCount: this.selectedCapabilities.length,
      capabilities: this.selectedCapabilities,
      status: this.status,
      hasRepository: !!this.repositoryUrl,
    };
  }

  /**
   * Clone configuration
   * @param {string} newProjectName - New project name
   * @returns {ProjectConfiguration} Cloned configuration
   */
  clone(newProjectName) {
    const cloned = new ProjectConfiguration({
      projectName: newProjectName,
      repositoryUrl: null, // Don't clone repository URL
      selectedCapabilities: [...this.selectedCapabilities],
      configuration: { ...this.configuration },
      status: 'draft',
    });

    return cloned;
  }

  /**
   * Export configuration as JSON
   * @returns {Object} Configuration data
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      projectName: this.projectName,
      repositoryUrl: this.repositoryUrl,
      selectedCapabilities: this.selectedCapabilities,
      configuration: this.configuration,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create configuration from JSON
   * @param {Object} data - Configuration data
   * @returns {ProjectConfiguration} Configuration instance
   */
  static fromJSON(data) {
    return new ProjectConfiguration(data);
  }
}

/**
 * Project configuration manager
 */
export class ProjectConfigurationManager {
  /**
   * Create new project configuration
   * @param {Object} data - Configuration data
   * @returns {Promise<ProjectConfiguration>} Created configuration
   */
  static async create(data) {
    const config = new ProjectConfiguration(data);
    await config.save();
    return config;
  }

  /**
   * Get configuration by ID
   * @param {string} id - Configuration ID
   * @returns {Promise<ProjectConfiguration|null>} Configuration
   */
  static async getById(id) {
    return await ProjectConfiguration.load(id);
  }

  /**
   * Get configurations by user ID
   * @param {string} userId - User ID
   * @returns {Promise<ProjectConfiguration[]>} User configurations
   */
  static async getByUserId(userId) {
    try {
      const results = await genprojDb.query(
        'SELECT * FROM project_configurations WHERE user_id = ? ORDER BY updated_at DESC',
        [userId]
      );

      return results.map(data => new ProjectConfiguration(data));
    } catch (error) {
      logger.error('Failed to get configurations by user ID', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get configurations by status
   * @param {string} status - Configuration status
   * @returns {Promise<ProjectConfiguration[]>} Configurations
   */
  static async getByStatus(status) {
    try {
      const results = await genprojDb.query(
        'SELECT * FROM project_configurations WHERE status = ? ORDER BY updated_at DESC',
        [status]
      );

      return results.map(data => new ProjectConfiguration(data));
    } catch (error) {
      logger.error('Failed to get configurations by status', { 
        status, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete configuration by ID
   * @param {string} id - Configuration ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  static async deleteById(id) {
    const config = await ProjectConfiguration.load(id);
    if (!config) {
      return false;
    }

    return await config.delete();
  }
}
