import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const generatePreviewMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock('$lib/server/preview-generator', () => ({
	generatePreview: (...args) => generatePreviewMock(...args)
}));

vi.mock('$lib/utils/logging', () => ({
	logger: {
		error: (...args) => loggerErrorMock(...args)
	}
}));

describe('genproj preview api route', () => {
	beforeEach(() => {
		vi.resetModules();
		generatePreviewMock.mockReset();
		loggerErrorMock.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const loadModule = () => import('../../../src/routes/projects/genproj/api/preview/+server.js');

	const buildEvent = (body, platform) => {
		const mockFetch = vi.fn();
		return {
			request: {
				json: async () => body
			},
			platform: platform || { env: { R2_GENPROJ_TEMPLATES: 'mock-bucket' } },
			fetch: mockFetch, // Add mock fetch function
			mockFetch // Return the mock fetch function for assertions
		};
	};

	it('generates preview successfully', async () => {
		const { POST } = await loadModule();
		const previewData = { files: { 'README.md': 'content' } };
		generatePreviewMock.mockResolvedValue(previewData);

		const projectConfig = { name: 'test', selectedCapabilities: ['cap1'] };
		const event = buildEvent(projectConfig);
		const { mockFetch } = event; // Destructure mockFetch
		const response = await POST(event);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual(previewData);
		expect(generatePreviewMock).toHaveBeenCalledWith(projectConfig, ['cap1'], 'mock-bucket');
	});

	it('returns 400 if selectedCapabilities is missing', async () => {
		const { POST } = await loadModule();
		const event = buildEvent({ name: 'test' }); // Missing selectedCapabilities
		const response = await POST(event);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toContain('Missing projectConfig or selectedCapabilities');
	});

	it('returns 500 if generatePreview throws', async () => {
		const { POST } = await loadModule();
		generatePreviewMock.mockRejectedValue(new Error('Generation failed'));

		const projectConfig = { name: 'test', selectedCapabilities: ['cap1'] };
		const event = buildEvent(projectConfig);
		const response = await POST(event);

		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error).toBe('Failed to generate preview');
		expect(loggerErrorMock).toHaveBeenCalledWith('Error generating preview:', expect.any(Error));
	});
});
