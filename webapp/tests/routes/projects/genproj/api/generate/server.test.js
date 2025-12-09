import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Define Hoisted Mocks
const {
    mockGenerateProject,
    mockGetTokensByUserId,
    mockGetCurrentUser,
    mockLoggerError
} = vi.hoisted(() => ({
    mockGenerateProject: vi.fn(),
    mockGetTokensByUserId: vi.fn(),
    mockGetCurrentUser: vi.fn(),
    mockLoggerError: vi.fn()
}));

// 2. Mock Modules using the hoisted variables
vi.mock('$lib/server/auth', () => ({
    getCurrentUser: mockGetCurrentUser
}));

vi.mock('$lib/server/project-generator', () => {
    // Return a default export or named export as needed by the consumer
    // The consumer uses: import { ProjectGeneratorService } from ...
    // and does new ProjectGeneratorService(authTokens)
    const MockProjectGeneratorService = vi.fn();
    MockProjectGeneratorService.prototype.generateProject = mockGenerateProject;
    return {
        ProjectGeneratorService: MockProjectGeneratorService
    };
});

vi.mock('$lib/server/token-service', () => {
    // The consumer uses: import { TokenService } from ...
    // and does new TokenService(db)
    const MockTokenService = vi.fn();
    MockTokenService.prototype.getTokensByUserId = mockGetTokensByUserId;
    return {
        TokenService: MockTokenService
    };
});

vi.mock('$lib/utils/logging', () => ({
    logger: {
        error: mockLoggerError
    }
}));

// Mock SvelteKit json helper
vi.mock('@sveltejs/kit', () => ({
    json: vi.fn((data, options) => ({ body: data, status: options?.status || 200 }))
}));

// Import the function under test
import { POST } from '../../../../../../src/routes/projects/genproj/api/generate/+server.js';
import { ProjectGeneratorService } from '$lib/server/project-generator';
import { TokenService } from '$lib/server/token-service';

describe('POST /projects/genproj/api/generate', () => {
    let request;
    let platform;
    let cookies;
    let mockUser;
    let mockTokens;

    beforeEach(() => {
        vi.clearAllMocks();

        // Default data setup
        mockUser = { id: 'user-123' };
        mockTokens = [
            { serviceName: 'GitHub', accessToken: 'gh-token' },
            { serviceName: 'CircleCI', accessToken: 'circle-token' }
        ];

        // Default Mock Implementations
        mockGenerateProject.mockResolvedValue({ success: true, repository: { htmlUrl: 'http://repo.url' } });
        mockGetTokensByUserId.mockResolvedValue(mockTokens);
        mockGetCurrentUser.mockResolvedValue(mockUser);

        // Ensure constructor mocks are reset
        // Since we are mocking the class itself, we don't need to re-mock implementation here
        // The prototype methods are already linked to the hoisted spies

        // Default Request/Platform setup
        request = {
            json: vi.fn().mockResolvedValue({
                name: 'test-project',
                repositoryUrl: 'http://repo.url',
                selectedCapabilities: ['cap1', 'cap2']
            })
        };

        platform = {
            env: {
                D1_DATABASE: {}
            }
        };

        cookies = {
            get: vi.fn()
        };
    });

    it('should return 400 if name is missing', async () => {
        request.json.mockResolvedValueOnce({
            repositoryUrl: 'http://repo.url',
            selectedCapabilities: []
        });

        const response = await POST({ request, platform, cookies });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: 'Missing required fields' });
    });

    it('should return 400 if selectedCapabilities is missing', async () => {
        request.json.mockResolvedValueOnce({
            name: 'test-project',
            repositoryUrl: 'http://repo.url'
        });

        const response = await POST({ request, platform, cookies });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ message: 'Missing required fields' });
    });

    it('should return 401 if user is not authenticated', async () => {
        mockGetCurrentUser.mockResolvedValueOnce(null);

        const response = await POST({ request, platform, cookies });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('should use tokens from database', async () => {
        await POST({ request, platform, cookies });

        expect(TokenService).toHaveBeenCalledWith(platform.env.D1_DATABASE);
        expect(mockGetTokensByUserId).toHaveBeenCalledWith('user-123');

        expect(ProjectGeneratorService).toHaveBeenCalledWith(expect.objectContaining({
            github: 'gh-token',
            circleci: 'circle-token',
            doppler: undefined
        }));
    });

    it('should fallback to cookie for GitHub token if not in database', async () => {
        mockGetTokensByUserId.mockResolvedValueOnce([]); // No tokens in DB
        cookies.get.mockReturnValue('cookie-gh-token');

        await POST({ request, platform, cookies });

        expect(ProjectGeneratorService).toHaveBeenCalledWith(expect.objectContaining({
            github: 'cookie-gh-token'
        }));
    });

    it('should call generateProject with correct context', async () => {
        await POST({ request, platform, cookies });

        expect(mockGenerateProject).toHaveBeenCalledWith(expect.objectContaining({
            projectName: 'test-project',
            repositoryUrl: 'http://repo.url',
            capabilities: ['cap1', 'cap2'],
            userId: 'user-123'
        }));
    });

    it('should return success response with repository URL', async () => {
        const response = await POST({ request, platform, cookies });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: 'Project generated successfully',
            repositoryUrl: 'http://repo.url'
        });
    });

    it('should return 401 if generation fails with Unauthorized error', async () => {
        mockGenerateProject.mockResolvedValueOnce({
            success: false,
            error: 'GitHub token not found'
        });

        const response = await POST({ request, platform, cookies });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({ message: 'GitHub token not found' });
    });

    it('should return 500 if generation fails with generic error', async () => {
        mockGenerateProject.mockResolvedValueOnce({
            success: false,
            error: 'Something went wrong'
        });

        const response = await POST({ request, platform, cookies });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Something went wrong' });
    });

    it('should return 500 if generation fails with unknown error', async () => {
        mockGenerateProject.mockResolvedValueOnce({
            success: false
        });

        const response = await POST({ request, platform, cookies });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Project generation failed' });
    });

    it('should handle exceptions and log error', async () => {
        const error = new Error('Unexpected crash');
        mockGenerateProject.mockRejectedValueOnce(error);

        const response = await POST({ request, platform, cookies });

        expect(mockLoggerError).toHaveBeenCalledWith('Project generation failed', error);
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Unexpected crash' });
    });

    it('should handle exceptions without message', async () => {
        mockGenerateProject.mockRejectedValueOnce({});

        const response = await POST({ request, platform, cookies });

        expect(mockLoggerError).toHaveBeenCalled();
        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Internal Server Error' });
    });
});
