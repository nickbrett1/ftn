// webapp/src/lib/services/project-generator.js

import { capabilities } from '$lib/config/capabilities';
import { ProjectConfig } from '$lib/models/project-config';

import { logError, log } from '$lib/utils/logging';
import { TokenService } from '$lib/server/token-service';
import { getCurrentUser } from '$lib/server/auth';
import { GitHubAPIService } from '$lib/server/github-api';
import { CircleCIAPIService } from '$lib/server/circleci-api';
import { DopplerAPIService } from '$lib/server/doppler-api';
import { SonarCloudAPIService } from '$lib/server/sonarcloud-api';

/**
 * Service for generating project files based on selected capabilities.
 */
export class ProjectGeneratorService {
	/**
	 * @param {boolean} testMode - If true, generatePreview will return testFiles directly.
	 * @param {Array} testFiles - Files to return when in testMode.
	 */
	constructor(testMode = false, testFiles = []) {
		this.testMode = testMode;
		this.testFiles = testFiles;
	}

	/**
	 * Generates a preview of project files based on the provided configuration.
	 * @param {ProjectConfig} projectConfig - The project configuration.
	 * @returns {Promise<{files: {filePath: string, content: string}[]}>} A promise that resolves to an array of generated files.
	 */
	async generatePreview(projectConfig) {
		if (this.testMode) {
			return { files: this.testFiles };
		}

		log('Generating project preview...', 'GEN', {
			projectName: projectConfig.projectName,
			capabilities: projectConfig.selectedCapabilities
		});

		const generatedFiles = [];
		// Generate files based on selected capabilities
		for (const capabilityId of projectConfig.selectedCapabilities) {
			const capability = capabilities.find((c) => c.id === capabilityId);
			if (capability) {
				const capabilityConfig = projectConfig.configuration[capabilityId];
				if (capabilityConfig?.enabled) {
					switch (capabilityId) {
						case 'circleci': {
							generatedFiles.push({
								filePath: '.circleci/config.yml',
								content: '# TODO: Add CircleCI config\n'
							});
							break;
						}
						case 'doppler': {
							generatedFiles.push({
								filePath: 'doppler-project.json',
								content: '{\n  "name": "project-name"\n}\n' // Basic placeholder
							});
							break;
						}
						case 'sonarcloud': {
							generatedFiles.push({
								filePath: 'sonar-project.properties', // Common SonarQube/SonarCloud config file
								content: 'sonar.projectKey=my-project\n' // Basic placeholder
							});
							break;
						}
						// Add other capabilities that generate files here
						default: {
							// For capabilities that don't generate specific files, add a dummy README
							generatedFiles.push({
								filePath: `${capability.id}/README.md`,
								content: `# ${capability.name} for ${projectConfig.projectName}`
							});
							break;
						}
					}
				}
			} else {
				logError(`Unknown capability selected: ${capabilityId}`, { capabilityId });
			}
		}

		// Add a main README.md
		generatedFiles.push({
			filePath: 'README.md',
			content: `# ${projectConfig.projectName}

This project was generated with the following capabilities: ${projectConfig.selectedCapabilities.join(', ')}`
		});

		log('Project preview generated successfully', 'GEN', { filesCount: generatedFiles.length });
		return { files: generatedFiles };
	}

	/**
	 * Generates a full project based on the provided configuration, including authentication checks.
	 * @param {ProjectConfig} projectConfig - The project configuration.
	 * @param {object} platform - The platform object containing environment bindings (e.g., D1_DATABASE).
	 * @param {Request} request - The original request object to extract user session.
	 * @returns {Promise<{success: boolean, message: string, files?: {filePath: string, content: string}[]}>}
	 */
	async generateProject(projectConfig, platform, request) {
		log('Generating full project...', 'GEN', {
			projectName: projectConfig.projectName,
			capabilities: projectConfig.selectedCapabilities
		});

		const userId = (await getCurrentUser({ request, platform }))?.id;
		if (!userId) {
			return { success: false, message: 'Unauthorized: User session not found.' };
		}

		const tokenService = new TokenService(platform.env.D1_DATABASE);
		const storedTokens = await tokenService.getTokensByUserId(userId);

		log('Retrieved stored tokens for user', 'GEN', { userId, tokenCount: storedTokens.length });

		const githubToken = storedTokens.find((t) => t.serviceName === 'GitHub')?.accessToken;
		if (!githubToken) {
			return {
				success: false,
				message: 'GitHub token not found. Please authenticate with GitHub.'
			};
		}

		const githubApiService = new GitHubAPIService(githubToken);
		const owner = projectConfig.repositoryUrl.split('/')[3]; // Assuming format https://github.com/owner/repo
		const repoName = projectConfig.projectName; // Use project name as repo name

		const githubResult = await this.setupGitHubRepository(
			githubApiService,
			owner,
			repoName,
			projectConfig
		);
		if (!githubResult.success) {
			return githubResult;
		}

		// Implement external service project creation
		const externalServiceResults = await this.configureExternalServices(
			projectConfig,
			storedTokens,
			owner,
			repoName
		);

		log(
			`Configured ${externalServiceResults.filter((r) => r.success).length} external services`,
			'GEN'
		);

		return {
			success: true,
			message: 'Project generation completed successfully.',
			files: githubResult.files,
			externalServiceResults
		};
	}

	async setupGitHubRepository(githubApiService, owner, repoName, projectConfig) {
		try {
			log(`Creating GitHub repository: ${owner}/${repoName}`, 'GEN');
			await githubApiService.createRepository(
				repoName,
				false,
				`Project generated by genproj: ${projectConfig.projectName}`
			);
			log(`GitHub repository created: ${owner}/${repoName}`, 'GEN');
		} catch (error) {
			logError(`Failed to create GitHub repository: ${error.message}`, 'GEN', error);
			return { success: false, message: `Failed to create GitHub repository: ${error.message}` };
		}

		const preview = await this.generatePreview(projectConfig);

		try {
			log(`Committing ${preview.files.length} files to repository...`, 'GEN');
			await githubApiService.createMultipleFiles(
				owner,
				repoName,
				preview.files,
				`Initial commit for ${projectConfig.projectName}`
			);
			log(`Committed ${preview.files.length} files to repository`, 'GEN');
		} catch (error) {
			logError(`Failed to commit files to GitHub repository: ${error.message}`, 'GEN', error);
			return {
				success: false,
				message: `Failed to commit files to GitHub repository: ${error.message}`
			};
		}

		return { success: true, files: preview.files };
	}

	async configureExternalServices(projectConfig, storedTokens, owner, repoName) {
		log('Configuring external services...', 'GEN');
		const externalServiceResults = [];

		for (const capabilityId of projectConfig.selectedCapabilities) {
			const capabilityConfig = projectConfig.configuration[capabilityId];
			if (capabilityConfig?.enabled) {
				await this.configureSingleService(
					capabilityId,
					projectConfig,
					storedTokens,
					owner,
					repoName,
					externalServiceResults
				);
			}
		}
		return externalServiceResults;
	}

	async configureSingleService(
		capabilityId,
		projectConfig,
		storedTokens,
		owner,
		repoName,
		results
	) {
		switch (capabilityId) {
			case 'circleci': {
				await this.configureCircleCI(storedTokens, projectConfig, owner, repoName, results);
				break;
			}
			case 'doppler': {
				await this.configureDoppler(storedTokens, projectConfig, results);
				break;
			}
			case 'sonarcloud': {
				await this.configureSonarCloud(storedTokens, projectConfig, owner, results);
				break;
			}
			// Add other external services here
		}
	}

	async configureCircleCI(storedTokens, projectConfig, owner, repoName, results) {
		const circleciToken = storedTokens.find((t) => t.serviceName === 'CircleCI')?.accessToken;
		if (circleciToken) {
			log(`Configuring CircleCI for ${projectConfig.projectName}...`, 'GEN');
			const circleciApiService = new CircleCIAPIService(circleciToken);
			try {
				await circleciApiService.followProject(owner, repoName);
				results.push({
					service: 'CircleCI',
					success: true,
					message: 'CircleCI configured successfully'
				});
				log('CircleCI configured successfully', 'GEN');
			} catch (error) {
				logError(`CircleCI configuration failed: ${error.message}`, 'GEN', error);
				results.push({
					service: 'CircleCI',
					success: false,
					message: `CircleCI configuration failed: ${error.message}`
				});
			}
		} else {
			results.push({
				service: 'CircleCI',
				success: false,
				message: 'CircleCI token not found.'
			});
		}
	}

	async configureDoppler(storedTokens, projectConfig, results) {
		const dopplerToken = storedTokens.find((t) => t.serviceName === 'Doppler')?.accessToken;
		if (dopplerToken) {
			log(`Configuring Doppler for ${projectConfig.projectName}...`, 'GEN');
			const dopplerApiService = new DopplerAPIService(dopplerToken);
			try {
				await dopplerApiService.createProject(
					projectConfig.projectName,
					`Secrets for ${projectConfig.projectName}`
				);
				results.push({
					service: 'Doppler',
					success: true,
					message: 'Doppler configured successfully'
				});
				log('Doppler configured successfully', 'GEN');
			} catch (error) {
				logError(`Doppler configuration failed: ${error.message}`, 'GEN', error);
				results.push({
					service: 'Doppler',
					success: false,
					message: `Doppler configuration failed: ${error.message}`
				});
			}
		} else {
			results.push({
				service: 'Doppler',
				success: false,
				message: 'Doppler token not found.'
			});
		}
	}

	async configureSonarCloud(storedTokens, projectConfig, owner, results) {
		const sonarcloudToken = storedTokens.find((t) => t.serviceName === 'SonarCloud')?.accessToken;
		if (sonarcloudToken) {
			log(`Configuring SonarCloud for ${projectConfig.projectName}...`, 'GEN');
			const sonarcloudApiService = new SonarCloudAPIService(sonarcloudToken);
			try {
				// Assuming organization is part of projectConfig or derived
				const organization = owner; // Use GitHub owner as SonarCloud organization for simplicity
				await sonarcloudApiService.createProject(
					organization,
					projectConfig.projectName,
					projectConfig.projectName
				);
				results.push({
					service: 'SonarCloud',
					success: true,
					message: 'SonarCloud configured successfully'
				});
				log('SonarCloud configured successfully', 'GEN');
			} catch (error) {
				logError(`SonarCloud configuration failed: ${error.message}`, 'GEN', error);
				results.push({
					service: 'SonarCloud',
					success: false,
					message: `SonarCloud configuration failed: ${error.message}`
				});
			}
		} else {
			results.push({
				service: 'SonarCloud',
				success: false,
				message: 'SonarCloud token not found.'
			});
		}
	}
}
