import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectGeneratorService } from '$lib/server/project-generator.js';
import { GitHubAPIService } from '$lib/server/github-api.js';
import { CircleCIAPIService } from '$lib/server/circleci-api.js';
import { DopplerAPIService } from '$lib/server/doppler-api.js';
import { SonarCloudAPIService } from '$lib/server/sonarcloud-api.js';

vi.mock('$lib/server/github-api.js');
vi.mock('$lib/server/circleci-api.js');
vi.mock('$lib/server/doppler-api.js');
vi.mock('$lib/server/sonarcloud-api.js');
import { generateAllFiles } from '$lib/utils/file-generator.js';
import { mergeDevcontainerJson } from '$lib/server/project-generator.js';

vi.mock('$lib/utils/file-generator.js', () => ({
	generateAllFiles: vi.fn()
}));

describe('ProjectGeneratorService', () => {
	let service;
	const authTokens = {
		github: 'gh-token',
		circleci: 'cc-token',
		doppler: 'dp-token',
		sonarcloud: 'sc-token'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ProjectGeneratorService(authTokens);
	});

	describe('constructor', () => {
		it('should initialize all services when all tokens are provided', () => {
			const authTokens = {
				github: 'gh-token',
				circleci: 'cc-token',
				doppler: 'dp-token',
				sonarcloud: 'sc-token'
			};
			const service = new ProjectGeneratorService(authTokens);
			expect(service.services.github).toBeInstanceOf(GitHubAPIService);
			expect(service.services.circleci).toBeInstanceOf(CircleCIAPIService);
			expect(service.services.doppler).toBeInstanceOf(DopplerAPIService);
			expect(service.services.sonarcloud).toBeInstanceOf(SonarCloudAPIService);
		});

		it('should initialize only the services for which tokens are provided', () => {
			const authTokens = {
				github: 'gh-token',
				doppler: 'dp-token'
			};
			const service = new ProjectGeneratorService(authTokens);
			expect(service.services.github).toBeInstanceOf(GitHubAPIService);
			expect(service.services.circleci).toBeUndefined();
			expect(service.services.doppler).toBeInstanceOf(DopplerAPIService);
			expect(service.services.sonarcloud).toBeUndefined();
		});

		it('should not initialize any services when no tokens are provided', () => {
			const authTokens = {};
			const service = new ProjectGeneratorService(authTokens);
			expect(service.services.github).toBeUndefined();
			expect(service.services.circleci).toBeUndefined();
			expect(service.services.doppler).toBeUndefined();
			expect(service.services.sonarcloud).toBeUndefined();
		});
	});

	describe('generateProject', () => {
		const context = {
			projectName: 'test-project',
			capabilities: ['sveltekit', 'circleci'],
			configuration: {},
			authTokens,
			userId: 'test-user'
		};

		it('should successfully generate a project', async () => {
			const generatedFiles = [{ filePath: 'test.txt', content: 'test' }];
			const repository = { fullName: 'owner/repo' };
			const externalServices = { circleci: { success: true } };

			generateAllFiles.mockResolvedValue(generatedFiles);
			service.createGitHubRepository = vi.fn().mockResolvedValue(repository);
			service.commitFilesToRepository = vi.fn().mockResolvedValue();
			service.configureExternalServices = vi.fn().mockResolvedValue(externalServices);

			const result = await service.generateProject(context);

			expect(result.success).toBe(true);
			expect(result.repository).toEqual(repository);
			expect(result.externalServices).toEqual(externalServices);
			expect(result.generatedFiles).toEqual(generatedFiles);
			expect(generateAllFiles).toHaveBeenCalledWith(context);
			expect(service.createGitHubRepository).toHaveBeenCalledWith(context);
			expect(service.commitFilesToRepository).toHaveBeenCalledWith(
				repository,
				generatedFiles,
				context
			);
			expect(service.configureExternalServices).toHaveBeenCalledWith(context, repository);
		});

		it('should return a failure result if any step fails', async () => {
			const error = new Error('File generation failed');
			generateAllFiles.mockRejectedValue(error);

			const result = await service.generateProject(context);

			expect(result.success).toBe(false);
			expect(result.error).toBe(error.message);
		});
	});

	describe('createGitHubRepository', () => {
		const context = {
			projectName: 'test-project',
			capabilities: [
				'sveltekit',
				'tailwindcss',
				'typescript',
				'testing',
				'playwright',
				'devcontainer',
				'circleci',
				'sonarcloud',
				'doppler'
			]
		};

		it('should create a GitHub repository with a generated description', async () => {
			const expectedDescription =
				'A SvelteKit, TailwindCSS, TypeScript, Testing, Playwright, DevContainer, CircleCI, SonarCloud, Doppler project generated with genproj';
			const mockRepository = { fullName: 'owner/test-project' };
			service.services.github.createRepository.mockResolvedValue(mockRepository);

			const repository = await service.createGitHubRepository(context);

			expect(repository).toEqual(mockRepository);
			expect(service.services.github.createRepository).toHaveBeenCalledWith(
				'test-project',
				expectedDescription,
				false,
				true
			);
		});

		it('should throw an error if GitHub service is not available', async () => {
			service.services.github = null;
			await expect(service.createGitHubRepository(context)).rejects.toThrow(
				'GitHub authentication required for repository creation'
			);
		});

		it('should propagate REPOSITORY_EXISTS error if overwrite is false', async () => {
			const error = new Error('Repository already exists');
			error.code = 'REPOSITORY_EXISTS';
			service.services.github.createRepository.mockRejectedValue(error);

			await expect(service.createGitHubRepository(context)).rejects.toThrow(
				'Repository already exists'
			);
		});

		it('should recover and return existing repository if overwrite is true', async () => {
			const contextWithOverwrite = { ...context, overwrite: true };
			const error = new Error('Repository already exists');
			error.code = 'REPOSITORY_EXISTS';
			service.services.github.createRepository.mockRejectedValue(error);

			service.services.github.getUserInfo = vi.fn().mockResolvedValue({ login: 'owner' });
			const existingRepo = {
				name: 'test-project',
				fullName: 'owner/test-project',
				cloneUrl: 'clone-url',
				htmlUrl: 'html-url',
				private: true,
				defaultBranch: 'main'
			};
			service.services.github.getRepository = vi.fn().mockResolvedValue(existingRepo);

			const result = await service.createGitHubRepository(contextWithOverwrite);

			expect(result).toEqual({
				name: 'test-project',
				fullName: 'owner/test-project',
				cloneUrl: 'clone-url',
				htmlUrl: 'html-url',
				private: true,
				defaultBranch: 'main'
			});
			expect(service.services.github.getUserInfo).toHaveBeenCalled();
			expect(service.services.github.getRepository).toHaveBeenCalledWith('owner', 'test-project');
		});
	});

	describe('commitFilesToRepository', () => {
		const repository = { fullName: 'owner/repo', defaultBranch: 'main' };
		const generatedFiles = [
			{ filePath: 'file1.txt', content: 'content1' },
			{ filePath: 'file2.js', content: 'content2' }
		];
		const context = { capabilities: ['sveltekit'] };

		it('should commit files to the repository', async () => {
			await service.commitFilesToRepository(repository, generatedFiles, context);

			const expectedGithubFiles = generatedFiles.map((file) => ({
				path: file.filePath,
				content: file.content,
				message: `Add ${file.filePath}`
			}));

			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				expectedGithubFiles,
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('should respect resolutions when committing files', async () => {
			const contextWithResolutions = {
				...context,
				resolutions: {
					'file1.txt': 'keep',
					'file2.js': 'overwrite'
				}
			};

			await service.commitFilesToRepository(repository, generatedFiles, contextWithResolutions);

			// Should only contain file2.js
			const expectedGithubFiles = [
				{
					path: 'file2.js',
					content: 'content2',
					message: 'Add file2.js'
				}
			];

			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				expectedGithubFiles,
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('should not commit anything if all files are resolved to keep', async () => {
			const contextWithResolutions = {
				...context,
				resolutions: {
					'file1.txt': 'keep',
					'file2.js': 'keep'
				}
			};

			await service.commitFilesToRepository(repository, generatedFiles, contextWithResolutions);

			expect(service.services.github.createMultipleFiles).not.toHaveBeenCalled();
		});

		// Round-3 fix (memo genproj-fixes-round3, Option B): overwrite is
		// idempotent — a diverged file is never silently replaced.
		it('applies fresh template content to diverged generated infra on overwrite (template wins)', async () => {
			// file1.txt is generated infra (not under src/, tests/, ...) →
			// on regen the fresh template content replaces the diverged file.
			service.services.github.getFileContent.mockResolvedValueOnce('old-diverged-content');
			service.services.github.getFileContent.mockResolvedValueOnce(null); // file2 absent

			await service.commitFilesToRepository(repository, generatedFiles, {
				...context,
				overwrite: true
			});

			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				[
					{
						path: 'file1.txt',
						content: 'content1',
						message: 'Add file1.txt'
					},
					{
						path: 'file2.js',
						content: 'content2',
						message: 'Add file2.js'
					}
				],
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('preserves diverged app-owned files unless explicitly resolved to overwrite', async () => {
			const appFiles = [
				{ filePath: 'src/app/__main__.py', content: 'app-entry' },
				{ filePath: 'Dockerfile', content: 'new-dockerfile' }
			];
			service.services.github.getFileContent
				.mockResolvedValueOnce('old-app-code') // src/app/__main__.py diverged
				.mockResolvedValueOnce('old-dockerfile'); // Dockerfile diverged

			await service.commitFilesToRepository(repository, appFiles, {
				...context,
				overwrite: true
			});

			// src/app/__main__.py (app code) preserved; Dockerfile (infra) updated
			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				[
					{
						path: 'Dockerfile',
						content: 'new-dockerfile',
						message: 'Add Dockerfile'
					}
				],
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		// Round-6 (memo genproj-doppler-login): genproj-generated helper
		// scripts under scripts/ are INFRA — a diverged cloud_login.sh must be
		// replaced by the fresh template content on overwrite (otherwise it
		// keeps its pre-doppler form and the cloud login flow is broken).
		it('updates diverged genproj-owned scripts (cloud_login.sh) on overwrite but preserves user scripts', async () => {
			const scriptFiles = [
				{ filePath: 'scripts/cloud_login.sh', content: 'new-cloud-login' },
				{ filePath: 'scripts/entrypoint.sh', content: 'new-entrypoint' }
			];
			service.services.github.getFileContent
				.mockResolvedValueOnce('old-cloud-login-no-doppler') // scripts/cloud_login.sh diverged
				.mockResolvedValueOnce('old-user-entrypoint'); // scripts/entrypoint.sh diverged

			await service.commitFilesToRepository(repository, scriptFiles, {
				...context,
				overwrite: true
			});

			// cloud_login.sh is genproj infra → updated; entrypoint.sh is user
			// code → preserved.
			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				[
					{
						path: 'scripts/cloud_login.sh',
						content: 'new-cloud-login',
						message: 'Add scripts/cloud_login.sh'
					}
				],
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('overwrites a diverged file when explicitly resolved to overwrite', async () => {
			service.services.github.getFileContent.mockResolvedValue('old-diverged-content');

			await service.commitFilesToRepository(repository, generatedFiles, {
				...context,
				overwrite: true,
				resolutions: {
					'file1.txt': 'overwrite'
				}
			});

			// file1.txt explicitly overwritten; file2.js diverged infra without a
			// resolution → template wins too (both committed).
			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				[
					{
						path: 'file1.txt',
						content: 'content1',
						message: 'Add file1.txt'
					},
					{
						path: 'file2.js',
						content: 'content2',
						message: 'Add file2.js'
					}
				],
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('keeps diverged infra when explicitly resolved to keep', async () => {
			service.services.github.getFileContent.mockResolvedValueOnce('old-diverged-content');
			service.services.github.getFileContent.mockResolvedValueOnce(null); // file2 absent

			await service.commitFilesToRepository(repository, generatedFiles, {
				...context,
				overwrite: true,
				resolutions: {
					'file1.txt': 'keep'
				}
			});

			// file1.txt explicitly kept → preserved; file2.js absent → written
			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				[
					{
						path: 'file2.js',
						content: 'content2',
						message: 'Add file2.js'
					}
				],
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('skips byte-identical files on overwrite (no-op regeneration)', async () => {
			service.services.github.getFileContent.mockResolvedValueOnce('content1'); // identical
			service.services.github.getFileContent.mockResolvedValueOnce(null); // file2 absent

			await service.commitFilesToRepository(repository, generatedFiles, {
				...context,
				overwrite: true
			});

			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				[
					{
						path: 'file2.js',
						content: 'content2',
						message: 'Add file2.js'
					}
				],
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('creates absent files on overwrite', async () => {
			service.services.github.getFileContent.mockResolvedValue(null);

			await service.commitFilesToRepository(repository, generatedFiles, {
				...context,
				overwrite: true
			});

			const expected = generatedFiles.map((file) => ({
				path: file.filePath,
				content: file.content,
				message: `Add ${file.filePath}`
			}));
			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				expected,
				'Initial commit: Generated project with 1 capabilities',
				'main'
			);
		});

		it('should throw an error if GitHub service is not available', async () => {
			service.services.github = null;
			await expect(
				service.commitFilesToRepository(repository, generatedFiles, context)
			).rejects.toThrow('GitHub authentication required for file commits');
		});
	});

	describe('configureExternalServices', () => {
		const repository = { fullName: 'owner/repo' };
		const context = {
			projectName: 'test-project',
			capabilities: ['circleci', 'doppler', 'sonarcloud']
		};

		it('should configure all selected services including dependabot', async () => {
			const contextWithDependabot = {
				...context,
				capabilities: ['circleci', 'doppler', 'sonarcloud', 'dependabot']
			};
			service.services.circleci.followProject.mockResolvedValue({ success: true });
			service.services.circleci.updateProjectSettings.mockResolvedValue({
				vcs: { default_branch: 'main' }
			});
			service.services.circleci.triggerPipeline.mockResolvedValue({
				id: 'pipeline-1',
				number: 1
			});
			service.services.doppler.createProject.mockResolvedValue({ slug: 'test-project' });
			service.services.doppler.createEnvironment.mockResolvedValue({ success: true });
			service.services.sonarcloud.createProject.mockResolvedValue({ success: true });
			service.services.sonarcloud.listQualityGates.mockResolvedValue([
				{ id: '1', isDefault: true }
			]);
			service.services.sonarcloud.associateQualityGate.mockResolvedValue({ success: true });
			service.services.github.createRepositorySecret = vi.fn().mockResolvedValue();

			const results = await service.configureExternalServices(contextWithDependabot, repository);

			expect(results.circleci.success).toBe(true);
			expect(results.circleci.defaultBranch).toBe('main');
			expect(results.circleci.pipeline).toEqual({ id: 'pipeline-1', number: 1 });
			expect(results.doppler.success).toBe(true);
			expect(results.sonarcloud.success).toBe(true);
			expect(results.dependabot.success).toBe(true);
			expect(service.services.circleci.followProject).toHaveBeenCalledWith(
				'github',
				'owner',
				'repo'
			);
			expect(service.services.circleci.triggerPipeline).toHaveBeenCalledWith(
				'github',
				'owner',
				'repo',
				'main'
			);
			// Doppler scaling memo: default projectStrategy is 'common' — the
			// shared project is reused and NO new Doppler project is created.
			expect(service.services.doppler.createProject).not.toHaveBeenCalled();
			expect(service.services.doppler.createEnvironment).not.toHaveBeenCalled();
			expect(results.doppler.strategy).toBe('common');
			expect(results.doppler.project.slug).toBe('common');
			expect(service.services.sonarcloud.createProject).toHaveBeenCalled();
			// Dependabot is configured purely by generated files; it must not
			// create a PAT secret (the workflow uses the default GITHUB_TOKEN).
			expect(service.services.github.createRepositorySecret).not.toHaveBeenCalled();
		});

		it('should create a dedicated Doppler project when projectStrategy=new', async () => {
			const contextWithNewProject = {
				...context,
				configuration: { doppler: { projectStrategy: 'new' } }
			};
			service.services.circleci.followProject.mockResolvedValue({ success: true });
			service.services.circleci.updateProjectSettings.mockResolvedValue({
				vcs: { default_branch: 'main' }
			});
			service.services.circleci.triggerPipeline.mockResolvedValue({
				id: 'pipeline-1',
				number: 1
			});
			service.services.doppler.createProject.mockResolvedValue({
				slug: 'test-project',
				name: 'test-project'
			});
			service.services.doppler.createEnvironment.mockResolvedValue({ success: true });
			service.services.sonarcloud.createProject.mockResolvedValue({ success: true });

			const results = await service.configureExternalServices(contextWithNewProject, repository);

			expect(results.doppler.success).toBe(true);
			expect(results.doppler.strategy).toBe('new');
			expect(service.services.doppler.createProject).toHaveBeenCalledWith(
				'test-project',
				expect.stringContaining('test-project')
			);
			expect(service.services.doppler.createEnvironment).toHaveBeenCalledWith(
				'test-project',
				'Development',
				'dev'
			);
		});

		it('should use the repository default branch when configuring CircleCI', async () => {
			const repoWithBranch = { fullName: 'owner/repo', defaultBranch: 'develop' };
			service.services.circleci.followProject.mockResolvedValue({ success: true });
			service.services.circleci.updateProjectSettings.mockResolvedValue({
				vcs: { default_branch: 'develop' }
			});
			service.services.circleci.triggerPipeline.mockResolvedValue({ id: 'pipeline-2' });

			const results = await service.configureExternalServices(
				{ ...context, capabilities: ['circleci'] },
				repoWithBranch
			);

			expect(results.circleci.success).toBe(true);
			expect(results.circleci.defaultBranch).toBe('develop');
			expect(service.services.circleci.triggerPipeline).toHaveBeenCalledWith(
				'github',
				'owner',
				'repo',
				'develop'
			);
		});

		it('should not fail CircleCI integration when the first pipeline cannot be triggered', async () => {
			service.services.circleci.followProject.mockResolvedValue({ success: true });
			service.services.circleci.updateProjectSettings.mockResolvedValue({
				vcs: { default_branch: 'main' }
			});
			service.services.circleci.triggerPipeline.mockRejectedValue(new Error('pipeline error'));

			const results = await service.configureExternalServices(
				{ ...context, capabilities: ['circleci'] },
				repository
			);

			expect(results.circleci.success).toBe(true);
			expect(results.circleci.pipeline).toBeUndefined();
		});

		it('should not require the GitHub service for dependabot configuration', async () => {
			const contextWithDependabot = {
				...context,
				capabilities: ['dependabot']
			};

			// Even if the GitHub service would reject a call, dependabot config
			// still succeeds because it is file-based only.
			service.services.github.createRepositorySecret = vi
				.fn()
				.mockRejectedValue(new Error('GitHub API Error'));

			const results = await service.configureExternalServices(contextWithDependabot, repository);

			expect(results.dependabot.success).toBe(true);
			expect(service.services.github.createRepositorySecret).not.toHaveBeenCalled();
		});

		it('should handle failures gracefully', async () => {
			const error = new Error('API Error');
			service.services.circleci.followProject.mockRejectedValue(error);
			service.services.doppler.createProject.mockRejectedValue(error);
			service.services.sonarcloud.createProject.mockRejectedValue(error);

			// Doppler only hits the API for the dedicated-project strategy; the
			// default 'common' strategy performs no calls, so it cannot fail.
			const failingContext = {
				...context,
				configuration: { doppler: { projectStrategy: 'new' } }
			};
			const results = await service.configureExternalServices(failingContext, repository);

			expect(results.circleci.success).toBe(false);
			expect(results.circleci.error).toBe(error.message);
			expect(service.services.circleci.updateProjectSettings).not.toHaveBeenCalled();
			expect(service.services.circleci.triggerPipeline).not.toHaveBeenCalled();
			expect(results.doppler.success).toBe(false);
			expect(results.doppler.error).toBe(error.message);
			expect(results.sonarcloud.success).toBe(false);
			expect(results.sonarcloud.error).toBe(error.message);
		});
		it('records webhookVerified true when CircleCI installed its push webhook', async () => {
			const circleciContext = {
				projectName: 'test-project',
				capabilities: ['circleci']
			};
			service.services.circleci.followProject.mockResolvedValue({ success: true });
			service.services.circleci.updateProjectSettings.mockResolvedValue({
				vcs: { default_branch: 'main' }
			});
			service.services.circleci.triggerPipeline.mockResolvedValue({
				id: 'pipeline-1',
				number: 1
			});
			service.services.github.listWebhooks = vi
				.fn()
				.mockResolvedValue([{ config: { url: 'https://circleci.com/hooks/github' } }]);

			const results = await service.configureExternalServices(circleciContext, repository);

			expect(results.circleci.success).toBe(true);
			expect(results.circleci.webhookVerified).toBe(true);
			expect(service.services.github.listWebhooks).toHaveBeenCalledWith('owner', 'repo');
		});

		it('flags webhookVerified false when follow succeeds but no CircleCI webhook is present', async () => {
			const circleciContext = {
				projectName: 'test-project',
				capabilities: ['circleci']
			};
			service.services.circleci.followProject.mockResolvedValue({ success: true });
			service.services.circleci.updateProjectSettings.mockResolvedValue({
				vcs: { default_branch: 'main' }
			});
			service.services.circleci.triggerPipeline.mockResolvedValue({
				id: 'pipeline-1',
				number: 1
			});
			service.services.github.listWebhooks = vi.fn().mockResolvedValue([]);

			const results = await service.configureExternalServices(circleciContext, repository);

			expect(results.circleci.success).toBe(true);
			expect(results.circleci.webhookVerified).toBe(false);
		});

		it('does not fail generation when follow 404s on a fresh repo (GitHub App sync race)', async () => {
			const circleciContext = {
				projectName: 'test-project',
				capabilities: ['circleci']
			};
			const notFound = new Error(
				'CircleCI API error: 404 Not Found - {"message":"Project not found"}'
			);
			service.services.circleci.followProject.mockRejectedValue(notFound);
			service.services.github.listWebhooks = vi.fn().mockResolvedValue([]);

			const results = await service.configureExternalServices(circleciContext, repository);

			// A 404 on a freshly-created repo is the transient GitHub App
			// sync race, NOT a hard failure: the repo WILL sync and be
			// followable shortly, so generation must not fail.
			expect(results.circleci.success).toBe(true);
			expect(results.circleci.pendingSync).toBe(true);
			expect(results.circleci.error).toContain('has not indexed the brand-new repository');
			expect(results.circleci.error).toContain('Set Up Project');
			expect(service.services.circleci.updateProjectSettings).not.toHaveBeenCalled();
			expect(service.services.circleci.triggerPipeline).not.toHaveBeenCalled();
		});
		it('should not configure any services if none are selected', async () => {
			const context = {
				projectName: 'test-project',
				capabilities: []
			};
			const results = await service.configureExternalServices(context, repository);
			expect(results).toEqual({});
		});
	});

	describe('validateAuthentication', () => {
		it('should return valid when all required tokens are present', () => {
			const service = new ProjectGeneratorService(authTokens);
			const capabilities = ['circleci', 'doppler', 'sonarcloud'];
			const result = service.validateAuthentication(capabilities);
			expect(result.isValid).toBe(true);
			expect(result.missing).toEqual([]);
		});

		it('should identify missing GitHub token', () => {
			const service = new ProjectGeneratorService({ ...authTokens, github: null });
			const capabilities = ['circleci'];
			const result = service.validateAuthentication(capabilities);
			expect(result.isValid).toBe(false);
			expect(result.missing).toEqual(['GitHub']);
		});

		it('should not identify missing capability-specific tokens as we no longer require them', () => {
			const service = new ProjectGeneratorService({
				...authTokens,
				circleci: null,
				sonarcloud: null
			});
			const capabilities = ['circleci', 'doppler', 'sonarcloud'];
			const result = service.validateAuthentication(capabilities);
			expect(result.isValid).toBe(true);
			expect(result.missing).toEqual([]);
		});

		it('should return valid when no capabilities requiring tokens are selected', () => {
			const service = new ProjectGeneratorService(authTokens);
			const capabilities = ['sveltekit'];
			const result = service.validateAuthentication(capabilities);
			expect(result.isValid).toBe(true);
		});
	});

	describe('validateAllTokens', () => {
		it('should validate all available tokens', async () => {
			service.services.github.validateToken.mockResolvedValue(true);
			service.services.circleci.validateToken.mockResolvedValue(false);
			service.services.doppler.validateToken.mockResolvedValue(true);
			service.services.sonarcloud.validateToken.mockResolvedValue(true);

			const results = await service.validateAllTokens();
			expect(results).toEqual({
				github: true,
				circleci: false,
				doppler: true,
				sonarcloud: true
			});
		});

		it('should handle validation failures', async () => {
			service.services.github.validateToken.mockRejectedValue(new Error('Invalid Token'));
			const results = await service.validateAllTokens();
			expect(results.github).toBe(false);
		});

		it('should return an empty object if no tokens are provided', async () => {
			const service = new ProjectGeneratorService({});
			const results = await service.validateAllTokens();
			expect(results).toEqual({});
		});
	});

	describe('checkConflicts', () => {
		const context = {
			projectName: 'test-project',
			capabilities: ['sveltekit']
		};

		it('should identify conflicting files', async () => {
			const generatedFiles = [
				{ filePath: 'file1.txt', content: 'new-content' },
				{ filePath: 'file2.txt', content: 'same-content' }
			];
			generateAllFiles.mockResolvedValue(generatedFiles);

			service.services.github.getUserInfo.mockResolvedValue({ login: 'user' });
			service.services.github.repositoryExists.mockResolvedValue(true);
			service.services.github.getFileContent = vi
				.fn()
				.mockResolvedValueOnce('old-content') // file1.txt
				.mockResolvedValueOnce('same-content'); // file2.txt

			const conflicts = await service.checkConflicts(context);

			expect(conflicts).toHaveLength(1);
			expect(conflicts[0]).toEqual({
				path: 'file1.txt',
				generatedContent: 'new-content',
				existingContent: 'old-content'
			});
			expect(service.services.github.getFileContent).toHaveBeenCalledWith(
				'user',
				'test-project',
				'file1.txt'
			);
		});

		it('should return empty array if repository does not exist', async () => {
			service.services.github.getUserInfo.mockResolvedValue({ login: 'user' });
			service.services.github.repositoryExists.mockResolvedValue(false);

			const conflicts = await service.checkConflicts(context);

			expect(conflicts).toEqual([]);
		});

		it('does not report merge-target files (devcontainer.json) as conflicts', async () => {
			const generatedFiles = [
				{ filePath: '.devcontainer/devcontainer.json', content: '{"new":true}' },
				{ filePath: 'file1.txt', content: 'new-content' }
			];
			generateAllFiles.mockResolvedValue(generatedFiles);

			service.services.github.getUserInfo.mockResolvedValue({ login: 'user' });
			service.services.github.repositoryExists.mockResolvedValue(true);
			service.services.github.getFileContent = vi
				.fn()
				.mockResolvedValue('diverged-existing-content');

			const conflicts = await service.checkConflicts(context);

			// devcontainer.json is auto-merged on overwrite → not a conflict;
			// file1.txt diverges → reported.
			expect(conflicts).toHaveLength(1);
			expect(conflicts[0].path).toBe('file1.txt');
		});
	});

	describe('commitFilesToRepository merge semantics (round-4)', () => {
		const repository = { fullName: 'owner/repo', defaultBranch: 'main' };

		const existingDevcontainer = JSON.stringify(
			{
				name: 'Python',
				build: { dockerfile: 'Dockerfile' },
				workspaceFolder: '/workspaces/ports',
				features: { 'ghcr.io/devcontainers/features/python:1': { version: '3.12' } },
				mounts: [
					'source=ports-tailscale-state,target=/var/lib/tailscale,type=volume',
					'source=${localEnv:HOME}/.config/goose,target=/home/vscode/.config/goose,type=bind'
				],
				customizations: {
					vscode: {
						extensions: ['ms-python.python', 'manual.extension']
					}
				},
				postCreateCommand: 'bash .devcontainer/post-create-setup.sh'
			},
			undefined,
			2
		);

		const generatedDevcontainer = JSON.stringify(
			{
				name: 'Python',
				build: { dockerfile: 'Dockerfile' },
				workspaceFolder: '/workspaces/ports',
				features: {
					'ghcr.io/devcontainers/features/python:1': { version: '3.12' },
					'ghcr.io/devcontainers/features/node:1': {}
				},
				mounts: [
					'source=ports-tailscale-state,target=/var/lib/tailscale,type=volume',
					'source=${localEnv:HOME}/.config/goose,target=/home/vscode/.config/goose,type=bind',
					'source=${localEnv:HOME}/.doppler,target=/home/vscode/.doppler,type=bind'
				],
				customizations: {
					vscode: {
						extensions: ['ms-python.python', 'doppler.doppler-vscode']
					}
				},
				postCreateCommand: 'bash .devcontainer/post-create-setup.sh'
			},
			undefined,
			2
		);

		const generatedFiles = [
			{ filePath: '.devcontainer/devcontainer.json', content: generatedDevcontainer }
		];

		it('merges capability contributions into a diverged devcontainer.json without clobbering manual edits', async () => {
			service.services.github.getFileContent.mockResolvedValueOnce(existingDevcontainer);

			await service.commitFilesToRepository(repository, generatedFiles, {
				capabilities: ['doppler'],
				overwrite: true
			});

			const committed = service.services.github.createMultipleFiles.mock.calls[0][2][0];
			expect(committed.path).toBe('.devcontainer/devcontainer.json');
			const merged = JSON.parse(committed.content);

			// union of extensions: existing (incl. manual) first, then new
			expect(merged.customizations.vscode.extensions).toEqual([
				'ms-python.python',
				'manual.extension',
				'doppler.doppler-vscode'
			]);
			// new capability mount appended; existing mounts untouched
			expect(merged.mounts).toContain(
				'source=${localEnv:HOME}/.doppler,target=/home/vscode/.doppler,type=bind'
			);
			expect(merged.mounts).toContain(
				'source=${localEnv:HOME}/.config/goose,target=/home/vscode/.config/goose,type=bind'
			);
			// feature merged in
			expect(merged.features['ghcr.io/devcontainers/features/node:1']).toBeDefined();
			expect(merged.features['ghcr.io/devcontainers/features/python:1'].version).toBe('3.12');
			// project-owned keys untouched
			expect(merged.postCreateCommand).toBe('bash .devcontainer/post-create-setup.sh');
		});

		it('replaces devcontainer.json entirely when explicitly resolved to overwrite', async () => {
			service.services.github.getFileContent.mockResolvedValueOnce(existingDevcontainer);

			await service.commitFilesToRepository(repository, generatedFiles, {
				capabilities: ['doppler'],
				overwrite: true,
				resolutions: { '.devcontainer/devcontainer.json': 'overwrite' }
			});

			expect(service.services.github.createMultipleFiles.mock.calls[0][2][0].content).toBe(
				generatedDevcontainer
			);
		});

		it('is a no-op when the merged result matches the existing file (monotonic)', async () => {
			// Existing file already contains every generated contribution →
			// merging produces identical content → nothing committed.
			const alreadyMerged = mergeDevcontainerJson(existingDevcontainer, generatedDevcontainer);
			service.services.github.getFileContent.mockResolvedValueOnce(alreadyMerged);

			await service.commitFilesToRepository(repository, generatedFiles, {
				capabilities: ['doppler'],
				overwrite: true
			});

			expect(service.services.github.createMultipleFiles).not.toHaveBeenCalled();
		});
	});
});
