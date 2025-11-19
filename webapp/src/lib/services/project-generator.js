// webapp/src/lib/services/project-generator.js

import { capabilities } from '$lib/config/capabilities';
import { ProjectConfig } from '$lib/models/project-config';
import { renderTemplate } from '$lib/utils/file-generator';
import { logger } from '$lib/utils/logging';
import { TokenService } from '$lib/server/token-service';
import { getCurrentUser } from '$lib/server/auth-helpers';
import { GitHubAPIService } from '$lib/server/github-api';
import { CircleCIAPIService } from '$lib/server/circleci-api'; // Import CircleCIAPIService
import { DopplerAPIService } from '$lib/server/doppler-api'; // Import DopplerAPIService
import { SonarCloudAPIService } from '$lib/server/sonarcloud-api'; // Import SonarCloudAPIService

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

		logger.info('Generating project preview...', {
			projectName: projectConfig.projectName,
			capabilities: projectConfig.selectedCapabilities
		});

		const generatedFiles = [];
		const templateContext = {
			projectName: projectConfig.projectName,
			githubOwner: projectConfig.repositoryUrl.split('/')[3] // Assuming format https://github.com/owner/repo
		};

		// Generate files based on selected capabilities
		for (const capabilityId of projectConfig.selectedCapabilities) {
			const capability = capabilities.find((c) => c.id === capabilityId);
			if (capability) {
				const capabilityConfig = projectConfig.configuration[capabilityId];
				if (capabilityConfig && capabilityConfig.enabled) {
					switch (capabilityId) {
						case 'circleci':
							generatedFiles.push({
								filePath: '.circleci/config.yml',
								content: renderTemplate('external/circleci-config.yml.hbs', templateContext)
							});
							break;
						case 'doppler':
							generatedFiles.push({
								filePath: 'doppler-project.json',
								content: renderTemplate('external/doppler-project.json.hbs', templateContext)
							});
							break;
						case 'sonarcloud':
							generatedFiles.push({
								filePath: 'sonar-project.properties', // Common SonarQube/SonarCloud config file
								content: renderTemplate('external/sonarcloud-project.xml.hbs', templateContext)
							});
							break;
						// Add other capabilities that generate files here
						default:
							// For capabilities that don't generate specific files, add a dummy README
							generatedFiles.push({
								filePath: `${capability.id}/README.md`,
								content: renderTemplate(`# ${capability.name} for ${projectConfig.projectName}`, {})
							});
							break;
					}
				}
			} else {
				// Handles UNKNOWN capabilities by generating a default README
				logger.warn(`Unknown capability selected: ${capabilityId}. Generating a default README.`, {
					capabilityId
				});
				const capabilityConfig = projectConfig.configuration[capabilityId];
				if (capabilityConfig && capabilityConfig.enabled) {
					generatedFiles.push({
						filePath: `${capabilityId}/README.md`,
						content: renderTemplate(`# ${capabilityId} for ${projectConfig.projectName}`, {})
					});
				}
			}
		}

		// Add a main README.md
		generatedFiles.push({
			filePath: 'README.md',
			content: renderTemplate(
				`# ${projectConfig.projectName}

This project was generated with the following capabilities: ${projectConfig.selectedCapabilities.join(', ')}`,
				{}
			)
		});

		logger.info('Project preview generated successfully', { filesCount: generatedFiles.length });
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
		logger.info('Generating full project...', {
			projectName: projectConfig.projectName,
			capabilities: projectConfig.selectedCapabilities
		});

		const userId = (await getCurrentUser(request, platform))?.id;
		if (!userId) {
			return { success: false, message: 'Unauthorized: User session not found.' };
		}

		const tokenService = new TokenService(platform.env.D1_DATABASE);
		const storedTokens = await tokenService.getTokensByUserId(userId);

		logger.info('Retrieved stored tokens for user', { userId, tokenCount: storedTokens.length });

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

		try {
			logger.info(`Creating GitHub repository: ${owner}/${repoName}`);
			await githubApiService.createRepository(
				repoName,
				false,
				`Project generated by genproj: ${projectConfig.projectName}`
			);
			logger.info(`GitHub repository created: ${owner}/${repoName}`);
		} catch (error) {
			logger.error(`Failed to create GitHub repository: ${error.message}`, error);
			return { success: false, message: `Failed to create GitHub repository: ${error.message}` };
		}

		const preview = await this.generatePreview(projectConfig);

		try {
			logger.info(`Committing ${preview.files.length} files to repository...`);
			await githubApiService.createMultipleFiles(
				owner,
				repoName,
				preview.files,
				`Initial commit for ${projectConfig.projectName}`
			);
			logger.info(`Committed ${preview.files.length} files to repository`);
		} catch (error) {
			logger.error(`Failed to commit files to GitHub repository: ${error.message}`, error);
			return {
				success: false,
				message: `Failed to commit files to GitHub repository: ${error.message}`
			};
		}

		// Implement external service project creation
		logger.info('Configuring external services...');
		const externalServiceResults = [];

		for (const capabilityId of projectConfig.selectedCapabilities) {
			const capabilityConfig = projectConfig.configuration[capabilityId];
			if (capabilityConfig && capabilityConfig.enabled) {
				switch (capabilityId) {
					case 'circleci': {
						const circleciToken = storedTokens.find(
							(t) => t.serviceName === 'CircleCI'
						)?.accessToken;
						if (circleciToken) {
							logger.info(`Configuring CircleCI for ${projectConfig.projectName}...`);
							const circleciApiService = new CircleCIAPIService(circleciToken);
							try {
								await circleciApiService.followProject(owner, repoName);
								externalServiceResults.push({
									service: 'CircleCI',
									success: true,
									message: 'CircleCI configured successfully'
								});
								logger.info('CircleCI configured successfully');
							} catch (error) {
								logger.error(`CircleCI configuration failed: ${error.message}`, error);
								externalServiceResults.push({
									service: 'CircleCI',
									success: false,
									message: `CircleCI configuration failed: ${error.message}`
								});
							}
						} else {
							externalServiceResults.push({
								service: 'CircleCI',
								success: false,
								message: 'CircleCI token not found.'
							});
						}
						break;
					}
					case 'doppler': {
						const dopplerToken = storedTokens.find((t) => t.serviceName === 'Doppler')?.accessToken;
						if (dopplerToken) {
							logger.info(`Configuring Doppler for ${projectConfig.projectName}...`);
							const dopplerApiService = new DopplerAPIService(dopplerToken);
							try {
								await dopplerApiService.createProject(
									projectConfig.projectName,
									`Secrets for ${projectConfig.projectName}`
								);
								externalServiceResults.push({
									service: 'Doppler',
									success: true,
									message: 'Doppler configured successfully'
								});
								logger.info('Doppler configured successfully');
							} catch (error) {
								logger.error(`Doppler configuration failed: ${error.message}`, error);
								externalServiceResults.push({
									service: 'Doppler',
									success: false,
									message: `Doppler configuration failed: ${error.message}`
								});
							}
						} else {
							externalServiceResults.push({
								service: 'Doppler',
								success: false,
								message: 'Doppler token not found.'
							});
						}
						break;
					}
					case 'sonarcloud': {
						const sonarcloudToken = storedTokens.find(
							(t) => t.serviceName === 'SonarCloud'
						)?.accessToken;
						if (sonarcloudToken) {
							logger.info(`Configuring SonarCloud for ${projectConfig.projectName}...`);
							const sonarcloudApiService = new SonarCloudAPIService(sonarcloudToken);
							try {
								// Assuming organization is part of projectConfig or derived
								const organization = owner; // Use GitHub owner as SonarCloud organization for simplicity
								await sonarcloudApiService.createProject(
									organization,
									projectConfig.projectName,
									projectConfig.projectName
								);
								externalServiceResults.push({
									service: 'SonarCloud',
									success: true,
									message: 'SonarCloud configured successfully'
								});
								logger.info('SonarCloud configured successfully');
							} catch (error) {
								logger.error(`SonarCloud configuration failed: ${error.message}`, error);
								externalServiceResults.push({
									service: 'SonarCloud',
									success: false,
									message: `SonarCloud configuration failed: ${error.message}`
								});
							}
						} else {
							externalServiceResults.push({
								service: 'SonarCloud',
								success: false,
								message: 'SonarCloud token not found.'
							});
						}
						break;
					}
					// Add other external services here
				}
			}
		}
		logger.info(
			`Configured ${externalServiceResults.filter((r) => r.success).length} external services`
		);

		return {
			success: true,
			message: 'Project generation completed successfully.',
			files: preview.files,
			externalServiceResults
		};
	}
}
