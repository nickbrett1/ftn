// webapp/src/routes/projects/genproj/api/preview/+server.test.js
import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server.js';
import * as previewGenerator from '$lib/server/preview-generator';
import * as logging from '$lib/utils/logging';

describe('/projects/genproj/api/preview', () => {
    vi.spyOn(logging, 'logger', 'get').mockReturnValue({
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    });

	it('should return a 200 response with preview data on success', async () => {
		const mockRequestBody = {
			projectName: 'test-project',
			selectedCapabilities: ['sveltekit', 'playwright']
		};

		const mockPreviewData = {
			files: [{ path: 'src/routes/+page.svelte', content: '<h1>Hello</h1>' }],
			summary: 'Project summary'
		};

		const generatePreviewSpy = vi
			.spyOn(previewGenerator, 'generatePreview')
			.mockResolvedValue(mockPreviewData);

		const request = new Request('http://localhost/api/preview', {
			method: 'POST',
			body: JSON.stringify(mockRequestBody)
		});

		const response = await POST({
			request,
			platform: { env: { R2_TEMPLATES_BUCKET: 'test-bucket' } }
		});
		const responseBody = await response.json();

		expect(response.status).toBe(200);
		expect(responseBody).toEqual(mockPreviewData);
		expect(generatePreviewSpy).toHaveBeenCalledWith(
			mockRequestBody,
			mockRequestBody.selectedCapabilities,
			'test-bucket'
		);
	});

	it('should return a 400 response if selectedCapabilities is missing', async () => {
		const mockRequestBody = {
			projectName: 'test-project'
		};

		const request = new Request('http://localhost/api/preview', {
			method: 'POST',
			body: JSON.stringify(mockRequestBody)
		});

		const response = await POST({ request, platform: {} });
		const responseBody = await response.json();

		expect(response.status).toBe(400);
		expect(responseBody.error).toBe('Missing projectConfig or selectedCapabilities');
	});

    it('should return a 400 response if projectConfig is missing', async () => {
		const request = new Request('http://localhost/api/preview', {
			method: 'POST',
			body: JSON.stringify({}) // Empty body
		});

		const response = await POST({ request, platform: {} });
		const responseBody = await response.json();

		expect(response.status).toBe(400);
		expect(responseBody.error).toBe('Missing projectConfig or selectedCapabilities');
	});

	it('should return a 500 response if generatePreview throws an error', async () => {
		const mockRequestBody = {
			projectName: 'test-project',
			selectedCapabilities: ['sveltekit']
		};

		const errorMessage = 'Something went wrong';
		const generatePreviewSpy = vi
			.spyOn(previewGenerator, 'generatePreview')
			.mockRejectedValue(new Error(errorMessage));

		const request = new Request('http://localhost/api/preview', {
			method: 'POST',
			body: JSON.stringify(mockRequestBody)
		});

		const response = await POST({
			request,
			platform: { env: { R2_TEMPLATES_BUCKET: 'test-bucket' } }
		});
		const responseBody = await response.json();

		expect(response.status).toBe(500);
		expect(responseBody.error).toBe('Failed to generate preview');
        expect(responseBody.details).toBe(errorMessage);
		expect(generatePreviewSpy).toHaveBeenCalled();
	});
});
