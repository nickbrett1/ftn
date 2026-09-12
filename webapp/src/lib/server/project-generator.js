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
import { BuildkiteAPIService } from './buildkite-api.js';
import { DopplerAPIService } from './doppler-api.js';
import { SonarCloudAPIService } from './sonarcloud-api.js';
import { generateAllFiles } from '$lib/utils/file-generator.js';
import { isAppOwnedPath, isMergeTargetFile } from '$lib/utils/genproj-overwrite.js';
import { getServiceConfig } from '$lib/config/external-services.js';

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
		if (authTokens.buildkite) {
			this.services.buildkite = new BuildkiteAPIService(authTokens.buildkite);
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
			const commit = await this.commitFilesToRepository(repo, generatedFiles, context);
			console.log(`✅ Committed ${generatedFiles.length} files to repository`);

			// Step 4: Configure external services
			console.log('🔧 Configuring external services...');
			const externalServices = await this.configureExternalServices(context, repo, commit);
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
			if (isAppOwnedPath(file.filePath)) {
				// App code (src/, tests/, scripts/, ...): never silently replace.
				console.log(
					`⚠️ Preserving diverged app file ${file.filePath} (differs from generated content; pass resolution 'overwrite' to replace it)`
				);
				continue;
			}
			// Generated infra (Dockerfile, .circleci/, .devcontainer/, pyproject,
			// compose, README, ...): genproj-owned — fresh template content wins
			// on regen so template improvements propagate (e.g. the doppler CLI
			// install added to the Dockerfile in round 5), unless the user
			// explicitly resolved the path to 'keep' (handled above).
			filesToCommit.push(file);
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

		// Create commit with all files. The commit is RETURNED because providers
		// that need a commit (rather than a branch) to trigger a first build -
		// Buildkite's create-build API is one - have nothing else to use.
		return await this.services.github.createMultipleFiles(
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
	async configureExternalServices(context, repository, commit = null) {
		const results = {};
		const [owner, repo] = repository.fullName.split('/');
		const defaultBranch = repository.defaultBranch || 'main';
		// The sha of the initial commit, used to trigger a first build for
		// providers whose create-build API needs a commit rather than a branch.
		const commitSha = commit?.sha || null;

		await this.#configureCircleCI(context, owner, repo, results, defaultBranch);
		await this.#configureBuildkite(context, owner, repo, results, defaultBranch, commitSha);
		await this.#configureDoppler(context, results);
		await this.#configureDependabot(context, owner, repo, results);
		await this.#configureSonarCloud(context, owner, repo, results);

		return results;
	}

	async #configureCircleCI(context, owner, repo, results, defaultBranch = 'main') {
		if (context.capabilities.includes('circleci') && this.services.circleci) {
			try {
				console.log('🔄 Configuring CircleCI...');
				const circleciProject = await this.services.circleci.followProject('github', owner, repo);

				// Sanity-check that CircleCI actually installed its push webhook on
				// the new repo. Without it, pushes won't trigger pipelines even
				// though the project is "followed". This is the authoritative
				// signal that CircleCI is wired up to receive pushes — CircleCI's
				// settings API does NOT support setting the default branch (it
				// only accepts `advanced` fields, so the old `{vcs:...}` payload
				// was rejected with a 400), so the webhook is what matters.
				// Best-effort: a missing webhook must not fail generation.
				const webhookVerified = await this.#hasCircleCIWebhook(owner, repo);
				if (!webhookVerified) {
					console.warn(
						'⚠️ CircleCI followed the project but no circleci.com/hooks/github webhook was found on the repo; pushes will NOT trigger pipelines. Set the project up in the CircleCI web UI (Set Up Project) to install the webhook.'
					);
				}

				// Kick off the first pipeline on the default branch so CI starts
				// immediately and validates the committed config. Best-effort.
				let pipeline = null;
				try {
					pipeline = await this.services.circleci.triggerPipeline(
						'github',
						owner,
						repo,
						defaultBranch
					);
					console.log(`✅ CircleCI first pipeline triggered on ${defaultBranch}`);
				} catch (pipelineError) {
					console.warn(
						`⚠️ Could not trigger first CircleCI pipeline (${pipelineError.message}); it will run on the next push`
					);
				}

				results.circleci = {
					success: true,
					defaultBranch,
					project: circleciProject,
					pipeline: pipeline ? { id: pipeline.id, number: pipeline.number } : undefined,
					webhookVerified
				};
				console.log('✅ CircleCI configured successfully');
			} catch (error) {
				const clearError = await this.#describeCircleCISetupError(error, owner, repo);
				const isSyncRace = /CircleCI API error: 404/.test(error?.message || '');
				if (isSyncRace) {
					// GitHub App repo-sync race: CircleCI indexes a brand-new repo
					// asynchronously and can 404 for several minutes after creation.
					// This is transient — the repo WILL sync and appear, at which
					// point it can be followed (CircleCI "Set Up Project" or a later
					// follow call) and picks up the committed config.yml. Do NOT fail
					// generation: record it as pending so the project still lands.
					console.warn(
						`⚠️ CircleCI sync pending for ${owner}/${repo}: ${clearError}. ` +
							`The project will become available once CircleCI finishes indexing the repo.`
					);
					results.circleci = {
						success: true,
						pendingSync: true,
						error: clearError
					};
					return;
				}
				console.error(`❌ CircleCI configuration failed: ${clearError}`);
				results.circleci = {
					success: false,
					error: clearError
				};
			}
		}
	}

	/**
	 * Provisions a Buildkite pipeline for the newly created repository.
	 *
	 * The pipeline and its GitHub webhook are two different things, and only the
	 * second one makes pushes build. A pipeline created through the API carries a
	 * `provider.webhook_url` and **no webhook behind it**, so every other signal
	 * (the repository connection, `build_branches: true`) looks healthy while
	 * pushes silently do nothing at all. Registering it is one extra call, and
	 * skipping it is the expensive mistake this integration exists to avoid.
	 *
	 * Best-effort, exactly like the CircleCI integration below: a provisioning
	 * failure must not fail generation, but it must be visible in the result.
	 *
	 * @param {Object} context - Generation context
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @param {Object} results - Accumulated results (mutated)
	 * @param {string} [defaultBranch='main'] - Default branch
	 * @param {string|null} [commitSha] - Initial commit sha, for the first build
	 */
	/**
	 * Makes the pipeline's check a *required* status check on the default branch.
	 *
	 * Without this, CI informs but does not gate: a red build is visible and
	 * nothing stops the merge. That was the gap after migrating off CircleCI,
	 * where the required checks had been CircleCI's own contexts.
	 *
	 * The check's name is the pipeline slug, because that is the context
	 * Buildkite publishes (`buildkite/<pipeline>`). Existing required checks are
	 * preserved rather than replaced - a repository that already gates on
	 * something else must not silently lose it.
	 *
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @param {string} branch - Default branch
	 * @param {string} context - The status context to require
	 * @returns {Promise<Object>} What happened, or an `error`
	 */
	async #ensureRequiredStatusCheck(owner, repo, branch, context) {
		const protectionPath = `/repos/${owner}/${repo}/branches/${branch}/protection`;
		try {
			const existing = await this.services.github.makeRequest(protectionPath).catch(() => null);

			if (existing) {
				const payload = await existing.json().catch(() => ({}));
				const required = payload?.required_status_checks || {};
				const contexts = new Set((required.checks || []).map((check) => check.context));
				contexts.add(context);
				await this.services.github.makeRequest(`${protectionPath}/required_status_checks`, {
					method: 'PATCH',
					body: JSON.stringify({ strict: required.strict !== false, contexts: [...contexts] })
				});
				return { updated: true, contexts: [...contexts] };
			}

			await this.services.github.makeRequest(protectionPath, {
				method: 'PUT',
				body: JSON.stringify({
					required_status_checks: { strict: true, contexts: [context] },
					enforce_admins: false,
					required_pull_request_reviews: null,
					restrictions: null
				})
			});
			return { created: true, contexts: [context] };
		} catch (error) {
			return { error: error.message };
		}
	}

	async #configureBuildkite(
		context,
		owner,
		repo,
		results,
		defaultBranch = 'main',
		commitSha = null
	) {
		if (!context.capabilities.includes('buildkite') || !this.services.buildkite) {
			return;
		}

		const capabilityConfig = context.configuration?.buildkite || {};
		if (capabilityConfig.provisionPipeline === false) {
			console.log('ℹ️ Buildkite provisioning disabled for this project (provisionPipeline=false).');
			results.buildkite = { success: true, skipped: true, reason: 'provisionPipeline=false' };
			return;
		}

		// Deployment-level identifiers (organisation + cluster), not per-project
		// preferences — see the buildkite entry in config/external-services.js.
		const { organization, clusterId } = getServiceConfig('buildkite');

		try {
			console.log('🔄 Configuring Buildkite...');

			const { pipeline, existed } = await this.services.buildkite.createPipeline(organization, {
				name: repo,
				repository: `https://github.com/${owner}/${repo}.git`,
				clusterId,
				defaultBranch
			});
			const slug = pipeline.slug || repo;

			const webhookRegistered = await this.services.buildkite.registerWebhook(organization, slug);
			if (!webhookRegistered) {
				console.warn(
					`⚠️ Buildkite pipeline "${slug}" exists but its webhook could not be registered; pushes will NOT trigger builds.`
				);
			}

			// Gate merges on the pipeline by default. CircleCI's contexts used to
			// do this job; migrating without carrying it over would quietly turn a
			// gate into a notification. Opt out with
			// buildkite.requireStatusCheck = false.
			let statusCheck = null;
			const checkContext = `buildkite/${slug}`;
			if (capabilityConfig.requireStatusCheck !== false) {
				statusCheck = await this.#ensureRequiredStatusCheck(
					owner,
					repo,
					defaultBranch,
					checkContext
				);
				if (statusCheck.error) {
					console.warn(
						`⚠️ Could not require ${checkContext} on ${defaultBranch}: ${statusCheck.error}`
					);
				} else {
					console.log(
						`✅ Required status check on ${defaultBranch}: ${statusCheck.contexts.join(', ')}`
					);
				}
			}

			// Best-effort, so CI has run before anyone touches the repository
			// again. The webhook covers every later push.
			let build = null;
			if (commitSha) {
				try {
					build = await this.services.buildkite.triggerBuild(organization, slug, {
						commit: commitSha,
						branch: defaultBranch,
						message: 'First build (genproj)'
					});
					console.log(`✅ Buildkite first build triggered on ${defaultBranch}`);
				} catch (buildError) {
					console.warn(
						`⚠️ Could not trigger the first Buildkite build (${buildError.message}); it will run on the next push`
					);
				}
			}

			results.buildkite = {
				success: true,
				organization,
				pipeline: { slug, webUrl: pipeline.web_url, existed },
				webhookRegistered,
				statusCheck,
				build: build ? { number: build.number, webUrl: build.web_url } : undefined
			};
			console.log('✅ Buildkite configured successfully');
		} catch (error) {
			console.error(`❌ Buildkite configuration failed: ${error.message}`);
			results.buildkite = { success: false, error: error.message };
		}
	}

	/**
	 * Checks whether CircleCI has installed its push webhook on the repository.
	 * CircleCI's GitHub integration creates a webhook pointing at
	 * https://circleci.com/hooks/github when it indexes a repo; without it,
	 * CircleCI cannot receive push events (or follow the repo in the first
	 * place, which is why a freshly-created repo 404s on the follow API).
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @returns {Promise<boolean>} Whether a CircleCI webhook exists
	 */
	async #hasCircleCIWebhook(owner, repo) {
		if (!this.services.github) {
			return false;
		}
		try {
			const hooks = await this.services.github.listWebhooks(owner, repo);
			return (
				Array.isArray(hooks) &&
				hooks.some((hook) => (hook.config?.url || '').includes('circleci.com/hooks/github'))
			);
		} catch (error) {
			console.warn(`⚠️ Could not check CircleCI webhook on ${owner}/${repo}: ${error.message}`);
			return false;
		}
	}

	/**
	 * Turns a raw external-service error into a clear, actionable message. The
	 * common failure is the `follow` call returning 404: CircleCI indexes a
	 * brand-new repo asynchronously after the GitHub App installs its push
	 * webhook, so there is a short window right after repo creation where the
	 * follow API 404s. This is transient — the repo WILL sync (usually within a
	 * few minutes) and can then be followed. Explain that instead of surfacing
	 * a bare "404 Not Found" or implying the setup is broken.
	 * @param {Error} error - Error thrown while configuring CircleCI
	 * @param {string} owner - Repository owner
	 * @param {string} repo - Repository name
	 * @returns {Promise<string>} A clear error message
	 */
	async #describeCircleCISetupError(error, owner, repo) {
		if (error?.message && /CircleCI API error: 404/.test(error.message)) {
			const hasWebhook = await this.#hasCircleCIWebhook(owner, repo);
			const webhookHint = hasWebhook
				? 'A CircleCI webhook already exists on the repo, so CircleCI is mid-sync and should be available imminently.'
				: 'No CircleCI push webhook is installed on the repo yet, so CircleCI has not indexed it.';
			return (
				`CircleCI has not indexed the brand-new repository yet (follow returned 404). ` +
				`${webhookHint} This resolves automatically once CircleCI syncs the repo; you can also ` +
				`trigger it now in the CircleCI web UI (Set Up Project) and it will pick up the committed config.yml.`
			);
		}
		return error?.message || String(error);
	}

	async #configureDoppler(context, results) {
		if (context.capabilities.includes('doppler') && this.services.doppler) {
			try {
				console.log('🔄 Configuring Doppler...');

				// Doppler scaling memo (memos/doppler-scaling): the scaffolder
				// burned one Doppler project per generated repo (10-project
				// Developer-plan wall). Default to the SHARED `common` project —
				// no createProject, no API calls at all. Only create a dedicated
				// per-app project when the doppler capability is configured with
				// projectStrategy: 'new' (repos with app-specific secrets).
				const strategy = context.configuration?.doppler?.projectStrategy || 'common';

				if (strategy === 'new') {
					const dopplerProject = await this.services.doppler.createProject(
						context.projectName,
						`Secrets management for ${context.projectName}`
					);

					// Create development environment
					await this.services.doppler.createEnvironment(dopplerProject.slug, 'Development', 'dev');

					results.doppler = {
						success: true,
						project: dopplerProject,
						strategy: 'new'
					};
				} else {
					results.doppler = {
						success: true,
						project: { slug: 'common', name: 'common' },
						config: 'dev',
						strategy: 'common',
						note: 'Using the shared common project; no new Doppler project created. Set projectStrategy=new to create a dedicated project.'
					};
				}
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
