import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFiles = [{ path: 'README.md', content: '# Demo' }];

const mockGitHub = {
	createRepository: vi.fn().mockResolvedValue({ fullName: 'org/repo', name: 'repo' }),
	createMultipleFiles: vi.fn().mockResolvedValue({ sha: 'commit' }),
	validateToken: vi.fn().mockResolvedValue(true)
};

const mockCircle = {
	followProject: vi.fn().mockResolvedValue({ id: 'circle', slug: 'org/repo' }),
	validateToken: vi.fn().mockResolvedValue(true)
};

const mockDoppler = {
	createProject: vi.fn().mockResolvedValue({ slug: 'demo' }),
	createEnvironment: vi.fn().mockResolvedValue({}),
	validateToken: vi.fn().mockResolvedValue(true)
};

const mockSonar = {
	createProject: vi.fn().mockResolvedValue({ key: 'org_repo' }),
	listQualityGates: vi.fn().mockResolvedValue([{ id: 'gate', isDefault: true }]),
	associateQualityGate: vi.fn().mockResolvedValue({}),
	validateToken: vi.fn().mockResolvedValue(true)
};

vi.mock('../../src/lib/utils/file-generator.js', () => ({
	generateAllFiles: vi.fn(() => mockFiles)
}));

vi.mock('../../src/lib/server/github-api.js', () => ({
	GitHubAPIService: vi.fn(() => mockGitHub)
}));

vi.mock('../../src/lib/server/circleci-api.js', () => ({
	CircleCIAPIService: vi.fn(() => mockCircle)
}));

vi.mock('../../src/lib/server/doppler-api.js', () => ({
	DopplerAPIService: vi.fn(() => mockDoppler)
}));

vi.mock('../../src/lib/server/sonarcloud-api.js', () => ({
	SonarCloudAPIService: vi.fn(() => mockSonar)
}));

import { ProjectGeneratorService } from '../../src/lib/server/project-generator.js';
import { generateAllFiles } from '../../src/lib/utils/file-generator.js';

describe('ProjectGeneratorService', () => {
	const baseContext = {
		projectName: 'Demo',
		repositoryUrl: '',
		capabilities: ['circleci', 'doppler', 'sonarcloud'],
		configuration: {},
		authTokens: {
			github: 'gh-token',
			circleci: 'cc-token',
			doppler: 'dp-token',
			sonarcloud: 'sc-token'
		},
		userId: 'user'
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('generates project end-to-end', async () => {
		const generator = new ProjectGeneratorService(baseContext.authTokens);
		const result = await generator.generateProject(baseContext);

		expect(generateAllFiles).toHaveBeenCalledWith(baseContext);
		expect(mockGitHub.createRepository).toHaveBeenCalledWith(
			'Demo',
			expect.stringContaining('genproj'),
			false,
			true
		);
		expect(mockGitHub.createMultipleFiles).toHaveBeenCalledWith(
			'org',
			'repo',
			expect.any(Array),
			expect.stringContaining('Initial commit')
		);
		expect(result.success).toBe(true);
		expect(result.externalServices).toHaveProperty('circleci');
	});

	it('returns failure result when repository creation fails', async () => {
		mockGitHub.createRepository.mockRejectedValueOnce(new Error('fail'));
		const generator = new ProjectGeneratorService(baseContext.authTokens);
		const result = await generator.generateProject(baseContext);
		expect(result.success).toBe(false);
		expect(result.error).toBe('fail');
	});

	it('validates required authentication tokens', () => {
		const generator = new ProjectGeneratorService({ github: null });
		const validation = generator.validateAuthentication(['circleci']);
		expect(validation.isValid).toBe(false);
		expect(validation.missing).toContain('GitHub');
	});

	it('validates tokens across services', async () => {
		const generator = new ProjectGeneratorService(baseContext.authTokens);
		mockGitHub.validateToken.mockResolvedValueOnce(true);
		const results = await generator.validateAllTokens();
		expect(results.github).toBe(true);
	});

	it('configures external services and handles failures gracefully', async () => {
		mockCircle.followProject.mockRejectedValueOnce(new Error('circle failure'));
		const generator = new ProjectGeneratorService(baseContext.authTokens);
		const config = await generator.configureExternalServices(
			{ ...baseContext, capabilities: ['circleci', 'doppler', 'sonarcloud'] },
			{ fullName: 'org/repo' }
		);

		expect(config.circleci.success).toBe(false);
		expect(config.doppler.success).toBe(true);
		expect(config.sonarcloud.success).toBe(true);
	});
});
