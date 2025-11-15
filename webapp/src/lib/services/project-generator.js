// webapp/src/lib/services/project-generator.js

import { capabilities } from '$lib/config/capabilities';
import { ProjectConfig } from '$lib/models/project-config';
import { renderTemplate } from '$lib/utils/file-generator';
import { logError, log } from '$lib/utils/logging';
import { TokenService } from '$lib/server/token-service';
import { getCurrentUser } from '$lib/server/auth-helpers';
import { GitHubAPIService } from '$lib/services/github-api';
import { CircleCIAPIService } from '$lib/services/circleci-api';
import { DopplerAPIService } from '$lib/services/doppler-api';
import { SonarCloudAPIService } from '$lib/services/sonarcloud-api';

export class ProjectGeneratorService {
	constructor(testMode = false, testFiles = []) {
		this.testMode = testMode;
		this.testFiles = testFiles;
	}

	async generatePreview(projectConfig) {
		if (this.testMode) {
			return { files: this.testFiles };
		}

		log('Generating project preview...', 'GEN', {
			projectName: projectConfig.projectName,
			capabilities: projectConfig.selectedCapabilities
		});

		const generatedFiles = [];
		const templateContext = {
			projectName: projectConfig.projectName,
			githubOwner: projectConfig.repositoryUrl.split('/')[3]
		};

		for (const capabilityId of projectConfig.selectedCapabilities) {
			const capability = capabilities.find((c) => c.id === capabilityId);
			if (!capability) {
				logError(`Unknown capability selected: ${capabilityId}`, { capabilityId });
				continue;
			}
			const capabilityConfig = projectConfig.configuration[capabilityId];
			if (capabilityConfig?.enabled) {
				this.generateCapabilityFiles(capability, templateContext, generatedFiles, projectConfig);
			}
		}

		generatedFiles.push({
			filePath: 'README.md',
			content: renderTemplate(
				`# ${projectConfig.projectName}\n\nThis project was generated with the following capabilities: ${projectConfig.selectedCapabilities.join(
					', '
				)}`,
				{}
			)
		});

		log('Project preview generated successfully', 'GEN', { filesCount: generatedFiles.length });
		return { files: generatedFiles };
	}

	generateCapabilityFiles(capability, templateContext, generatedFiles, projectConfig) {
		switch (capability.id) {
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
					filePath: 'sonar-project.properties',
					content: renderTemplate('external/sonarcloud-project.xml.hbs', templateContext)
				});
				break;
			default:
				generatedFiles.push({
					filePath: `${capability.id}/README.md`,
					content: renderTemplate(`# ${capability.name} for ${projectConfig.projectName}`, {})
				});
				break;
		}
	}

	async generateProject(projectConfig, platform, request) {
		log('Generating full project...', 'GEN', {
			projectName: projectConfig.projectName,
			capabilities: projectConfig.selectedCapabilities
		});

		const userId = (await getCurrentUser(request, platform))?.id;
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

		const [owner, repoName] = this.getRepoInfo(projectConfig);
		const githubApiService = new GitHubAPIService(githubToken);

		try {
			await this.createGitHubRepository(githubApiService, owner, repoName, projectConfig);
			const preview = await this.generatePreview(projectConfig);
			await this.commitFilesToGitHub(githubApiService, owner, repoName, preview.files, projectConfig);
			const externalServiceResults = await this.configureExternalServices(
				projectConfig,
				storedTokens,
				owner,
				repoName
			);

			return {
				success: true,
				message: 'Project generation completed successfully.',
				files: preview.files,
				externalServiceResults
			};
		} catch (error) {
			logError(`Project generation failed: ${error.message}`, 'GEN', error);
			return { success: false, message: `Project generation failed: ${error.message}` };
		}
	}

	getRepoInfo(projectConfig) {
		const owner = projectConfig.repositoryUrl.split('/')[3];
		const repoName = projectConfig.projectName;
		return [owner, repoName];
	}

	async createGitHubRepository(githubApiService, owner, repoName, projectConfig) {
		log(`Creating GitHub repository: ${owner}/${repoName}`, 'GEN');
		await githubApiService.createRepository(
			repoName,
			false,
			`Project generated by genproj: ${projectConfig.projectName}`
		);
		log(`GitHub repository created: ${owner}/${repoName}`, 'GEN');
	}

	async commitFilesToGitHub(githubApiService, owner, repoName, files, projectConfig) {
		log(`Committing ${files.length} files to repository...`, 'GEN');
		await githubApiService.createMultipleFiles(
			owner,
			repoName,
			files,
			`Initial commit for ${projectConfig.projectName}`
		);
		log(`Committed ${files.length} files to repository`, 'GEN');
	}

	async configureExternalServices(projectConfig, storedTokens, owner, repoName) {
		log('Configuring external services...', 'GEN');
		const externalServiceResults = [];
		for (const capabilityId of projectConfig.selectedCapabilities) {
			const capabilityConfig = projectConfig.configuration[capabilityId];
			if (capabilityConfig?.enabled) {
				const result = await this.configureService(
					capabilityId,
					projectConfig,
					storedTokens,
					owner,
					repoName
				);
				if (result) {
					externalServiceResults.push(result);
				}
			}
		}
		log(
			`Configured ${externalServiceResults.filter((r) => r.success).length} external services`,
			'GEN'
		);
		return externalServiceResults;
	}

	async configureService(capabilityId, projectConfig, storedTokens, owner, repoName) {
		switch (capabilityId) {
			case 'circleci':
				return this.configureCircleCI(projectConfig, storedTokens, owner, repoName);
			case 'doppler':
				return this.configureDoppler(projectConfig, storedTokens);
			case 'sonarcloud':
				return this.configureSonarCloud(projectConfig, storedTokens, owner);
			default:
				return null;
		}
	}

	async configureCircleCI(projectConfig, storedTokens, owner, repoName) {
		const circleciToken = storedTokens.find((t) => t.serviceName === 'CircleCI')?.accessToken;
		if (!circleciToken) {
			return { service: 'CircleCI', success: false, message: 'CircleCI token not found.' };
		}
		log(`Configuring CircleCI for ${projectConfig.projectName}...`, 'GEN');
		try {
			const circleciApiService = new CircleCIAPIService(circleciToken);
			await circleciApiService.followProject(owner, repoName);
			log('CircleCI configured successfully', 'GEN');
			return { service: 'CircleCI', success: true, message: 'CircleCI configured successfully' };
		} catch (error) {
			logError(`CircleCI configuration failed: ${error.message}`, 'GEN', error);
			return {
				service: 'CircleCI',
				success: false,
				message: `CircleCI configuration failed: ${error.message}`
			};
		}
	}

	async configureDoppler(projectConfig, storedTokens) {
		const dopplerToken = storedTokens.find((t) => t.serviceName === 'Doppler')?.accessToken;
		if (!dopplerToken) {
			return { service: 'Doppler', success: false, message: 'Doppler token not found.' };
		}
		log(`Configuring Doppler for ${projectConfig.projectName}...`, 'GEN');
		try {
			const dopplerApiService = new DopplerAPIService(dopplerToken);
			await dopplerApiService.createProject(
				projectConfig.projectName,
				`Secrets for ${projectConfig.projectName}`
			);
			log('Doppler configured successfully', 'GEN');
			return { service: 'Doppler', success: true, message: 'Doppler configured successfully' };
		} catch (error) {
			logError(`Doppler configuration failed: ${error.message}`, 'GEN', error);
			return {
				service: 'Doppler',
				success: false,
				message: `Doppler configuration failed: ${error.message}`
			};
		}
	}

	async configureSonarCloud(projectConfig, storedTokens, owner) {
		const sonarcloudToken = storedTokens.find((t) => t.serviceName === 'SonarCloud')?.accessToken;
		if (!sonarcloudToken) {
			return { service: 'SonarCloud', success: false, message: 'SonarCloud token not found.' };
		}
		log(`Configuring SonarCloud for ${projectConfig.projectName}...`, 'GEN');
		try {
			const sonarcloudApiService = new SonarCloudAPIService(sonarcloudToken);
			const organization = owner;
			await sonarcloudApiService.createProject(
				organization,
				projectConfig.projectName,
				projectConfig.projectName
			);
			log('SonarCloud configured successfully', 'GEN');
			return {
				service: 'SonarCloud',
				success: true,
				message: 'SonarCloud configured successfully'
			};
		} catch (error) {
			logError(`SonarCloud configuration failed: ${error.message}`, 'GEN', error);
			return {
				service: 'SonarCloud',
				success: false,
				message: `SonarCloud configuration failed: ${error.message}`
			};
		}
	}
}
