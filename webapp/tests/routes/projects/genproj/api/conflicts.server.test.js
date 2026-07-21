import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../../../src/routes/projects/genproj/api/conflicts/+server.js';
import { ProjectGeneratorService } from '$lib/server/project-generator';
import { getCurrentUser } from '$lib/server/auth';
import { logger } from '$lib/utils/logging';

// Mock dependencies
vi.mock('$lib/server/project-generator');
vi.mock('$lib/server/auth');
vi.mock('$lib/utils/logging');
vi.mock('@sveltejs/kit', () => ({
	json: (data, options) => ({ body: data, status: options?.status || 200 })
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		GITHUB_TOKEN: 'gh-token'
	}
}));

describe('POST /projects/genproj/api/conflicts', () => {
	let request;
	let platform;
	let cookies;
	let mockUser;
	let mockConflicts;

	beforeEach(() => {
		vi.clearAllMocks();

		request = {
			json: vi.fn()
		};
		platform = {
			env: {
				GENPROJ_DB: {},
				D1_DATABASE: {}
			}
		};
		cookies = {
			get: vi.fn()
		};

		mockUser = { id: 'user-123' };
		mockConflicts = [];

		getCurrentUser.mockResolvedValue(mockUser);

		ProjectGeneratorService.prototype.checkConflicts = vi.fn().mockResolvedValue(mockConflicts);
	});

	it('should return 400 if name is missing', async () => {
		request.json.mockResolvedValue({ selectedCapabilities: [] });
		const response = await POST({ request, platform, cookies });
		expect(response.status).toBe(400);
		expect(response.body).toEqual({ message: 'Missing required fields' });
	});

	it('should return 400 if selectedCapabilities is missing', async () => {
		request.json.mockResolvedValue({ name: 'test-project' });
		const response = await POST({ request, platform, cookies });
		expect(response.status).toBe(400);
		expect(response.body).toEqual({ message: 'Missing required fields' });
	});

	it('should return 401 if user is not authenticated', async () => {
		request.json.mockResolvedValue({ name: 'test-project', selectedCapabilities: [] });
		getCurrentUser.mockResolvedValue(null);

		const response = await POST({ request, platform, cookies });
		expect(response.status).toBe(401);
		expect(response.body).toEqual({ message: 'Unauthorized' });
	});

	it('should use cookie token if environment token is missing', async () => {
		const { env } = await import('$env/dynamic/private');
		const oldGitHubToken = env.GITHUB_TOKEN;
		env.GITHUB_TOKEN = undefined;
		request.json.mockResolvedValue({ name: 'test-project', selectedCapabilities: [] });
		cookies.get.mockReturnValue('cookie-gh-token');

		await POST({ request, platform, cookies });

		expect(ProjectGeneratorService).toHaveBeenCalledWith({ github: 'cookie-gh-token', circleci: undefined, doppler: undefined, sonarcloud: undefined });
		env.GITHUB_TOKEN = oldGitHubToken;
	});

	it('should return 200 with conflicts on success', async () => {
		request.json.mockResolvedValue({ name: 'test-project', selectedCapabilities: ['cap1'] });
		const expectedConflicts = [{ type: 'file', path: 'test.txt' }];
		ProjectGeneratorService.prototype.checkConflicts.mockResolvedValue(expectedConflicts);

		const response = await POST({ request, platform, cookies });

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ conflicts: expectedConflicts });
		expect(ProjectGeneratorService).toHaveBeenCalledWith({ github: 'gh-token', circleci: undefined, doppler: undefined, sonarcloud: undefined });
		expect(ProjectGeneratorService.prototype.checkConflicts).toHaveBeenCalledWith({
			projectName: 'test-project',
			capabilities: ['cap1'],
			configuration: {},
			authTokens: { github: 'gh-token', circleci: undefined, doppler: undefined, sonarcloud: undefined },
			userId: 'user-123'
		});
	});

	it('should return 401 if service throws GitHub authentication required', async () => {
		request.json.mockResolvedValue({ name: 'test-project', selectedCapabilities: [] });
		ProjectGeneratorService.prototype.checkConflicts.mockRejectedValue(
			new Error('GitHub authentication required')
		);

		const response = await POST({ request, platform, cookies });

		expect(response.status).toBe(401);
		expect(response.body).toEqual({ message: 'GitHub authentication required' });
		expect(logger.error).toHaveBeenCalled();
	});

	it('should return 500 on other errors', async () => {
		request.json.mockResolvedValue({ name: 'test-project', selectedCapabilities: [] });
		ProjectGeneratorService.prototype.checkConflicts.mockRejectedValue(
			new Error('Something went wrong')
		);

		const response = await POST({ request, platform, cookies });

		expect(response.status).toBe(500);
		expect(response.body).toEqual({ message: 'Something went wrong' });
		expect(logger.error).toHaveBeenCalled();
	});

	it('should return 500 on internal error without message', async () => {
		request.json.mockResolvedValue({ name: 'test-project', selectedCapabilities: [] });
		ProjectGeneratorService.prototype.checkConflicts.mockRejectedValue(new Error());

		const response = await POST({ request, platform, cookies });

		expect(response.status).toBe(500);
		expect(response.body).toEqual({ message: 'Internal Server Error' });
	});
});
