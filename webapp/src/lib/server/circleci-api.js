/**
 * CircleCI API Service
 *
 * Provides integration with CircleCI API for project creation, configuration,
 * and pipeline management in the genproj tool.
 *
 * @fileoverview Server-side CircleCI API integration service
 */

/**
 * @typedef {Object} CircleCIProject
 * @property {string} id - Project ID
 * @property {string} name - Project name
 * @property {string} slug - Project slug
 * @property {string} organizationSlug - Organization slug
 * @property {string} vcsUrl - VCS URL
 * @property {string} vcsType - VCS type (github, bitbucket)
 */

/**
 * @typedef {Object} CircleCIWebhook
 * @property {string} id - Webhook ID
 * @property {string} name - Webhook name
 * @property {string} url - Webhook URL
 * @property {string[]} events - Events to listen for
 */

import { BaseAPIService } from './base-api-service.js';

/**
 * CircleCI API service class
 */
export class CircleCIAPIService extends BaseAPIService {
	/**
	 * Creates a new CircleCI API service instance
	 * @param {string} token - CircleCI API token
	 * @param {Object} [options] - Optional configuration
	 * @param {Object} [options.followRetry] - Retry policy for following a
	 *   freshly-created project. CircleCI indexes new GitHub repos
	 *   asynchronously, so the follow call can 404 for a short window right
	 *   after repo creation; retrying with backoff lets eventual consistency
	 *   catch up instead of forcing a manual "Set Up Project".
	 * @param {number} [options.followRetry.attempts=6] - Max attempts (incl. first)
	 * @param {number} [options.followRetry.baseDelayMs=5000] - First retry delay
	 * @param {number} [options.followRetry.maxDelayMs=30000] - Max retry delay
	 * @param {number} [options.followRetry.backoffFactor=2] - Exponential factor
	 */
	constructor(token, options = {}) {
		super(
			token,
			'https://circleci.com/api/v2',
			{
				'Circle-Token': token,
				Accept: 'application/json',
				'Content-Type': 'application/json'
			},
			'CircleCI'
		);
		this.followRetry = {
			attempts: 6,
			baseDelayMs: 5000,
			maxDelayMs: 30000,
			backoffFactor: 2,
			...options.followRetry
		};
	}

	/**
	 * Gets the authenticated user's information
	 * @returns {Promise<Object>} User information
	 */
	async getUserInfo() {
		const response = await this.makeRequest('/me');
		return response.json();
	}

	/**
	 * Lists user's organizations
	 * @returns {Promise<Object[]>} Array of organizations
	 */
	async listOrganizations() {
		const response = await this.makeRequest('/me/collaborations');
		return response.json();
	}

	/**
	 * Follows a project (enables CircleCI for a repository)
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @returns {Promise<CircleCIProject>} Project information
	 */
	async followProject(vcsType, organizationSlug, projectSlug) {
		console.log(`🔄 Following CircleCI project: ${organizationSlug}/${projectSlug}`);

		const { attempts, baseDelayMs, maxDelayMs, backoffFactor } = this.followRetry;
		let lastError;

		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				const response = await this.makeRequest(
					`/project/${vcsType}/${organizationSlug}/${projectSlug}/follow`,
					{
						method: 'POST'
					}
				);

				const project = await response.json();

				console.log(`✅ CircleCI project followed: ${project.slug}`);

				return {
					id: project.id,
					name: project.name,
					slug: project.slug,
					organizationSlug: project.organization_slug,
					vcsUrl: project.vcs_url,
					vcsType: project.vcs_type
				};
			} catch (error) {
				lastError = error;

				// Only 404s (repo not yet indexed by CircleCI) and transient
				// network/5xx failures warrant a retry. Auth/validation errors
				// are fatal and must surface immediately.
				if (!this.#isRetryableFollowError(error) || attempt === attempts) {
					throw error;
				}

				const delay = Math.min(baseDelayMs * backoffFactor ** (attempt - 1), maxDelayMs);
				console.warn(
					`⏳ CircleCI project not ready (attempt ${attempt}/${attempts}): ${error.message}. Retrying in ${delay}ms...`
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw lastError;
	}

	/**
	 * Determines whether a follow error is worth retrying. CircleCI returns a
	 * 404 while it is still indexing a freshly-created GitHub repo — that is
	 * the exact race genproj hits right after creating the repo + first commit.
	 * @param {Error} error - Error thrown by makeRequest
	 * @returns {boolean} Whether the error is transient/retryable
	 */
	#isRetryableFollowError(error) {
		if (!error?.message) {
			return false;
		}
		// CircleCI API errors surface as "CircleCI API error: 404 Not Found ..."
		if (/CircleCI API error: 404/.test(error.message)) {
			return true;
		}
		// Transient server/network errors (fetch throws a TypeError).
		return /CircleCI API error: (5\d\d|0 )/.test(error.message);
	}

	/**
	 * Updates the project's settings (e.g. the default branch used for config
	 * detection and push-triggered pipelines). This is the API equivalent of
	 * picking the branch in the CircleCI "Set Up Project" wizard.
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @param {Object} settings - Settings to update, e.g. { vcs: { default_branch: 'main' } }
	 * @returns {Promise<Object>} Updated project settings
	 */
	async updateProjectSettings(vcsType, organizationSlug, projectSlug, settings) {
		console.log(`🔄 Updating CircleCI project settings: ${organizationSlug}/${projectSlug}`);

		const response = await this.makeRequest(
			`/project/${vcsType}/${organizationSlug}/${projectSlug}/settings`,
			{
				method: 'PATCH',
				body: JSON.stringify(settings)
			}
		);

		const updated = await response.json();

		console.log(`✅ CircleCI project settings updated: ${organizationSlug}/${projectSlug}`);

		return updated;
	}

	/**
	 * Unfollows a project (disables CircleCI for a repository)
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @returns {Promise<void>}
	 */
	async unfollowProject(vcsType, organizationSlug, projectSlug) {
		console.log(`🔄 Unfollowing CircleCI project: ${organizationSlug}/${projectSlug}`);

		await this.makeRequest(`/project/${vcsType}/${organizationSlug}/${projectSlug}/unfollow`, {
			method: 'DELETE'
		});

		console.log(`✅ CircleCI project unfollowed: ${organizationSlug}/${projectSlug}`);
	}

	/**
	 * Gets project information
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @returns {Promise<Object>} Project information
	 */
	async getProject(vcsType, organizationSlug, projectSlug) {
		const response = await this.makeRequest(
			`/project/${vcsType}/${organizationSlug}/${projectSlug}`
		);
		return response.json();
	}

	/**
	 * Lists project pipelines
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @param {number} [pageToken] - Page token for pagination
	 * @returns {Promise<Object>} Pipelines information
	 */
	async listPipelines(vcsType, organizationSlug, projectSlug, pageToken = null) {
		const parameters = new URLSearchParams();
		if (pageToken) {
			parameters.append('page-token', pageToken);
		}

		const endpoint = `/project/${vcsType}/${organizationSlug}/${projectSlug}/pipeline${parameters.toString() ? '?' + parameters.toString() : ''}`;
		const response = await this.makeRequest(endpoint);
		return response.json();
	}

	/**
	 * Triggers a pipeline
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @param {string} branch - Branch name
	 * @param {Object} [parameters] - Pipeline parameters
	 * @returns {Promise<Object>} Pipeline information
	 */
	async triggerPipeline(vcsType, organizationSlug, projectSlug, branch, parameters = {}) {
		console.log(
			`🔄 Triggering CircleCI pipeline for ${organizationSlug}/${projectSlug} on ${branch}`
		);

		const pipelineData = {
			branch,
			parameters
		};

		const response = await this.makeRequest(
			`/project/${vcsType}/${organizationSlug}/${projectSlug}/pipeline`,
			{
				method: 'POST',
				body: JSON.stringify(pipelineData)
			}
		);

		const pipeline = await response.json();

		console.log(`✅ CircleCI pipeline triggered: ${pipeline.id}`);

		return pipeline;
	}

	/**
	 * Gets pipeline information
	 * @param {string} pipelineId - Pipeline ID
	 * @returns {Promise<Object>} Pipeline information
	 */
	async getPipeline(pipelineId) {
		const response = await this.makeRequest(`/pipeline/${pipelineId}`);
		return response.json();
	}

	/**
	 * Lists project environment variables
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @returns {Promise<Object[]>} Array of environment variables
	 */
	async listEnvironmentVariables(vcsType, organizationSlug, projectSlug) {
		const response = await this.makeRequest(
			`/project/${vcsType}/${organizationSlug}/${projectSlug}/envvar`
		);
		return response.json();
	}

	/**
	 * Creates an environment variable
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @param {string} name - Variable name
	 * @param {string} value - Variable value
	 * @returns {Promise<Object>} Environment variable information
	 */
	async createEnvironmentVariable(vcsType, organizationSlug, projectSlug, name, value) {
		console.log(`🔄 Creating CircleCI environment variable: ${name}`);

		const environmentVariableData = {
			name,
			value
		};

		const response = await this.makeRequest(
			`/project/${vcsType}/${organizationSlug}/${projectSlug}/envvar`,
			{
				method: 'POST',
				body: JSON.stringify(environmentVariableData)
			}
		);

		const environmentVariable = await response.json();

		console.log(`✅ CircleCI environment variable created: ${name}`);

		return environmentVariable;
	}

	/**
	 * Deletes an environment variable
	 * @param {string} vcsType - VCS type (github, bitbucket)
	 * @param {string} organizationSlug - Organization slug
	 * @param {string} projectSlug - Project slug
	 * @param {string} name - Variable name
	 * @returns {Promise<void>}
	 */
	async deleteEnvironmentVariable(vcsType, organizationSlug, projectSlug, name) {
		console.log(`🔄 Deleting CircleCI environment variable: ${name}`);

		await this.makeRequest(
			`/project/${vcsType}/${organizationSlug}/${projectSlug}/envvar/${name}`,
			{
				method: 'DELETE'
			}
		);

		console.log(`✅ CircleCI environment variable deleted: ${name}`);
	}

	/**
	 * Validates the CircleCI token by making a test API call
	 * @returns {Promise<boolean>} Whether the token is valid
	 */
	async validateToken() {
		try {
			await this.getUserInfo();
			return true;
		} catch (error) {
			console.error(`❌ CircleCI token validation failed: ${error.message}`);
			return false;
		}
	}
}
