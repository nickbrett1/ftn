/**
 * @fileoverview Cloudflare D1 database connection and initialization
 * @description Database utilities for the genproj feature using Cloudflare D1
 */

import { platform } from '$app/environment';

/**
 * Database connection class for genproj feature
 */
export class GenprojDatabase {
  constructor() {
    this.db = platform?.env?.DB_GENPROJ;
  }

  /**
   * Initialize database connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async initialize() {
    try {
      if (!this.db) {
        console.error('❌ Genproj database not available in environment');
        return false;
      }

      // Test connection with a simple query
      await this.db.prepare('SELECT 1').first();
      console.log('✅ Genproj database connection initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize genproj database:', error);
      return false;
    }
  }

  /**
   * Execute a prepared statement
   * @param {string} sql - SQL query
   * @param {any[]} params - Query parameters
   * @returns {Promise<any>} Query result
   */
  async query(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return await stmt.bind(...params).all();
    } catch (error) {
      console.error('❌ Database query failed:', error);
      throw error;
    }
  }

  /**
   * Execute a prepared statement and return first row
   * @param {string} sql - SQL query
   * @param {any[]} params - Query parameters
   * @returns {Promise<any>} First row result
   */
  async queryFirst(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return await stmt.bind(...params).first();
    } catch (error) {
      console.error('❌ Database query failed:', error);
      throw error;
    }
  }

  /**
   * Execute a prepared statement and return run result
   * @param {string} sql - SQL query
   * @param {any[]} params - Query parameters
   * @returns {Promise<any>} Run result
   */
  async run(sql, params = []) {
    try {
      const stmt = this.db.prepare(sql);
      return await stmt.bind(...params).run();
    } catch (error) {
      console.error('❌ Database run failed:', error);
      throw error;
    }
  }

  /**
   * Create a project configuration
   * @param {Object} config - Project configuration data
   * @returns {Promise<string>} Configuration ID
   */
  async createProjectConfiguration(config) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO project_configurations (
        id, user_id, project_name, repository_url, 
        selected_capabilities, configuration, status, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      config.userId || null,
      config.projectName,
      config.repositoryUrl || null,
      JSON.stringify(config.selectedCapabilities),
      JSON.stringify(config.configuration),
      config.status || 'draft',
      now,
      now,
    ];

    await this.run(sql, params);
    console.log('✅ Project configuration created:', id);
    return id;
  }

  /**
   * Get project configuration by ID
   * @param {string} id - Configuration ID
   * @returns {Promise<Object|null>} Project configuration
   */
  async getProjectConfiguration(id) {
    const sql = 'SELECT * FROM project_configurations WHERE id = ?';
    const result = await this.queryFirst(sql, [id]);

    if (!result) return null;

    return {
      ...result,
      selectedCapabilities: JSON.parse(result.selected_capabilities),
      configuration: JSON.parse(result.configuration),
    };
  }

  /**
   * Update project configuration
   * @param {string} id - Configuration ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateProjectConfiguration(id, updates) {
    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    if (updates.projectName !== undefined) {
      fields.push('project_name = ?');
      params.push(updates.projectName);
    }
    if (updates.repositoryUrl !== undefined) {
      fields.push('repository_url = ?');
      params.push(updates.repositoryUrl);
    }
    if (updates.selectedCapabilities !== undefined) {
      fields.push('selected_capabilities = ?');
      params.push(JSON.stringify(updates.selectedCapabilities));
    }
    if (updates.configuration !== undefined) {
      fields.push('configuration = ?');
      params.push(JSON.stringify(updates.configuration));
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }

    fields.push('updated_at = ?');
    params.push(now);
    params.push(id);

    const sql = `UPDATE project_configurations SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.run(sql, params);

    console.log('✅ Project configuration updated:', id);
    return result.changes > 0;
  }

  /**
   * Create authentication state
   * @param {string} userId - User ID
   * @param {Object} authData - Authentication data
   * @returns {Promise<boolean>} True if created successfully
   */
  async createAuthenticationState(userId, authData) {
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO authentication_states (
        user_id, google_auth, github_auth, circleci_auth, 
        doppler_auth, sonarcloud_auth, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      userId,
      JSON.stringify(authData.google || {}),
      JSON.stringify(authData.github || null),
      JSON.stringify(authData.circleci || null),
      JSON.stringify(authData.doppler || null),
      JSON.stringify(authData.sonarcloud || null),
      now,
    ];

    await this.run(sql, params);
    console.log('✅ Authentication state created for user:', userId);
    return true;
  }

  /**
   * Get authentication state by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Authentication state
   */
  async getAuthenticationState(userId) {
    const sql = 'SELECT * FROM authentication_states WHERE user_id = ?';
    const result = await this.queryFirst(sql, [userId]);

    if (!result) return null;

    return {
      userId: result.user_id,
      google: JSON.parse(result.google_auth),
      github: result.github_auth ? JSON.parse(result.github_auth) : null,
      circleci: result.circleci_auth ? JSON.parse(result.circleci_auth) : null,
      doppler: result.doppler_auth ? JSON.parse(result.doppler_auth) : null,
      sonarcloud: result.sonarcloud_auth ? JSON.parse(result.sonarcloud_auth) : null,
      lastUpdated: result.last_updated,
    };
  }

  /**
   * Update authentication state
   * @param {string} userId - User ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateAuthenticationState(userId, updates) {
    const now = new Date().toISOString();
    const fields = [];
    const params = [];

    if (updates.google !== undefined) {
      fields.push('google_auth = ?');
      params.push(JSON.stringify(updates.google));
    }
    if (updates.github !== undefined) {
      fields.push('github_auth = ?');
      params.push(JSON.stringify(updates.github));
    }
    if (updates.circleci !== undefined) {
      fields.push('circleci_auth = ?');
      params.push(JSON.stringify(updates.circleci));
    }
    if (updates.doppler !== undefined) {
      fields.push('doppler_auth = ?');
      params.push(JSON.stringify(updates.doppler));
    }
    if (updates.sonarcloud !== undefined) {
      fields.push('sonarcloud_auth = ?');
      params.push(JSON.stringify(updates.sonarcloud));
    }

    fields.push('last_updated = ?');
    params.push(now);
    params.push(userId);

    const sql = `UPDATE authentication_states SET ${fields.join(', ')} WHERE user_id = ?`;
    const result = await this.run(sql, params);

    console.log('✅ Authentication state updated for user:', userId);
    return result.changes > 0;
  }

  /**
   * Create generated artifact
   * @param {Object} artifact - Artifact data
   * @returns {Promise<string>} Artifact ID
   */
  async createGeneratedArtifact(artifact) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO generated_artifacts (
        id, project_config_id, capability_id, file_path, 
        content, template_id, variables, is_executable, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      artifact.projectConfigId,
      artifact.capabilityId,
      artifact.filePath,
      artifact.content,
      artifact.templateId,
      JSON.stringify(artifact.variables || {}),
      artifact.isExecutable || false,
      now,
    ];

    await this.run(sql, params);
    console.log('✅ Generated artifact created:', id);
    return id;
  }

  /**
   * Get generated artifacts by project config ID
   * @param {string} projectConfigId - Project configuration ID
   * @returns {Promise<Object[]>} Generated artifacts
   */
  async getGeneratedArtifacts(projectConfigId) {
    const sql = 'SELECT * FROM generated_artifacts WHERE project_config_id = ? ORDER BY created_at';
    const results = await this.query(sql, [projectConfigId]);

    return results.map(result => ({
      id: result.id,
      projectConfigId: result.project_config_id,
      capabilityId: result.capability_id,
      filePath: result.file_path,
      content: result.content,
      templateId: result.template_id,
      variables: JSON.parse(result.variables),
      isExecutable: result.is_executable,
      createdAt: result.created_at,
    }));
  }

  /**
   * Create external service integration
   * @param {Object} integration - Integration data
   * @returns {Promise<string>} Integration ID
   */
  async createExternalServiceIntegration(integration) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO external_service_integrations (
        id, project_config_id, service_id, status, 
        service_project_id, configuration, error_message, 
        created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      integration.projectConfigId,
      integration.serviceId,
      integration.status || 'pending',
      integration.serviceProjectId || null,
      JSON.stringify(integration.configuration || {}),
      integration.errorMessage || null,
      now,
      integration.completedAt || null,
    ];

    await this.run(sql, params);
    console.log('✅ External service integration created:', id);
    return id;
  }

  /**
   * Get external service integrations by project config ID
   * @param {string} projectConfigId - Project configuration ID
   * @returns {Promise<Object[]>} External service integrations
   */
  async getExternalServiceIntegrations(projectConfigId) {
    const sql = 'SELECT * FROM external_service_integrations WHERE project_config_id = ? ORDER BY created_at';
    const results = await this.query(sql, [projectConfigId]);

    return results.map(result => ({
      id: result.id,
      projectConfigId: result.project_config_id,
      serviceId: result.service_id,
      status: result.status,
      serviceProjectId: result.service_project_id,
      configuration: JSON.parse(result.configuration),
      errorMessage: result.error_message,
      createdAt: result.created_at,
      completedAt: result.completed_at,
    }));
  }
}

// Export singleton instance
export const genprojDb = new GenprojDatabase();
