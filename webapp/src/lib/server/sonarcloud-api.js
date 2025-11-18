/**
 * SonarCloud API Service
 *
 * Provides integration with SonarCloud API for project creation, quality gate
 * configuration, and code analysis in the genproj tool.
 *
 * @fileoverview Server-side SonarCloud API integration service
 */

/**
 * @typedef {Object} SonarCloudProject
 * @property {string} key - Project key
 * @property {string} name - Project name
 * @property {string} organization - Organization key
 * @property {string} visibility - Project visibility (public, private)
 * @property {string} qualifier - Project qualifier (TRK for main projects)
 */

/**
 * @typedef {Object} SonarCloudQualityGate
 * @property {string} id - Quality gate ID
 * @property {string} name - Quality gate name
 * @property {boolean} isDefault - Whether this is the default quality gate
 */

/**
 * @typedef {Object} SonarCloudWebhook
 * @property {string} key - Webhook key
 * @property {string} name - Webhook name
 * @property {string} url - Webhook URL
 * @property {string} secret - Webhook secret
 */

/**
 * SonarCloud API service class
 */
export class SonarCloudAPIService {
	/**
	 * Creates a new SonarCloud API service instance
	 * @param {string} token - SonarCloud API token
	 */
	constructor(token) {
		this.token = token;
		this.baseUrl = 'https://sonarcloud.io/api';
		this.headers = {
			Authorization: `Basic ${btoa(token + ':')}`,
			Accept: 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		};
	}

	/**
	 * Makes an authenticated request to SonarCloud API
	 * @param {string} endpoint - API endpoint
	 * @param {Object} [options] - Request options
	 * @returns {Promise<Response>} API response
	 */
	async makeRequest(endpoint, options = {}) {
		const url = `${this.baseUrl}${endpoint}`;
		const requestOptions = {
			headers: this.headers,
			...options
		};

		console.log(`🔍 Making SonarCloud API request to: ${endpoint}`);

		try {
			const response = await fetch(url, requestOptions);

			if (!response.ok) {
				console.error(`❌ SonarCloud API error: ${response.status} ${response.statusText}`);
				throw new Error(`SonarCloud API error: ${response.status} ${response.statusText}`);
			}

			console.log(`✅ SonarCloud API request successful: ${endpoint}`);
			return response;
		} catch (error) {
			console.error(`❌ SonarCloud API request failed: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Validates the SonarCloud token by making a test API call
	 * @returns {Promise<boolean>} Whether the token is valid
	 */
	async validateToken() {
		try {
			const response = await this.makeRequest('/authentication/validate');
			const result = await response.json();
			return result.valid === true;
		} catch (error) {
			console.error(`❌ SonarCloud token validation failed: ${error.message}`);
			return false;
		}
	}

	/**
	 * Gets the authenticated user's information
	 * @returns {Promise<Object>} User information
	 */
	async getUserInfo() {
		const response = await this.makeRequest('/users/current');
		return response.json();
	}

	/**
	 * Lists user's organizations
	 * @returns {Promise<Object[]>} Array of organizations
	 */
	async listOrganizations() {
		const response = await this.makeRequest('/user_groups/search');
		return response.json();
	}

	/**
	 * Creates a new project
	 * @param {string} organization - Organization key
	 * @param {string} projectKey - Project key
	 * @param {string} projectName - Project name
	 * @param {string} [visibility='public'] - Project visibility
	 * @returns {Promise<SonarCloudProject>} Created project information
	 */
	async createProject(organization, projectKey, projectName, visibility = 'public') {
		console.log(`🔄 Creating SonarCloud project: ${projectKey}`);

		const formData = new URLSearchParams({
			organization,
			key: projectKey,
			name: projectName,
			visibility
		});

		const response = await this.makeRequest('/projects/create', {
			method: 'POST',
			body: formData
		});

		const project = await response.json();

		console.log(`✅ SonarCloud project created: ${projectKey}`);

		return {
			key: project.project.key,
			name: project.project.name,
			organization: project.project.organization,
			visibility: project.project.visibility,
			qualifier: project.project.qualifier
		};
	}

	/**
	 * Gets project information
	 * @param {string} projectKey - Project key
	 * @returns {Promise<Object>} Project information
	 */
	async getProject(projectKey) {
		const response = await this.makeRequest(`/components/show?component=${projectKey}`);
		return response.json();
	}

	/**
	 * Updates project information
	 * @param {string} projectKey - Project key
	 * @param {Object} updates - Project updates
	 * @returns {Promise<Object>} Updated project information
	 */
	async updateProject(projectKey, updates) {
		console.log(`🔄 Updating SonarCloud project: ${projectKey}`);

		const formData = new URLSearchParams({
			key: projectKey,
			...updates
		});

		const response = await this.makeRequest('/projects/update', {
			method: 'POST',
			body: formData
		});

		const project = await response.json();

		console.log(`✅ SonarCloud project updated: ${projectKey}`);

		return project;
	}

	/**
	 * Deletes a project
	 * @param {string} projectKey - Project key
	 * @returns {Promise<void>}
	 */
	async deleteProject(projectKey) {
		console.log(`🔄 Deleting SonarCloud project: ${projectKey}`);

		const formData = new URLSearchParams({
			key: projectKey
		});

		await this.makeRequest('/projects/delete', {
			method: 'POST',
			body: formData
		});

		console.log(`✅ SonarCloud project deleted: ${projectKey}`);
	}

	/**
	 * Lists quality gates
	 * @returns {Promise<SonarCloudQualityGate[]>} Array of quality gates
	 */
	async listQualityGates() {
		const response = await this.makeRequest('/qualitygates/list');
		return response.json();
	}

	/**
	 * Associates a quality gate with a project
	 * @param {string} projectKey - Project key
	 * @param {string} qualityGateId - Quality gate ID
	 * @returns {Promise<void>}
	 */
	async associateQualityGate(projectKey, qualityGateId) {
		console.log(`🔄 Associating quality gate ${qualityGateId} with project ${projectKey}`);

		const formData = new URLSearchParams({
			projectKey,
			gateId: qualityGateId
		});

		await this.makeRequest('/qualitygates/select', {
			method: 'POST',
			body: formData
		});

		console.log(`✅ Quality gate associated with project: ${projectKey}`);
	}

	/**
	 * Gets project quality gate
	 * @param {string} projectKey - Project key
	 * @returns {Promise<Object>} Quality gate information
	 */
	async getProjectQualityGate(projectKey) {
		const response = await this.makeRequest(`/qualitygates/get_by_project?project=${projectKey}`);
		return response.json();
	}

	/**
	 * Creates a webhook for the project
	 * @param {string} projectKey - Project key
	 * @param {string} name - Webhook name
	 * @param {string} url - Webhook URL
	 * @param {string} [secret] - Webhook secret
	 * @returns {Promise<SonarCloudWebhook>} Created webhook information
	 */
	async createWebhook(projectKey, name, url, secret = '') {
		console.log(`🔄 Creating SonarCloud webhook: ${name}`);

		const formData = new URLSearchParams({
			project: projectKey,
			name,
			url,
			secret
		});

		const response = await this.makeRequest('/webhooks/create', {
			method: 'POST',
			body: formData
		});

		const webhook = await response.json();

		console.log(`✅ SonarCloud webhook created: ${name}`);

		return {
			key: webhook.webhook.key,
			name: webhook.webhook.name,
			url: webhook.webhook.url,
			secret: webhook.webhook.secret
		};
	}

	/**
	 * Lists project webhooks
	 * @param {string} projectKey - Project key
	 * @returns {Promise<SonarCloudWebhook[]>} Array of webhooks
	 */
	async listWebhooks(projectKey) {
		const response = await this.makeRequest(`/webhooks/list?project=${projectKey}`);
		return response.json();
	}

	/**
	 * Deletes a webhook
	 * @param {string} webhookKey - Webhook key
	 * @returns {Promise<void>}
	 */
	async deleteWebhook(webhookKey) {
		console.log(`🔄 Deleting SonarCloud webhook: ${webhookKey}`);

		const formData = new URLSearchParams({
			webhook: webhookKey
		});

		await this.makeRequest('/webhooks/delete', {
			method: 'POST',
			body: formData
		});

		console.log(`✅ SonarCloud webhook deleted: ${webhookKey}`);
	}

	/**
	 * Gets project analysis status
	 * @param {string} projectKey - Project key
	 * @returns {Promise<Object>} Analysis status
	 */
	async getAnalysisStatus(projectKey) {
		const response = await this.makeRequest(`/ce/activity?component=${projectKey}`);
		return response.json();
	}

	/**
	 * Triggers a project analysis
	 * @param {string} projectKey - Project key
	 * @param {string} [branch] - Branch name
	 * @returns {Promise<Object>} Analysis task information
	 */
	async triggerAnalysis(projectKey, branch = 'main') {
		console.log(`🔄 Triggering SonarCloud analysis for project: ${projectKey}`);

		const formData = new URLSearchParams({
			projectKey,
			branch
		});

		const response = await this.makeRequest('/ce/submit', {
			method: 'POST',
			body: formData
		});

		const task = await response.json();

		console.log(`✅ SonarCloud analysis triggered: ${task.task.id}`);

		return task;
	}

	/**
	 * Gets project metrics
	 * @param {string} projectKey - Project key
	 * @param {string[]} [metrics] - Metrics to retrieve
	 * @returns {Promise<Object>} Project metrics
	 */
	async getProjectMetrics(
		projectKey,
		metrics = ['bugs', 'vulnerabilities', 'code_smells', 'coverage', 'duplicated_lines_density']
	) {
		const metricsParameter = metrics.join(',');
		const response = await this.makeRequest(
			`/measures/component?component=${projectKey}&metricKeys=${metricsParameter}`
		);
		return response.json();
	}
}
