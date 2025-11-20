import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectGeneratorService } from '$lib/services/project-generator';
import { ProjectConfig } from '$lib/models/project-config';
import * as fileGenerator from '$lib/utils/file-generator';
import { GitHubAPIService } from '$lib/server/github-api';
import { CircleCIAPIService } from '$lib/server/circleci-api';
import { DopplerAPIService } from '$lib/server/doppler-api';
import { SonarCloudAPIService } from '$lib/server/sonarcloud-api';
import * as logging from '$lib/utils/logging';
import { capabilities } from '$lib/config/capabilities';

// Mock dependencies
vi.mock('$lib/config/capabilities', () => ({
	capabilities: [
		{ id: 'circleci', name: 'CircleCI' },
		{ id: 'doppler', name: 'Doppler' },
		{ id: 'sonarcloud', name: 'SonarCloud' },
		{ id: 'other', name: 'Other' }
	]
}));

vi.mock('$lib/models/project-config', () => ({
	ProjectConfig: vi.fn()
}));
vi.mock('$lib/utils/file-generator');
vi.mock('$lib/utils/logging', () => ({
	log: vi.fn(),
	logError: vi.fn()
}));

const getTokensByUserIdMock = vi.fn();
vi.mock('$lib/server/token-service', () => ({
	TokenService: vi.fn(function () {
		return { getTokensByUserId: getTokensByUserIdMock };
	})
}));

// Mock service modules. This will replace the classes with mock constructors (spies).
vi.mock('$lib/server/auth-helpers', () => ({
	getCurrentUser: vi.fn()
}));

vi.mock('$lib/server/github-api', () => ({
	GitHubAPIService: vi.fn(function () {
		this.createRepository = vi.fn();
		this.createMultipleFiles = vi.fn();
	})
}));

vi.mock('$lib/server/circleci-api', () => ({
	CircleCIAPIService: vi.fn(function () {
		this.followProject = vi.fn();
	})
}));
vi.mock('$lib/server/doppler-api', () => ({
	DopplerAPIService: vi.fn(function () {
		this.createProject = vi.fn();
	})
}));
vi.mock('$lib/server/sonarcloud-api', () => ({
	SonarCloudAPIService: vi.fn(function () {
		this.createProject = vi.fn();
	})
}));

// Import the mocked modules
const { getCurrentUser } = await import('$lib/server/auth-helpers');

describe('ProjectGeneratorService', () => {
	let service;

	beforeEach(() => {
		vi.clearAllMocks();

		service = new ProjectGeneratorService();

		// Mock ProjectConfig constructor behavior
		ProjectConfig.mockImplementation(function () {
			this.projectName = 'Default Project';
			this.repositoryUrl = 'https://github.com/test-owner/test-repo';
			this.selectedCapabilities = [];
			this.configuration = {};
		});
	});
	describe('constructor', () => {
		it('should initialize with testMode=false and empty testFiles by default', () => {
			expect(service.testMode).toBe(false);
			expect(service.testFiles).toEqual([]);
		});

		it('should initialize with provided testMode and testFiles', () => {
			const testFiles = [{ filePath: 'test.txt', content: 'test' }];
			const testService = new ProjectGeneratorService(true, testFiles);
			expect(testService.testMode).toBe(true);
			expect(testService.testFiles).toBe(testFiles);
		});
	});

	describe('generatePreview', () => {
		it('should return testFiles if in testMode', async () => {
			const testFiles = [{ filePath: 'test.txt', content: 'test' }];
			const testService = new ProjectGeneratorService(true, testFiles);
			const result = await testService.generatePreview(new ProjectConfig());
			expect(result.files).toBe(testFiles);
		});

		it('should generate a README.md file', async () => {
			const projectConfig = new ProjectConfig();
			projectConfig.projectName = 'Test Project';
			projectConfig.selectedCapabilities = [];
			fileGenerator.renderTemplate.mockReturnValue('file content');

			const result = await service.generatePreview(projectConfig);
			const readme = result.files.find((f) => f.filePath === 'README.md');
			expect(readme).toBeDefined();
			expect(fileGenerator.renderTemplate).toHaveBeenCalledWith(
				expect.stringContaining('# Test Project'),
				{}
			);
		});

		it('should generate files for selected capabilities', async () => {
			const projectConfig = new ProjectConfig();
			projectConfig.projectName = 'Test Project';
			projectConfig.repositoryUrl = 'https://github.com/owner/repo';
			projectConfig.selectedCapabilities = ['circleci', 'doppler', 'sonarcloud'];
			projectConfig.configuration = {
				circleci: { enabled: true },
				doppler: { enabled: true },
				sonarcloud: { enabled: true }
			};
			fileGenerator.renderTemplate.mockReturnValue('file content');

			const result = await service.generatePreview(projectConfig);

			expect(result.files.some((f) => f.filePath === '.circleci/config.yml')).toBe(true);
			expect(result.files.some((f) => f.filePath === 'doppler-project.json')).toBe(true);
			expect(result.files.some((f) => f.filePath === 'sonar-project.properties')).toBe(true);
		});

		it('should generate a dummy README for capabilities without specific file templates', async () => {
			const projectConfig = new ProjectConfig();
			projectConfig.projectName = 'Test Project';
			projectConfig.selectedCapabilities = ['other'];
			projectConfig.configuration = {
				other: { enabled: true }
			};
			fileGenerator.renderTemplate.mockReturnValue('file content');

			const result = await service.generatePreview(projectConfig);
			const readme = result.files.find((f) => f.filePath === 'other/README.md');
			expect(readme).toBeDefined();
		});

		it('should log an error for unknown capabilities', async () => {
			const projectConfig = new ProjectConfig();
			projectConfig.projectName = 'Test Project';
			projectConfig.selectedCapabilities = ['unknown'];
			projectConfig.configuration = {};

			await service.generatePreview(projectConfig);
			expect(logging.logError).toHaveBeenCalledWith('Unknown capability selected: unknown', {
				capabilityId: 'unknown'
			});
		});
	});

	describe('generateProject', () => {
		let projectConfig, platform, request;

		beforeEach(() => {
			projectConfig = new ProjectConfig();
			projectConfig.projectName = 'Test Project';
			projectConfig.repositoryUrl = 'https://github.com/owner/repo';
			projectConfig.selectedCapabilities = [];
			platform = { env: { D1_DATABASE: 'db' } };
			request = {};

			// Default mock for getTokensByUserId to return no tokens
			getTokensByUserIdMock.mockResolvedValue([]);
		});

		it('should fail if user is not authenticated', async () => {
			getCurrentUser.mockResolvedValue(null);
			const result = await service.generateProject(projectConfig, platform, request);
			expect(result.success).toBe(false);
			expect(result.message).toBe('Unauthorized: User session not found.');
		});

		it('should fail if GitHub token is not found', async () => {
			getCurrentUser.mockResolvedValue({ id: 'user1' });
			// The default mock for getTokensByUserId returns [], so this test should fail as expected.
			const result = await service.generateProject(projectConfig, platform, request);
			expect(result.success).toBe(false);
			expect(result.message).toBe('GitHub token not found. Please authenticate with GitHub.');
		});

		it('should call setupGitHubRepository and configureExternalServices on success', async () => {
			getCurrentUser.mockResolvedValue({ id: 'user1' });
			getTokensByUserIdMock.mockResolvedValue([{ serviceName: 'GitHub', accessToken: 'gh-token' }]);
			service.setupGitHubRepository = vi.fn().mockResolvedValue({ success: true, files: [] });
			service.configureExternalServices = vi.fn().mockResolvedValue([]);

			await service.generateProject(projectConfig, platform, request);

			expect(service.setupGitHubRepository).toHaveBeenCalled();
			expect(service.configureExternalServices).toHaveBeenCalled();
		});
	});

	describe('setupGitHubRepository', () => {
		let githubApiService, projectConfig;

		beforeEach(() => {
			// Instantiate the mocked service to get access to its mocked methods
			githubApiService = new GitHubAPIService();
			projectConfig = new ProjectConfig();
			projectConfig.projectName = 'Test Project';
			projectConfig.selectedCapabilities = [];
			service.generatePreview = vi
				.fn()
				.mockResolvedValue({ files: [{ filePath: 'README.md', content: '...' }] });
		});

		it('should return error if repository creation fails', async () => {
			githubApiService.createRepository.mockRejectedValue(new Error('Failed'));
			const result = await service.setupGitHubRepository(
				githubApiService,
				'owner',
				'repo',
				projectConfig
			);
			expect(result.success).toBe(false);
			expect(result.message).toContain('Failed to create GitHub repository');
		});

		it('should return error if committing files fails', async () => {
			githubApiService.createMultipleFiles.mockRejectedValue(new Error('Failed'));
			const result = await service.setupGitHubRepository(
				githubApiService,
				'owner',
				'repo',
				projectConfig
			);
			expect(result.success).toBe(false);
			expect(result.message).toContain('Failed to commit files to GitHub repository');
		});
	});

	describe('configureExternalServices', () => {
		it('should call configureSingleService for enabled capabilities', async () => {
			const projectConfig = new ProjectConfig();
			projectConfig.selectedCapabilities = ['circleci', 'doppler'];
			projectConfig.configuration = {
				circleci: { enabled: true },
				doppler: { enabled: false } // doppler is not enabled
			};
			service.configureSingleService = vi.fn();

			await service.configureExternalServices(projectConfig, [], 'owner', 'repo');
			expect(service.configureSingleService).toHaveBeenCalledTimes(1);
			expect(service.configureSingleService).toHaveBeenCalledWith(
				'circleci',
				expect.any(ProjectConfig),
				[],
				'owner',
				'repo',
				[]
			);
		});
	});

	describe('configureSingleService', () => {
		it('should call configureCircleCI for circleci capability', async () => {
			service.configureCircleCI = vi.fn();
			await service.configureSingleService(
				'circleci',
				new ProjectConfig(),
				[],
				'owner',
				'repo',
				[]
			);
			expect(service.configureCircleCI).toHaveBeenCalled();
		});

		it('should call configureDoppler for doppler capability', async () => {
			service.configureDoppler = vi.fn();
			await service.configureSingleService('doppler', new ProjectConfig(), [], 'owner', 'repo', []);
			expect(service.configureDoppler).toHaveBeenCalled();
		});

		it('should call configureSonarCloud for sonarcloud capability', async () => {
			service.configureSonarCloud = vi.fn();
			await service.configureSingleService(
				'sonarcloud',
				new ProjectConfig(),
				[],
				'owner',
				'repo',
				[]
			);
			expect(service.configureSonarCloud).toHaveBeenCalled();
		});
	});

	describe('External Service Configuration', () => {
		let projectConfig, results;

		beforeEach(() => {
			projectConfig = new ProjectConfig();
			projectConfig.projectName = 'Test Project';
			results = [];
		});

		it('configureCircleCI should succeed with token', async () => {
			const storedTokens = [{ serviceName: 'CircleCI', accessToken: 'ci-token' }];
			await service.configureCircleCI(storedTokens, projectConfig, 'owner', 'repo', results);
			expect(CircleCIAPIService).toHaveBeenCalledWith('ci-token');
		});

		it('configureCircleCI should fail without token', async () => {
			await service.configureCircleCI([], projectConfig, 'owner', 'repo', results);
			expect(results[0]).toEqual({
				service: 'CircleCI',
				success: false,
				message: 'CircleCI token not found.'
			});
		});

		it('configureDoppler should succeed with token', async () => {
			const storedTokens = [{ serviceName: 'Doppler', accessToken: 'doppler-token' }];
			await service.configureDoppler(storedTokens, projectConfig, results);
			expect(DopplerAPIService).toHaveBeenCalledWith('doppler-token');
			expect(results[0]).toEqual(expect.objectContaining({ service: 'Doppler', success: true }));
		});

		it('configureDoppler should fail without token', async () => {
			await service.configureDoppler([], projectConfig, results);
			expect(results[0]).toEqual({
				service: 'Doppler',
				success: false,
				message: 'Doppler token not found.'
			});
		});

		it('configureSonarCloud should succeed with token', async () => {
			const storedTokens = [{ serviceName: 'SonarCloud', accessToken: 'sonar-token' }];
			await service.configureSonarCloud(storedTokens, projectConfig, 'owner', results);
			expect(SonarCloudAPIService).toHaveBeenCalledWith('sonar-token');
		});

		it('configureSonarCloud should fail without token', async () => {
			await service.configureSonarCloud([], projectConfig, 'owner', results);
			expect(results[0]).toEqual({
				service: 'SonarCloud',
				success: false,
				message: 'SonarCloud token not found.'
			});
		});
	});
});
