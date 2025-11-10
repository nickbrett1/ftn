/**
 * Doppler API Service
 *
 * Provides integration with Doppler API for project creation, secrets management,
 * and configuration in the genproj tool.
 *
 * @fileoverview Server-side Doppler API integration service
 */

/**
 * @typedef {Object} DopplerProject
 * @property {string} id - Project ID
 * @property {string} name - Project name
 * @property {string} slug - Project slug
 * @property {string} description - Project description
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} DopplerEnvironment
 * @property {string} id - Environment ID
 * @property {string} name - Environment name
 * @property {string} slug - Environment slug
 * @property {string} projectId - Project ID
 */

/**
 * @typedef {Object} DopplerSecret
 * @property {string} name - Secret name
 * @property {string} value - Secret value
 * @property {string} [comment] - Secret comment
 */

/**
 * Doppler API service class
 */
export class DopplerAPIService {
	/**
	 * Creates a new Doppler API service instance
	 * @param {string} token - Doppler API token
	 */
	constructor(token) {
		this.token = token;
		this.baseUrl = 'https://api.doppler.com/v3';
		this.headers = {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json',
			'Content-Type': 'application/json'
		};
	}

	/**
	 * Makes an authenticated request to Doppler API
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

		console.log(`🔍 Making Doppler API request to: ${endpoint}`);

		try {
			const response = await fetch(url, requestOptions);

			if (!response.ok) {
				console.error(`❌ Doppler API error: ${response.status} ${response.statusText}`);
				throw new Error(`Doppler API error: ${response.status} ${response.statusText}`);
			}

			console.log(`✅ Doppler API request successful: ${endpoint}`);
			return response;
		} catch (error) {
			console.error(`❌ Doppler API request failed: ${error.message}`);
			throw error;
		}
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
	 * Lists user's projects
	 * @param {number} [page=1] - Page number
	 * @param {number} [perPage=20] - Items per page
	 * @returns {Promise<Object>} Projects information
	 */
	async listProjects(page = 1, perPage = 20) {
		const parameters = new URLSearchParams({
			page: page.toString(),
			per_page: perPage.toString()
		});

		const response = await this.makeRequest(`/projects?${parameters.toString()}`);
		return response.json();
	}

	/**
	 * Creates a new project
	 * @param {string} name - Project name
	 * @param {string} [description] - Project description
	 * @returns {Promise<DopplerProject>} Created project information
	 */
	async createProject(name, description = '') {
		console.log(`🔄 Creating Doppler project: ${name}`);

		const projectData = {
			name,
			description
		};

		const response = await this.makeRequest('/projects', {
			method: 'POST',
			body: JSON.stringify(projectData)
		});

		const project = await response.json();

		console.log(`✅ Doppler project created: ${project.name}`);

		return {
			id: project.id,
			name: project.name,
			slug: project.slug,
			description: project.description,
			createdAt: project.created_at
		};
	}

	/**
	 * Gets project information
	 * @param {string} projectSlug - Project slug
	 * @returns {Promise<Object>} Project information
	 */
	async getProject(projectSlug) {
		const response = await this.makeRequest(`/projects/${projectSlug}`);
		return response.json();
	}

	/**
	 * Updates a project
	 * @param {string} projectSlug - Project slug
	 * @param {Object} updates - Project updates
	 * @returns {Promise<Object>} Updated project information
	 */
	async updateProject(projectSlug, updates) {
		console.log(`🔄 Updating Doppler project: ${projectSlug}`);

		const response = await this.makeRequest(`/projects/${projectSlug}`, {
			method: 'PATCH',
			body: JSON.stringify(updates)
		});

		const project = await response.json();

		console.log(`✅ Doppler project updated: ${projectSlug}`);

		return project;
	}

	/**
	 * Deletes a project
	 * @param {string} projectSlug - Project slug
	 * @returns {Promise<void>}
	 */
	async deleteProject(projectSlug) {
		console.log(`🔄 Deleting Doppler project: ${projectSlug}`);

		await this.makeRequest(`/projects/${projectSlug}`, {
			method: 'DELETE'
		});

		console.log(`✅ Doppler project deleted: ${projectSlug}`);
	}

	/**
	 * Lists project environments
	 * @param {string} projectSlug - Project slug
	 * @returns {Promise<DopplerEnvironment[]>} Array of environments
	 */
	async listEnvironments(projectSlug) {
		const response = await this.makeRequest(`/projects/${projectSlug}/environments`);
		return response.json();
	}

	/**
	 * Creates a new environment
	 * @param {string} projectSlug - Project slug
	 * @param {string} name - Environment name
	 * @param {string} slug - Environment slug
	 * @returns {Promise<DopplerEnvironment>} Created environment information
	 */
	async createEnvironment(projectSlug, name, slug) {
		console.log(`🔄 Creating Doppler environment: ${name}`);

		const environmentData = {
			name,
			slug
		};

		const response = await this.makeRequest(`/projects/${projectSlug}/environments`, {
			method: 'POST',
			body: JSON.stringify(environmentData)
		});

		const environment = await response.json();

		console.log(`✅ Doppler environment created: ${name}`);

		return {
			id: environment.id,
			name: environment.name,
			slug: environment.slug,
			projectId: environment.project_id
		};
	}

	/**
	 * Lists secrets for a project environment
	 * @param {string} projectSlug - Project slug
	 * @param {string} environmentSlug - Environment slug
	 * @param {string} [configSlug] - Config slug (optional)
	 * @returns {Promise<Object[]>} Array of secrets
	 */
	async listSecrets(projectSlug, environmentSlug, configSlug = '') {
		const endpoint = configSlug
			? `/projects/${projectSlug}/environments/${environmentSlug}/configs/${configSlug}/secrets`
			: `/projects/${projectSlug}/environments/${environmentSlug}/secrets`;

		const response = await this.makeRequest(endpoint);
		return response.json();
	}

	/**
	 * Creates or updates a secret
	 * @param {string} projectSlug - Project slug
	 * @param {string} environmentSlug - Environment slug
	 * @param {string} secretName - Secret name
	 * @param {string} secretValue - Secret value
	 * @param {string} [comment] - Secret comment
	 * @param {string} [configSlug] - Config slug (optional)
	 * @returns {Promise<Object>} Secret information
	 */
	async setSecret(
		projectSlug,
		environmentSlug,
		secretName,
		secretValue,
		comment = '',
		configSlug = ''
	) {
		console.log(`🔄 Setting Doppler secret: ${secretName}`);

		const secretData = {
			name: secretName,
			value: secretValue,
			comment
		};

		const endpoint = configSlug
			? `/projects/${projectSlug}/environments/${environmentSlug}/configs/${configSlug}/secrets/${secretName}`
			: `/projects/${projectSlug}/environments/${environmentSlug}/secrets/${secretName}`;

		const response = await this.makeRequest(endpoint, {
			method: 'PUT',
			body: JSON.stringify(secretData)
		});

		const secret = await response.json();

		console.log(`✅ Doppler secret set: ${secretName}`);

		return secret;
	}

	/**
	 * Deletes a secret
	 * @param {string} projectSlug - Project slug
	 * @param {string} environmentSlug - Environment slug
	 * @param {string} secretName - Secret name
	 * @param {string} [configSlug] - Config slug (optional)
	 * @returns {Promise<void>}
	 */
	async deleteSecret(projectSlug, environmentSlug, secretName, configSlug = '') {
		console.log(`🔄 Deleting Doppler secret: ${secretName}`);

		const endpoint = configSlug
			? `/projects/${projectSlug}/environments/${environmentSlug}/configs/${configSlug}/secrets/${secretName}`
			: `/projects/${projectSlug}/environments/${environmentSlug}/secrets/${secretName}`;

		await this.makeRequest(endpoint, {
			method: 'DELETE'
		});

		console.log(`✅ Doppler secret deleted: ${secretName}`);
	}

	/**
	 * Gets project activity logs
	 * @param {string} projectSlug - Project slug
	 * @param {number} [page=1] - Page number
	 * @param {number} [perPage=20] - Items per page
	 * @returns {Promise<Object>} Activity logs
	 */
	async getActivityLogs(projectSlug, page = 1, perPage = 20) {
		const parameters = new URLSearchParams({
			page: page.toString(),
			per_page: perPage.toString()
		});

		const response = await this.makeRequest(
			`/projects/${projectSlug}/activity?${parameters.toString()}`
		);
		return response.json();
	}

	/**
	 * Validates the Doppler token by making a test API call
	 * @returns {Promise<boolean>} Whether the token is valid
	 */
	async validateToken() {
		try {
			await this.getUserInfo();
			return true;
		} catch (error) {
			console.error(`❌ Doppler token validation failed: ${error.message}`);
			return false;
		}
	}
}
