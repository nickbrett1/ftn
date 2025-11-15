import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectGeneratorService } from '../../src/lib/services/project-generator.js';
import { ProjectConfig } from '../../src/lib/models/project-config.js';

// Mock dependencies
vi.mock('../../src/lib/utils/logging', () => ({
	logError: vi.fn(),
	log: vi.fn()
}));
vi.mock('../../src/lib/utils/file-generator', () => ({
	renderTemplate: vi.fn((templateId, data) => `Rendered ${templateId} with ${JSON.stringify(data)}`)
}));
vi.mock('../../src/lib/server/token-service', () => ({
	TokenService: vi.fn(() => ({
		getTokensByUserId: vi.fn().mockResolvedValue([])
	}))
}));
vi.mock('../../src/lib/server/auth-helpers', () => ({
	getCurrentUser: vi.fn().mockResolvedValue({ id: 'user-123' })
}));
vi.mock('../../src/lib/services/github-api', () => ({
	GitHubAPIService: vi.fn(() => ({
		createRepository: vi.fn().mockResolvedValue({}),
		createMultipleFiles: vi.fn().mockResolvedValue({})
	}))
}));
vi.mock('../../src/lib/services/circleci-api', () => ({
	CircleCIAPIService: vi.fn(() => ({
		followProject: vi.fn().mockResolvedValue({})
	}))
}));
vi.mock('../../src/lib/services/doppler-api', () => ({
	DopplerAPIService: vi.fn(() => ({
		createProject: vi.fn().mockResolvedValue({})
	}))
}));
vi.mock('../../src/lib/services/sonarcloud-api', () => ({
	SonarCloudAPIService: vi.fn(() => ({
		createProject: vi.fn().mockResolvedValue({})
	}))
}));

describe('ProjectGeneratorService', () => {
	let service;

	beforeEach(() => {
		service = new ProjectGeneratorService();
		vi.clearAllMocks();
	});

	describe('generatePreview', () => {
		it('should generate a README.md file', async () => {
			const projectConfig = new ProjectConfig({
				projectName: 'test-project',
				selectedCapabilities: [],
				repositoryUrl: 'https://github.com/owner/repo'
			});
			const result = await service.generatePreview(projectConfig);
			const readme = result.files.find((f) => f.filePath === 'README.md');
			expect(readme).toBeDefined();
		});

		it('should generate files for enabled capabilities', async () => {
			const projectConfig = new ProjectConfig({
				projectName: 'test-project',
				selectedCapabilities: ['circleci', 'doppler', 'sonarcloud'],
				configuration: {
					circleci: { enabled: true },
					doppler: { enabled: true },
					sonarcloud: { enabled: true }
				},
				repositoryUrl: 'https://github.com/owner/repo'
			});

			const result = await service.generatePreview(projectConfig);

			expect(result.files.some((f) => f.filePath === '.circleci/config.yml')).toBe(true);
			expect(result.files.some((f) => f.filePath === 'doppler-project.json')).toBe(true);
			expect(result.files.some((f) => f.filePath === 'sonar-project.properties')).toBe(true);
		});

		it('should not generate files for disabled capabilities', async () => {
			const projectConfig = new ProjectConfig({
				projectName: 'test-project',
				selectedCapabilities: ['circleci'],
				configuration: {
					circleci: { enabled: false }
				},
				repositoryUrl: 'https://github.com/owner/repo'
			});

			const result = await service.generatePreview(projectConfig);
			expect(result.files.some((f) => f.filePath === '.circleci/config.yml')).toBe(false);
		});
	});
});
