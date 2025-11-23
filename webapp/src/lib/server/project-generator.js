/**
 * Project Generator Service
 *
 * Orchestrates the complete project generation process, coordinating between
 * external services and file generation in the genproj tool.
 *
 * @fileoverview Server-side project generation orchestration service
 */

import { GitHubAPIService } from './github-api.js';
import { CircleCIAPIService } from './circleci-api.js';
import { DopplerAPIService } from './doppler-api.js';
import { SonarCloudAPIService } from './sonarcloud-api.js';
import { generateAllFiles } from '$lib/utils/file-generator.js';

/**
 * @typedef {Object} ProjectGenerationContext
 * @property {string} projectName - Name of the project
 * @property {string} [repositoryUrl] - Repository URL if provided
 * @property {string[]} capabilities - Selected capabilities
 * @property {Object} configuration - Capability-specific configuration
 * @property {Object} authTokens - Authentication tokens for external services
 * @property {string} userId - User ID from authentication
 */

/**
 * @typedef {Object} GenerationResult
 * @property {boolean} success - Whether generation was successful
 * @property {string} [error] - Error message if generation failed
 * @property {Object} [repository] - Repository information if created
 * @property {Object} [externalServices] - External service results
 * @property {Object[]} [generatedFiles] - Generated files information
 * @property {number} generationTimeMs - Time taken to generate in milliseconds
 */

/**
 * Project Generator service class
 */
export class ProjectGeneratorService {
	/**
	 * Creates a new Project Generator service instance
	 * @param {Object} authTokens - Authentication tokens for external services
	 */
	constructor(authTokens) {
		this.authTokens = authTokens;
		this.services = {};

		// Initialize external service clients
		if (authTokens.github) {
			this.services.github = new GitHubAPIService(authTokens.github);
		}
		if (authTokens.circleci) {
			this.services.circleci = new CircleCIAPIService(authTokens.circleci);
		}
		if (authTokens.doppler) {
			this.services.doppler = new DopplerAPIService(authTokens.doppler);
		}
		if (authTokens.sonarcloud) {
			this.services.sonarcloud = new SonarCloudAPIService(authTokens.sonarcloud);
		}
	}

	/**
	 * Generates a complete project with all selected capabilities
	 * @param {ProjectGenerationContext} context - Generation context
	 * @returns {Promise<GenerationResult>} Generation result
	 */
	async generateProject(context) {
		const startTime = Date.now();
		console.log(`🔄 Starting project generation: ${context.projectName}`);

		try {
			// Step 1: Generate project files
			console.log('📝 Generating project files...');
			const generatedFiles = await generateAllFiles(context);
			console.log(`✅ Generated ${generatedFiles.length} files`);

			// Step 2: Create GitHub repository
			console.log('🐙 Creating GitHub repository...');
			const repository = await this.createGitHubRepository(context);
			console.log(`✅ GitHub repository created: ${repository.fullName}`);

			// Step 3: Commit files to repository
			console.log('📤 Committing files to repository...');
			await this.commitFilesToRepository(repository, generatedFiles, context);
			console.log(`✅ Committed ${generatedFiles.length} files to repository`);

			// Step 4: Configure external services
			console.log('🔧 Configuring external services...');
			const externalServices = await this.configureExternalServices(context, repository);
			console.log(`✅ Configured ${Object.keys(externalServices).length} external services`);

			const generationTimeMs = Date.now() - startTime;
			console.log(`🎉 Project generation completed in ${generationTimeMs}ms`);

			return {
				success: true,
				repository,
				externalServices,
				generatedFiles,
				generationTimeMs
			};
		} catch (error) {
			const generationTimeMs = Date.now() - startTime;
			console.error(`❌ Project generation failed: ${error.message}`);

			return {
				success: false,
				error: error.message,
				generationTimeMs
			};
		}
	}

	/**
	 * Creates a GitHub repository
	 * @param {ProjectGenerationContext} context - Generation context
	 * @returns {Promise<Object>} Repository information
	 */
	async createGitHubRepository(context) {
		if (!this.services.github) {
			throw new Error('GitHub authentication required for repository creation');
		}

		const { projectName, capabilities } = context;

		// Generate repository description
		const capabilityNames = capabilities.map((cap) => {
			const capabilityMap = {
				sveltekit: 'SvelteKit',
				tailwindcss: 'TailwindCSS',
				typescript: 'TypeScript',
				testing: 'Testing',
				playwright: 'Playwright',
				devcontainer: 'DevContainer',
				circleci: 'CircleCI',
				sonarcloud: 'SonarCloud',
				doppler: 'Doppler'
			};
			return capabilityMap[cap] || cap;
		});

		const description = `A ${capabilityNames.join(', ')} project generated with genproj`;

		// Create repository
		const repository = await this.services.github.createRepository(
			projectName,
			description,
			false, // public
			true // auto-init
		);

		return repository;
	}

	/**
	 * Commits generated files to the repository
	 * @param {Object} repository - Repository information
	 * @param {Object[]} generatedFiles - Generated files
	 * @param {ProjectGenerationContext} context - Generation context
	 * @returns {Promise<void>}
	 */
	async commitFilesToRepository(repository, generatedFiles, context) {
		if (!this.services.github) {
			throw new Error('GitHub authentication required for file commits');
		}

		const [owner, repo] = repository.fullName.split('/');

		// Convert generated files to GitHub file format
		const githubFiles = generatedFiles.map((file) => ({
			path: file.path,
			content: file.content,
			message: `Add ${file.path}`
		}));

		// Create commit with all files
		await this.services.github.createMultipleFiles(
			owner,
			repo,
			githubFiles,
			`Initial commit: Generated project with ${context.capabilities.length} capabilities`
		);
	}

	/**
	 * Configures external services based on selected capabilities
	 * @param {ProjectGenerationContext} context - Generation context
	 * @param {Object} repository - Repository information
	 * @returns {Promise<Object>} External service results
	 */
	async configureExternalServices(context, repository) {
		const results = {};
		const [owner, repo] = repository.fullName.split('/');

		// Configure CircleCI if selected
		if (context.capabilities.includes('circleci') && this.services.circleci) {
			try {
				console.log('🔄 Configuring CircleCI...');
				const circleciProject = await this.services.circleci.followProject('github', owner, repo);
				results.circleci = {
					success: true,
					project: circleciProject
				};
				console.log('✅ CircleCI configured successfully');
			} catch (error) {
				console.error(`❌ CircleCI configuration failed: ${error.message}`);
				results.circleci = {
					success: false,
					error: error.message
				};
			}
		}

		// Configure Doppler if selected
		if (context.capabilities.includes('doppler') && this.services.doppler) {
			try {
				console.log('🔄 Configuring Doppler...');
				const dopplerProject = await this.services.doppler.createProject(
					context.projectName,
					`Secrets management for ${context.projectName}`
				);

				// Create development environment
				await this.services.doppler.createEnvironment(dopplerProject.slug, 'Development', 'dev');

				results.doppler = {
					success: true,
					project: dopplerProject
				};
				console.log('✅ Doppler configured successfully');
			} catch (error) {
				console.error(`❌ Doppler configuration failed: ${error.message}`);
				results.doppler = {
					success: false,
					error: error.message
				};
			}
		}

		// Configure SonarCloud if selected
		if (context.capabilities.includes('sonarcloud') && this.services.sonarcloud) {
			try {
				console.log('🔄 Configuring SonarCloud...');
				const projectKey = `${owner}_${repo}`;
				const sonarcloudProject = await this.services.sonarcloud.createProject(
					owner,
					projectKey,
					context.projectName
				);

				// Associate default quality gate
				const qualityGates = await this.services.sonarcloud.listQualityGates();
				const defaultQualityGate = qualityGates.find((gate) => gate.isDefault);
				if (defaultQualityGate) {
					await this.services.sonarcloud.associateQualityGate(projectKey, defaultQualityGate.id);
				}

				results.sonarcloud = {
					success: true,
					project: sonarcloudProject
				};
				console.log('✅ SonarCloud configured successfully');
			} catch (error) {
				console.error(`❌ SonarCloud configuration failed: ${error.message}`);
				results.sonarcloud = {
					success: false,
					error: error.message
				};
			}
		}

		return results;
	}

	/**
	 * Validates that all required authentication tokens are available
	 * @param {string[]} capabilities - Selected capabilities
	 * @returns {Object} Validation result
	 */
	validateAuthentication(capabilities) {
		const required = [];
		const missing = [];

		// GitHub is always required
		if (!this.authTokens.github) {
			missing.push('GitHub');
		}

		// Check capability-specific requirements
		if (capabilities.includes('circleci') && !this.authTokens.circleci) {
			missing.push('CircleCI');
		}
		if (capabilities.includes('doppler') && !this.authTokens.doppler) {
			missing.push('Doppler');
		}
		if (capabilities.includes('sonarcloud') && !this.authTokens.sonarcloud) {
			missing.push('SonarCloud');
		}

		return {
			isValid: missing.length === 0,
			missing,
			required: ['GitHub', ...required]
		};
	}

	/**
	 * Validates all authentication tokens
	 * @returns {Promise<Object>} Validation results
	 */
	async validateAllTokens() {
		const results = {};

		for (const [service, token] of Object.entries(this.authTokens)) {
			if (token && this.services[service]) {
				try {
					results[service] = await this.services[service].validateToken();
				} catch (error) {
					// Intentionally catch and ignore errors to set default value for token validation
					console.log(`⚠️ Token validation failed for ${service}: ${error.message}`);
					results[service] = false;
				}
			} else {
				results[service] = false;
			}
		}

		return results;
	}
}
