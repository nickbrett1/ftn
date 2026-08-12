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
 * Files that accumulate capability contributions across regenerations and must
 * be MERGED (not skipped, not clobbered) when they diverge. Round-4
 * (memo genproj-fixes-round4): devcontainer.json is the single known case —
 * its final state is the union of (capability contributions) + (manual edits).
 * @param {string} filePath - Generated file path
 * @returns {boolean} True when the file is a merge-target
 */
export function isMergeTargetFile(filePath) {
	return filePath === '.devcontainer/devcontainer.json';
}

/**
 * Merges the freshly-generated devcontainer.json into the existing one,
 * monotonically (round-4 semantics):
 * - customizations.vscode.extensions: union (existing first, then additions)
 * - mounts: append entries whose target path is not already present
 * - features / containerEnv: merge maps (existing keys win, generated-only added)
 * - all other keys (workspaceFolder, postCreateCommand, runArgs, ...): keep
 *   existing values — never clobber project/user-owned settings
 * Nothing is ever removed, so re-merging the same inputs is a no-op.
 * @param {string} existingContent - Current file content in the repo
 * @param {string} generatedContent - Freshly generated file content
 * @returns {string} Merged JSON (2-space indent, matching generated style)
 */
export function mergeDevcontainerJson(existingContent, generatedContent) {
	const existing = JSON.parse(existingContent);
	const generated = JSON.parse(generatedContent);

	// --- extensions: union, existing first, additions appended ---
	const existingExtensions =
		existing?.customizations?.vscode?.extensions &&
		Array.isArray(existing.customizations.vscode.extensions)
			? [...existing.customizations.vscode.extensions]
			: [];
	const generatedExtensions =
		generated?.customizations?.vscode?.extensions &&
		Array.isArray(generated.customizations.vscode.extensions)
			? generated.customizations.vscode.extensions
			: [];
	const extensionSet = new Set(existingExtensions);
	for (const extension of generatedExtensions) {
		if (!extensionSet.has(extension)) {
			extensionSet.add(extension);
			existingExtensions.push(extension);
		}
	}

	// --- mounts: union keyed by container target path ---
	const mountTarget = (mount) => {
		const match = typeof mount === 'string' ? mount.match(/target=([^,]+)/) : null;
		return match ? match[1] : mount;
	};
	const existingMounts = Array.isArray(existing.mounts) ? [...existing.mounts] : [];
	const generatedMounts = Array.isArray(generated.mounts) ? generated.mounts : [];
	const mountTargets = new Set(existingMounts.map(mountTarget));
	for (const mount of generatedMounts) {
		if (!mountTargets.has(mountTarget(mount))) {
			mountTargets.add(mountTarget(mount));
			existingMounts.push(mount);
		}
	}

	// --- features / containerEnv: merge maps (existing keys win) ---
	const mergedFeatures = { ...(generated.features || {}), ...(existing.features || {}) };
	const mergedEnv = { ...(generated.containerEnv || {}), ...(existing.containerEnv || {}) };

	// --- result: start from existing, apply merged sections ---
	const merged = JSON.parse(JSON.stringify(existing));
	if (existingExtensions.length > 0) {
		merged.customizations = merged.customizations || {};
		merged.customizations.vscode = merged.customizations.vscode || {};
		merged.customizations.vscode.extensions = existingExtensions;
	}
	if (existingMounts.length > 0) {
		merged.mounts = existingMounts;
	}
	if (Object.keys(mergedFeatures).length > 0) {
		merged.features = mergedFeatures;
	}
	if (Object.keys(mergedEnv).length > 0) {
		merged.containerEnv = mergedEnv;
	}

	return JSON.stringify(merged, undefined, 2);
}

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
			// Step 0: Resolve the registry namespace from the authenticated
			// GitHub identity so generated artifacts reference a real image
			// (e.g. ghcr.io/<login>/<project>) instead of an OWNER placeholder.
			if (this.services.github && !context.registryNamespace) {
				try {
					const githubUser = await this.services.github.getUserInfo();
					if (githubUser?.login) {
						context.registryNamespace = githubUser.login;
					}
				} catch (error) {
					console.warn('⚠️ Could not resolve GitHub login for registry namespace:', error);
				}
			}

			// Step 1: Generate project files
			console.log('📝 Generating project files...');
			const generatedFiles = await generateAllFiles(context);
			console.log(`✅ Generated ${generatedFiles.length} files`);

			// Step 2: Create GitHub repository
			console.log('🐙 Creating GitHub repository...');
			const repo = await this.createGitHubRepository(context);
			console.log(`✅ GitHub repository created: ${repo.fullName}`);

			// Step 3: Commit files to repository
			console.log('📤 Committing files to repository...');
			await this.commitFilesToRepository(repo, generatedFiles, context);
			console.log(`✅ Committed ${generatedFiles.length} files to repository`);

			// Step 4: Configure external services
			console.log('🔧 Configuring external services...');
			const externalServices = await this.configureExternalServices(context, repo);
			console.log(`✅ Configured ${Object.keys(externalServices).length} external services`);

			const generationTimeMs = Date.now() - startTime;
			console.log(`🎉 Project generation completed in ${generationTimeMs}ms`);

			return {
				success: true,
				repository: repo,
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
				errorCode: error.code,
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

		const { projectName, capabilities, overwrite } = context;

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
		try {
			const repo = await this.services.github.createRepository(
				projectName,
				description,
				false, // public
				true // auto-init
			);
			return repo;
		} catch (error) {
			if (error.code === 'REPOSITORY_EXISTS' && overwrite) {
				console.log(`⚠️ Repository exists, overwriting: ${projectName}`);
				const user = await this.services.github.getUserInfo();
				const existingRepo = await this.services.github.getRepository(user.login, projectName);

				return {
					name: existingRepo.name,
					fullName: existingRepo.fullName,
					cloneUrl: existingRepo.cloneUrl,
					htmlUrl: existingRepo.htmlUrl,
					private: existingRepo.private,
					defaultBranch: existingRepo.defaultBranch
				};
			}
			throw error;
		}
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
		const resolutions = context.resolutions || {};
		const overwrite = context.overwrite || false;

		// Round-3 fix (memo genproj-fixes-round3): make overwrite IDEMPOTENT.
		// On regeneration, only write a file when it is absent OR its current
		// content is byte-identical to the generated content OR the user
		// explicitly resolved that path to 'overwrite'. A diverged file is
		// NEVER silently replaced — this protects app code that has taken over
		// a template-owned path (e.g. src/<pkg>/__main__.py) from being
		// clobbered by a scaffold placeholder.
		let existingContentByPath = null;
		if (overwrite) {
			existingContentByPath = new Map();
			for (const file of generatedFiles) {
				const existing = await this.services.github.getFileContent(owner, repo, file.filePath);
				existingContentByPath.set(file.filePath, existing);
			}
		}

		// Filter files based on resolutions + idempotent overwrite policy.
		// Round-4 (memo genproj-fixes-round4): merge-target files
		// (.devcontainer/devcontainer.json) get MERGED rather than skipped when
		// they diverge — capability contributions (extensions, mounts,
		// features) must land on regen without clobbering manual edits.
		const filesToCommit = [];
		for (const file of generatedFiles) {
			const resolution = resolutions[file.filePath];
			if (resolution === 'keep') {
				continue;
			}
			if (!overwrite) {
				// Fresh repository: generated files do not exist yet — write all.
				filesToCommit.push(file);
				continue;
			}
			const existing = existingContentByPath.get(file.filePath);
			if (existing === null || existing === undefined) {
				filesToCommit.push(file); // file absent → create it
				continue;
			}
			if (existing === file.content) {
				continue; // byte-identical → nothing to do (idempotent)
			}
			if (resolution === 'overwrite') {
				filesToCommit.push(file); // explicitly resolved → full replace
				continue;
			}
			if (isMergeTargetFile(file.filePath)) {
				const merged = mergeDevcontainerJson(existing, file.content);
				if (merged === existing) {
					continue; // merge is a no-op (monotonic across regens)
				}
				filesToCommit.push({ ...file, content: merged });
				continue;
			}
			console.log(
				`⚠️ Preserving diverged file ${file.filePath} (differs from generated content; pass resolution 'overwrite' to replace it)`
			);
		}

		// Convert generated files to GitHub file format
		const githubFiles = filesToCommit.map((file) => ({
			path: file.filePath,
			content: file.content,
			message: `Add ${file.filePath}`
		}));

		if (githubFiles.length === 0) {
			console.log('⚠️ No files to commit after applying conflict resolutions');
			return;
		}

		// Create commit with all files
		await this.services.github.createMultipleFiles(
			owner,
			repo,
			githubFiles,
			`Initial commit: Generated project with ${context.capabilities.length} capabilities`,
			repository.defaultBranch || 'main'
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

		await this.#configureCircleCI(context, owner, repo, results);
		await this.#configureDoppler(context, results);
		await this.#configureDependabot(context, owner, repo, results);
		await this.#configureSonarCloud(context, owner, repo, results);

		return results;
	}

	async #configureCircleCI(context, owner, repo, results) {
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
	}

	async #configureDoppler(context, results) {
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
	}

	async #configureDependabot(context, owner, repo, results) {
		// Dependabot is fully configured by the generated files:
		// - .github/dependabot.yml (update schedule)
		// - .github/workflows/dependabot-auto-merge.yml (auto-merge via the
		//   default GITHUB_TOKEN with write permissions — no PAT secret needed)
		if (context.capabilities.includes('dependabot')) {
			console.log('🔄 Configuring Dependabot...');
			results.dependabot = {
				success: true
			};
			console.log('✅ Dependabot configured successfully');
		}
	}

	async #configureSonarCloud(context, owner, repo, results) {
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

	/**
	 * Checks for conflicts between generated files and existing repository files
	 * @param {ProjectGenerationContext} context - Generation context
	 * @returns {Promise<Object[]>} List of conflicts
	 */
	async checkConflicts(context) {
		if (!this.services.github) {
			throw new Error('GitHub authentication required for conflict checking');
		}

		const { projectName } = context;
		const user = await this.services.github.getUserInfo();

		// Check if repo exists first
		const exists = await this.services.github.repositoryExists(user.login, projectName);
		if (!exists) {
			return [];
		}

		console.log('🔍 Checking for file conflicts...');
		const generatedFiles = await generateAllFiles(context);
		const conflicts = [];

		// In a real scenario, we might want to optimize this by fetching the git tree
		// For now, we'll check each file individually as the number of generated files is usually small
		for (const file of generatedFiles) {
			// Round-4: merge-target files (devcontainer.json) are auto-merged on
			// overwrite — they are never a user-resolvable conflict.
			if (isMergeTargetFile(file.filePath)) {
				continue;
			}
			const existingContent = await this.services.github.getFileContent(
				user.login,
				projectName,
				file.filePath
			);

			// If file exists and content is different
			if (existingContent !== null && existingContent !== file.content) {
				conflicts.push({
					path: file.filePath,
					generatedContent: file.content,
					existingContent: existingContent
				});
			}
		}

		console.log(`⚠️ Found ${conflicts.length} file conflicts`);
		return conflicts;
	}
}
