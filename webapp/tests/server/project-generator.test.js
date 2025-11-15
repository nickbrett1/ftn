// webapp/tests/server/project-generator.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectGeneratorService } from '$lib/server/project-generator';
import { GitHubAPIService } from '$lib/server/github-api';
import { CircleCIAPIService } from '$lib/server/circleci-api';
import { DopplerAPIService } from '$lib/server/doppler-api';
import { SonarCloudAPIService } from '$lib/server/sonarcloud-api';
import { generateAllFiles } from '$lib/utils/file-generator';

// Mock the API services
vi.mock('$lib/server/github-api');
vi.mock('$lib/server/circleci-api');
vi.mock('$lib/server/doppler-api');
vi.mock('$lib/server/sonarcloud-api');
vi.mock('$lib/utils/file-generator', () => ({
	generateAllFiles: vi.fn()
}));

describe('ProjectGeneratorService', () => {
	let authTokens;

	beforeEach(() => {
		authTokens = {
			github: 'gh-token',
			circleci: 'cc-token',
			doppler: 'dp-token',
			sonarcloud: 'sc-token'
		};
		// Reset mocks before each test
		vi.clearAllMocks();
	});

	it('should initialize services for which tokens are provided', () => {
		const service = new ProjectGeneratorService(authTokens);
		expect(service.services.github).toBeInstanceOf(GitHubAPIService);
		expect(service.services.circleci).toBeInstanceOf(CircleCIAPIService);
		expect(service.services.doppler).toBeInstanceOf(DopplerAPIService);
		expect(service.services.sonarcloud).toBeInstanceOf(SonarCloudAPIService);
	});

	it('should not initialize services for which tokens are missing', () => {
		const service = new ProjectGeneratorService({ github: 'gh-token' });
		expect(service.services.github).toBeInstanceOf(GitHubAPIService);
		expect(service.services.circleci).toBeUndefined();
		expect(service.services.doppler).toBeUndefined();
		expect(service.services.sonarcloud).toBeUndefined();
	});

	it('should validate authentication and identify missing tokens', () => {
		const service = new ProjectGeneratorService({ github: 'gh-token' });
		const result = service.validateAuthentication(['circleci', 'doppler']);
		expect(result.isValid).toBe(false);
		expect(result.missing).toEqual(['CircleCI', 'Doppler']);
	});

	it('should validate all tokens', async () => {
		const service = new ProjectGeneratorService(authTokens);
		service.services.github.validateToken.mockResolvedValue(true);
		service.services.circleci.validateToken.mockResolvedValue(true);
		service.services.doppler.validateToken.mockResolvedValue(false);
		service.services.sonarcloud.validateToken.mockResolvedValue(true);

		const results = await service.validateAllTokens();
		expect(results).toEqual({
			github: true,
			circleci: true,
			doppler: false,
			sonarcloud: true
		});
	});

	it('should generate a project successfully', async () => {
		const service = new ProjectGeneratorService(authTokens);
		const context = {
			projectName: 'test-project',
			capabilities: ['circleci', 'doppler'],
			configuration: {}
		};
		const repo = { fullName: 'owner/repo' };

		generateAllFiles.mockReturnValue([{ path: 'test.txt', content: 'test' }]);
		service.createGitHubRepository = vi.fn().mockResolvedValue(repo);
		service.commitFilesToRepository = vi.fn().mockResolvedValue();
		service.configureExternalServices = vi.fn().mockResolvedValue({ circleci: { success: true } });

		const result = await service.generateProject(context);

		expect(result.success).toBe(true);
		expect(generateAllFiles).toHaveBeenCalledWith(context);
		expect(service.createGitHubRepository).toHaveBeenCalledWith(context);
		expect(service.commitFilesToRepository).toHaveBeenCalledWith(repo, expect.any(Array), context);
		expect(service.configureExternalServices).toHaveBeenCalledWith(context, repo);
	});

	it('should handle failure during project generation', async () => {
		const service = new ProjectGeneratorService(authTokens);
		const context = { projectName: 'test-project' };
		const error = new Error('GitHub API Error');

		generateAllFiles.mockReturnValue([{ path: 'test.txt', content: 'test' }]);
		service.createGitHubRepository = vi.fn().mockRejectedValue(error);

		const result = await service.generateProject(context);

		expect(result.success).toBe(false);
		expect(result.error).toBe(error.message);
	});

	it('should configure only selected external services', async () => {
		const service = new ProjectGeneratorService(authTokens);
		const context = { capabilities: ['circleci'] };
		const repo = { fullName: 'owner/repo' };

		service.services.circleci.followProject.mockResolvedValue({});

		await service.configureExternalServices(context, repo);

		expect(service.services.circleci.followProject).toHaveBeenCalled();
		expect(service.services.doppler.createProject).not.toHaveBeenCalled();
		expect(service.services.sonarcloud.createProject).not.toHaveBeenCalled();
	});

	it('should handle errors during external service configuration', async () => {
		const service = new ProjectGeneratorService(authTokens);
		const context = { capabilities: ['circleci', 'doppler'] };
		const repo = { fullName: 'owner/repo' };
		const error = new Error('CircleCI API Error');

		service.services.circleci.followProject.mockRejectedValue(error);
		service.services.doppler.createProject.mockResolvedValue({});

		const results = await service.configureExternalServices(context, repo);

		expect(results.circleci.success).toBe(false);
		expect(results.circleci.error).toBe(error.message);
		expect(results.doppler.success).toBe(true);
	});
});
