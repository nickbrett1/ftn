// webapp/tests/services/project-generator.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectGeneratorService } from '$lib/services/project-generator';
import * as authHelpers from '$lib/server/auth-helpers';
import { GitHubAPIService } from '$lib/services/github-api';
import { CircleCIAPIService } from '$lib/services/circleci-api';
import { DopplerAPIService } from '$lib/services/doppler-api';
import { SonarCloudAPIService } from '$lib/services/sonarcloud-api';
import { TokenService } from '$lib/server/token-service';

// Mocks
vi.mock('$lib/server/auth-helpers');
vi.mock('$lib/services/github-api');
vi.mock('$lib/services/circleci-api');
vi.mock('$lib/services/doppler-api');
vi.mock('$lib/services/sonarcloud-api');
vi.mock('$lib/server/token-service');

const mockProjectConfig = {
	projectName: 'test-project',
	repositoryUrl: 'https://github.com/test-owner/test-project',
	selectedCapabilities: ['circleci', 'doppler', 'sonarcloud'],
	configuration: {
		circleci: { enabled: true },
		doppler: { enabled: true },
		sonarcloud: { enabled: true }
	}
};

const mockTokens = [
    { serviceName: 'GitHub', accessToken: 'gh-token' },
    { serviceName: 'CircleCI', accessToken: 'cc-token' },
    { serviceName: 'Doppler', accessToken: 'dp-token' },
    { serviceName: 'SonarCloud', accessToken: 'sc-token' },
];

describe('ProjectGeneratorService', () => {
	let service;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ProjectGeneratorService();

        // Mock dependencies
        authHelpers.getCurrentUser.mockResolvedValue({ id: 'user-123' });
        TokenService.prototype.getTokensByUserId.mockResolvedValue(mockTokens);
        GitHubAPIService.prototype.createRepository.mockResolvedValue({});
        GitHubAPIService.prototype.createMultipleFiles.mockResolvedValue({});
        CircleCIAPIService.prototype.followProject.mockResolvedValue({});
        DopplerAPIService.prototype.createProject.mockResolvedValue({});
        SonarCloudAPIService.prototype.createProject.mockResolvedValue({});
	});

	describe('generatePreview', () => {
		it('should generate a project preview successfully', async () => {
			const { files } = await service.generatePreview(mockProjectConfig);
			expect(files.some(f => f.filePath === '.circleci/config.yml')).toBe(true);
			expect(files.some(f => f.filePath === 'doppler-project.json')).toBe(true);
			expect(files.some(f => f.filePath === 'sonar-project.properties')).toBe(true);
			expect(files.some(f => f.filePath === 'README.md')).toBe(true);
		});

        it('should handle unknown capabilities gracefully', async () => {
            const configWithUnknown = {
                ...mockProjectConfig,
                selectedCapabilities: ['unknown-capability']
            };
            const { files } = await service.generatePreview(configWithUnknown);
            // Should still generate a README
            expect(files.some(f => f.filePath === 'README.md')).toBe(true);
        });
	});

	describe('generateProject', () => {
		it('should generate a full project successfully', async () => {
			const result = await service.generateProject(mockProjectConfig, { env: {} }, {});
			expect(result.success).toBe(true);
			expect(result.message).toBe('Project generation completed successfully.');
			expect(GitHubAPIService.prototype.createRepository).toHaveBeenCalled();
			expect(GitHubAPIService.prototype.createMultipleFiles).toHaveBeenCalled();
			expect(CircleCIAPIService.prototype.followProject).toHaveBeenCalled();
			expect(DopplerAPIService.prototype.createProject).toHaveBeenCalled();
			expect(SonarCloudAPIService.prototype.createProject).toHaveBeenCalled();
		});

        it('should return an error if user is not authenticated', async () => {
            authHelpers.getCurrentUser.mockResolvedValue(null);
            const result = await service.generateProject(mockProjectConfig, { env: {} }, {});
            expect(result.success).toBe(false);
            expect(result.message).toBe('Unauthorized: User session not found.');
        });

        it('should return an error if GitHub token is missing', async () => {
            TokenService.prototype.getTokensByUserId.mockResolvedValue([]);
            const result = await service.generateProject(mockProjectConfig, { env: {} }, {});
            expect(result.success).toBe(false);
            expect(result.message).toBe('GitHub token not found. Please authenticate with GitHub.');
        });

		it('should handle errors during project generation', async () => {
            const errorMessage = 'GitHub API error';
			GitHubAPIService.prototype.createRepository.mockRejectedValue(new Error(errorMessage));
			const result = await service.generateProject(mockProjectCofig, { env: {} }, {});
			expect(result.success).toBe(false);
			expect(result.message).toContain(errorMessage);
		});
	});
});
