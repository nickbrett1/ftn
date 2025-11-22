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
			const generatedFiles = [{ path: 'test.txt', content: 'test' }];
			const repository = { fullName: 'owner/repo' };
			const externalServices = { circleci: { success: true } };

			generateAllFiles.mockReturnValue(generatedFiles);
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
			generateAllFiles.mockImplementation(() => {
				throw error;
			});

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
	});

	describe('commitFilesToRepository', () => {
		const repository = { fullName: 'owner/repo' };
		const generatedFiles = [
			{ path: 'file1.txt', content: 'content1' },
			{ path: 'file2.js', content: 'content2' }
		];
		const context = { capabilities: ['sveltekit'] };

		it('should commit files to the repository', async () => {
			await service.commitFilesToRepository(repository, generatedFiles, context);

			const expectedGithubFiles = generatedFiles.map((file) => ({
				path: file.path,
				content: file.content,
				message: `Add ${file.path}`
			}));

			expect(service.services.github.createMultipleFiles).toHaveBeenCalledWith(
				'owner',
				'repo',
				expectedGithubFiles,
				'Initial commit: Generated project with 1 capabilities'
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

		it('should configure all selected services', async () => {
			service.services.circleci.followProject.mockResolvedValue({ success: true });
			service.services.doppler.createProject.mockResolvedValue({ slug: 'test-project' });
			service.services.doppler.createEnvironment.mockResolvedValue({ success: true });
			service.services.sonarcloud.createProject.mockResolvedValue({ success: true });
			service.services.sonarcloud.listQualityGates.mockResolvedValue([
				{ id: '1', isDefault: true }
			]);
			service.services.sonarcloud.associateQualityGate.mockResolvedValue({ success: true });

			const results = await service.configureExternalServices(context, repository);

			expect(results.circleci.success).toBe(true);
			expect(results.doppler.success).toBe(true);
			expect(results.sonarcloud.success).toBe(true);
			expect(service.services.circleci.followProject).toHaveBeenCalledWith(
				'github',
				'owner',
				'repo'
			);
			expect(service.services.doppler.createProject).toHaveBeenCalled();
			expect(service.services.sonarcloud.createProject).toHaveBeenCalled();
		});

		it('should handle failures gracefully', async () => {
			const error = new Error('API Error');
			service.services.circleci.followProject.mockRejectedValue(error);
			service.services.doppler.createProject.mockRejectedValue(error);
			service.services.sonarcloud.createProject.mockRejectedValue(error);

			const results = await service.configureExternalServices(context, repository);

			expect(results.circleci.success).toBe(false);
			expect(results.circleci.error).toBe(error.message);
			expect(results.doppler.success).toBe(false);
			expect(results.doppler.error).toBe(error.message);
			expect(results.sonarcloud.success).toBe(false);
			expect(results.sonarcloud.error).toBe(error.message);
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

		it('should identify missing capability-specific tokens', () => {
			const service = new ProjectGeneratorService({
				...authTokens,
				circleci: null,
				sonarcloud: null
			});
			const capabilities = ['circleci', 'doppler', 'sonarcloud'];
			const result = service.validateAuthentication(capabilities);
			expect(result.isValid).toBe(false);
			expect(result.missing).toEqual(['CircleCI', 'SonarCloud']);
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
});