import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../../../src/routes/api/v1/genproj/+server.js';
import { ApiKeyService } from '../../../../../src/lib/server/api-key-service';
import { TokenService } from '../../../../../src/lib/server/token-service';
import { ProjectGeneratorService } from '../../../../../src/lib/server/project-generator';
import { json } from '@sveltejs/kit';

vi.mock('../../../../../src/lib/server/api-key-service');
vi.mock('../../../../../src/lib/server/token-service');
vi.mock('../../../../../src/lib/server/project-generator');
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, options) => ({ data, ...options }))
}));

describe('POST /api/v1/genproj', () => {
	let mockRequest;
	let mockPlatform;

	beforeEach(() => {
		vi.clearAllMocks();

		mockRequest = {
			headers: new Headers({
				Authorization: 'Bearer pat_1234567890'
			}),
			json: vi.fn().mockResolvedValue({
				name: 'test-project',
				selectedCapabilities: ['sveltekit']
			})
		};

		mockPlatform = {
			env: {
				D1_DATABASE: {}
			}
		};

		ApiKeyService.prototype.validateKey = vi.fn().mockResolvedValue('test@example.com');

		TokenService.prototype.getTokensByUserId = vi.fn().mockResolvedValue([
			{ serviceName: 'GitHub', accessToken: 'gh_token' },
			{ serviceName: 'Doppler', accessToken: 'dp_token' }
		]);

		ProjectGeneratorService.prototype.generateProject = vi.fn().mockResolvedValue({
			success: true,
			repository: { htmlUrl: 'https://github.com/test/test-project' }
		});
	});

	it('should return 401 if Authorization header is missing', async () => {
		mockRequest.headers = new Headers();

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(401);
		expect(response.data.message).toContain('Missing or invalid PAT');
	});

	it('should return 401 if PAT is invalid', async () => {
		ApiKeyService.prototype.validateKey = vi.fn().mockResolvedValue(null);

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(401);
		expect(response.data.message).toContain('Invalid PAT');
	});

	it('should return 400 if request body is invalid JSON', async () => {
		mockRequest.json = vi.fn().mockRejectedValue(new Error('Invalid JSON'));

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(400);
		expect(response.data.message).toContain('Invalid JSON payload');
	});

	it('should return 400 if required fields are missing', async () => {
		mockRequest.json = vi.fn().mockResolvedValue({ name: 'test-project' }); // Missing selectedCapabilities

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(400);
		expect(response.data.message).toContain('Missing required fields');
	});

	it('should generate project successfully', async () => {
		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(ApiKeyService.prototype.validateKey).toHaveBeenCalledWith('pat_1234567890');
		expect(TokenService.prototype.getTokensByUserId).toHaveBeenCalledWith('test@example.com');

		expect(ProjectGeneratorService).toHaveBeenCalledWith(expect.objectContaining({
			github: 'gh_token',
			doppler: 'dp_token'
		}));

		expect(ProjectGeneratorService.prototype.generateProject).toHaveBeenCalledWith(expect.objectContaining({
			projectName: 'test-project',
			capabilities: ['sveltekit'],
			userId: 'test@example.com'
		}));

		expect(response.status).toBeUndefined(); // Assuming default status 200
		expect(response.data.message).toBe('Project generated successfully');
		expect(response.data.repositoryUrl).toBe('https://github.com/test/test-project');
	});

	it('should handle conflict (REPOSITORY_EXISTS)', async () => {
		ProjectGeneratorService.prototype.generateProject = vi.fn().mockResolvedValue({
			success: false,
			errorCode: 'REPOSITORY_EXISTS'
		});

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(409);
		expect(response.data.message).toContain('Repository already exists');
	});

	it('should handle unauthorized error from generation service', async () => {
		ProjectGeneratorService.prototype.generateProject = vi.fn().mockResolvedValue({
			success: false,
			error: 'GitHub token not found'
		});

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(401);
		expect(response.data.message).toContain('GitHub token not found');
	});

	it('should handle generic generation error', async () => {
		ProjectGeneratorService.prototype.generateProject = vi.fn().mockResolvedValue({
			success: false,
			error: 'Something went wrong'
		});

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(500);
		expect(response.data.message).toBe('Something went wrong');
	});

	it('should handle unexpected errors', async () => {
		ProjectGeneratorService.prototype.generateProject = vi.fn().mockRejectedValue(new Error('Unexpected crash'));

		const response = await POST({ request: mockRequest, platform: mockPlatform });

		expect(response.status).toBe(500);
		expect(response.data.message).toBe('Unexpected crash');
	});
});
