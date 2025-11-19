import { describe, it, expect, vi } from 'vitest';
import { ProjectGeneratorService } from '$lib/services/project-generator.js';
import { ProjectConfig } from '$lib/models/project-config.js';
import * as auth from '$lib/server/auth-helpers.js';
import { GitHubAPIService } from '$lib/server/github-api.js';

vi.mock('$lib/server/auth-helpers.js');
vi.mock('$lib/server/token-service.js');
vi.mock('$lib/server/github-api.js');
vi.mock('$lib/server/circleci-api.js');
vi.mock('$lib/server/doppler-api.js');
vi.mock('$lib/server/sonarcloud-api.js');
vi.mock('$lib/utils/logging', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn()
	}
}));

describe('ProjectGeneratorService', () => {
	const mockProjectConfig = new ProjectConfig({
		projectName: 'Test Project',
		repositoryUrl: 'https://github.com/test-owner/test-repo',
		selectedCapabilities: ['circleci', 'doppler', 'unknown'],
		configuration: {
			circleci: { enabled: true },
			doppler: { enabled: true },
			unknown: { enabled: true }
		}
	});

	it('should return test files directly when in test mode', async () => {
		const testFiles = [{ filePath: 'test.txt', content: 'test' }];
		const service = new ProjectGeneratorService(true, testFiles);
		const result = await service.generatePreview(mockProjectConfig);
		expect(result.files).toEqual(testFiles);
	});

	it('should generate a preview with correct files for capabilities', async () => {
		const service = new ProjectGeneratorService();
		const result = await service.generatePreview(mockProjectConfig);
		const filePaths = result.files.map((f) => f.filePath);

		expect(filePaths).toContain('.circleci/config.yml');
		expect(filePaths).toContain('doppler-project.json');
		expect(filePaths).toContain('README.md');
		// "unknown" capability should generate a dummy README
		expect(filePaths).toContain('unknown/README.md');
	});

	it('should fail to generate a project if user is not authenticated', async () => {
		auth.getCurrentUser.mockResolvedValue(null);
		const service = new ProjectGeneratorService();
		const result = await service.generateProject(mockProjectConfig, {}, {});
		expect(result.success).toBe(false);
		expect(result.message).toContain('Unauthorized');
	});

	it('should fail if GitHub token is missing', async () => {
		auth.getCurrentUser.mockResolvedValue({ id: 1 });
		const TokenService = (await import('$lib/server/token-service.js')).TokenService;
		TokenService.prototype.getTokensByUserId.mockResolvedValue([]); // No tokens

		const service = new ProjectGeneratorService();
		const result = await service.generateProject(mockProjectConfig, { env: {} }, {});
		expect(result.success).toBe(false);
		expect(result.message).toContain('GitHub token not found');
	});

	it('should handle GitHub repository creation failure', async () => {
		auth.getCurrentUser.mockResolvedValue({ id: 1 });
		const TokenService = (await import('$lib/server/token-service.js')).TokenService;
		TokenService.prototype.getTokensByUserId.mockResolvedValue([
			{ serviceName: 'GitHub', accessToken: 'gh-token' }
		]);

		GitHubAPIService.prototype.createRepository.mockRejectedValue(new Error('API Error'));

		const service = new ProjectGeneratorService();
		const result = await service.generateProject(mockProjectConfig, { env: {} }, {});
		expect(result.success).toBe(false);
		expect(result.message).toContain('Failed to create GitHub repository');
	});

	it('should successfully generate a project and configure external services', async () => {
		auth.getCurrentUser.mockResolvedValue({ id: 1 });
		const TokenService = (await import('$lib/server/token-service.js')).TokenService;
		TokenService.prototype.getTokensByUserId.mockResolvedValue([
			{ serviceName: 'GitHub', accessToken: 'gh-token' },
			{ serviceName: 'CircleCI', accessToken: 'cc-token' },
			{ serviceName: 'Doppler', accessToken: 'dp-token' }
		]);

		GitHubAPIService.prototype.createRepository.mockResolvedValue({});
		GitHubAPIService.prototype.createMultipleFiles.mockResolvedValue({});

		const CircleCIAPIService = (await import('$lib/server/circleci-api.js')).CircleCIAPIService;
		CircleCIAPIService.prototype.followProject.mockResolvedValue({});

		const DopplerAPIService = (await import('$lib/server/doppler-api.js')).DopplerAPIService;
		DopplerAPIService.prototype.createProject.mockResolvedValue({});

		const service = new ProjectGeneratorService();
		const result = await service.generateProject(mockProjectConfig, { env: {} }, {});

		expect(result.success).toBe(true);
		expect(result.message).toContain('Project generation completed successfully');
		expect(GitHubAPIService.prototype.createRepository).toHaveBeenCalled();
		expect(CircleCIAPIService.prototype.followProject).toHaveBeenCalled();
		expect(DopplerAPIService.prototype.createProject).toHaveBeenCalled();
		const circleCiResult = result.externalServiceResults.find((r) => r.service === 'CircleCI');
		expect(circleCiResult.success).toBe(true);
	});
});
