/**
 * GitHub API Service
 *
 * Provides integration with GitHub API for repository creation, file management,
 * and webhook configuration in the genproj tool.
 *
 * @fileoverview Server-side GitHub API integration service
 */

/**
 * @typedef {Object} GitHubRepository
 * @property {string} name - Repository name
 * @property {string} fullName - Full repository name (owner/repo)
 * @property {string} cloneUrl - Clone URL
 * @property {string} htmlUrl - GitHub web URL
 * @property {boolean} private - Whether repository is private
 */

/**
 * @typedef {Object} GitHubFile
 * @property {string} path - File path in repository
 * @property {string} content - File content (base64 encoded)
 * @property {string} message - Commit message
 * @property {string} [branch] - Branch name (default: main)
 */

import { BaseAPIService } from './base-api-service.js';

/**
 * GitHub API service class
 */
export class GitHubAPIService extends BaseAPIService {
	/**
	 * Creates a new GitHub API service instance
	 * @param {string} token - GitHub access token
	 */
	constructor(token) {
		super(
			token,
			'https://api.github.com',
			{
				Authorization: `token ${token}`,
				Accept: 'application/vnd.github.v3+json',
				'User-Agent': 'genproj-tool'
			},
			'GitHub'
		);
	}

	/**
	 * Gets the authenticated user's information
	 * @returns {Promise<Object>} User information
	 */
	async getUserInfo() {
		const response = await this.makeRequest('/user');
		return response.json();
	}

	/**
	 * Creates a new repository
	 * @param {string} name - Repository name
	 * @param {string} description - Repository description
	 * @param {boolean} [private=false] - Whether repository should be private
	 * @param {boolean} [autoInit=true] - Whether to initialize with README
	 * @returns {Promise<GitHubRepository>} Created repository information
	 */
	async createRepository(name, description, isPrivate = false, autoInit = true) {
		console.log(`🔄 Creating GitHub repository: ${name}`);

		const repositoryData = {
			name,
			description,
			private: isPrivate,
			auto_init: autoInit,
			gitignore_template: 'Node',
			license_template: 'mit'
		};

		const response = await this.makeRequest('/user/repos', {
			method: 'POST',
			body: JSON.stringify(repositoryData)
		});

		const repository = await response.json();

		console.log(`✅ GitHub repository created: ${repository.full_name}`);

		return {
			name: repository.name,
			fullName: repository.full_name,
			cloneUrl: repository.clone_url,
			htmlUrl: repository.html_url,
			private: repository.private
		};
	}

	/**
	 * Checks if a repository exists
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @returns {Promise<boolean>} Whether repository exists
	 */
	async repositoryExists(owner, repo) {
		try {
			await this.makeRequest(`/repos/${owner}/${repo}`);
			return true;
		} catch (error) {
			if (error.message.includes('404')) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * Creates or updates a file in the repository
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @param {GitHubFile} file - File information
	 * @returns {Promise<Object>} Commit information
	 */
	async createOrUpdateFile(owner, repo, file) {
		console.log(`🔄 Creating/updating file: ${file.path} in ${owner}/${repo}`);

		// Get current file SHA if it exists
		let sha = null;
		try {
			const currentFile = await this.makeRequest(`/repos/${owner}/${repo}/contents/${file.path}`);
			const currentFileData = await currentFile.json();
			sha = currentFileData.sha;
		} catch (error) {
			// File doesn't exist, which is fine for new files
			if (!error.message.includes('404')) {
				throw error;
			}
		}

		const fileData = {
			message: file.message,
			content: Buffer.from(file.content).toString('base64'),
			branch: file.branch || 'main'
		};

		if (sha) {
			fileData.sha = sha;
		}

		const response = await this.makeRequest(`/repos/${owner}/${repo}/contents/${file.path}`, {
			method: 'PUT',
			body: JSON.stringify(fileData)
		});

		const result = await response.json();

		console.log(`✅ File ${sha ? 'updated' : 'created'}: ${file.path}`);

		return result;
	}

	/**
	 * Creates multiple files in a single commit
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @param {GitHubFile[]} files - Array of files to create
	 * @param {string} commitMessage - Commit message
	 * @returns {Promise<Object>} Commit information
	 */
	async createMultipleFiles(owner, repo, files, commitMessage) {
		console.log(`🔄 Creating ${files.length} files in ${owner}/${repo}`);

		// Get the latest commit SHA
		const referenceResponse = await this.makeRequest(`/repos/${owner}/${repo}/git/refs/heads/main`);
		const referenceData = await referenceResponse.json();
		const latestCommitSha = referenceData.object.sha;

		// Get the tree SHA
		const commitResponse = await this.makeRequest(
			`/repos/${owner}/${repo}/git/commits/${latestCommitSha}`
		);
		const commitData = await commitResponse.json();
		const baseTreeSha = commitData.tree.sha;

		// Create tree entries for all files
		const treeEntries = files.map((file) => ({
			path: file.path,
			mode: '100644',
			type: 'blob',
			content: file.content
		}));

		// Create new tree
		const treeResponse = await this.makeRequest(`/repos/${owner}/${repo}/git/trees`, {
			method: 'POST',
			body: JSON.stringify({
				base_tree: baseTreeSha,
				tree: treeEntries
			})
		});
		const treeData = await treeResponse.json();

		// Create commit
		const newCommitResponse = await this.makeRequest(`/repos/${owner}/${repo}/git/commits`, {
			method: 'POST',
			body: JSON.stringify({
				message: commitMessage,
				tree: treeData.sha,
				parents: [latestCommitSha]
			})
		});
		const newCommitData = await newCommitResponse.json();

		// Update branch reference
		await this.makeRequest(`/repos/${owner}/${repo}/git/refs/heads/main`, {
			method: 'PATCH',
			body: JSON.stringify({
				sha: newCommitData.sha
			})
		});

		console.log(`✅ Created ${files.length} files in commit: ${newCommitData.sha}`);

		return newCommitData;
	}

	/**
	 * Sets up a webhook for the repository
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @param {string} webhookUrl - Webhook URL
	 * @param {string[]} events - Events to listen for
	 * @returns {Promise<Object>} Webhook information
	 */
	async createWebhook(owner, repo, webhookUrl, events = ['push', 'pull_request']) {
		console.log(`🔄 Creating webhook for ${owner}/${repo}`);

		const webhookData = {
			name: 'web',
			active: true,
			events,
			config: {
				url: webhookUrl,
				content_type: 'json'
			}
		};

		const response = await this.makeRequest(`/repos/${owner}/${repo}/hooks`, {
			method: 'POST',
			body: JSON.stringify(webhookData)
		});

		const webhook = await response.json();

		console.log(`✅ Webhook created: ${webhook.id}`);

		return webhook;
	}

	/**
	 * Gets repository information
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @returns {Promise<Object>} Repository information
	 */
	async getRepository(owner, repo) {
		const response = await this.makeRequest(`/repos/${owner}/${repo}`);
		return response.json();
	}

	/**
	 * Lists user's repositories
	 * @param {string} [type='all'] - Repository type (all, owner, public, private)
	 * @param {string} [sort='updated'] - Sort order (created, updated, pushed, full_name)
	 * @param {number} [perPage=30] - Number of repositories per page
	 * @returns {Promise<Object[]>} Array of repositories
	 */
	async listRepositories(type = 'all', sort = 'updated', perPage = 30) {
		const parameters = new URLSearchParams({
			type,
			sort,
			per_page: perPage.toString()
		});

		const response = await this.makeRequest(`/user/repos?${parameters.toString()}`);
		return response.json();
	}

	/**
	 * Deletes a repository
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @returns {Promise<void>}
	 */
	async deleteRepository(owner, repo) {
		console.log(`🔄 Deleting repository: ${owner}/${repo}`);

		await this.makeRequest(`/repos/${owner}/${repo}`, {
			method: 'DELETE'
		});

		console.log(`✅ Repository deleted: ${owner}/${repo}`);
	}

	/**
	 * Validates the GitHub token by making a test API call
	 * @returns {Promise<boolean>} Whether the token is valid
	 */
	async validateToken() {
		try {
			await this.getUserInfo();
			return true;
		} catch (error) {
			console.error(`❌ GitHub token validation failed: ${error.message}`);
			return false;
		}
	}
}
