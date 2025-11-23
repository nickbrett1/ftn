import { describe, it, expect, vi } from 'vitest';
import { GET } from '../../../../../src/routes/projects/dbt-duckdb/docs/+server';
import { error } from '@sveltejs/kit';

// Mock the @sveltejs/kit error function
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status, message) => {
		const error_ = new Error(message);
		error_.status = status;
		return error_;
	})
}));

describe('/src/routes/projects/dbt-duckdb/docs/+server.js', () => {
	// Mock the platform object and its R2 binding
	const mockR2Bucket = {
		get: vi.fn()
	};

	const mockPlatform = {
		env: {
			R2_WDI: mockR2Bucket
		}
	};

	// Reset mocks before each test
	beforeEach(() => {
		vi.clearAllMocks();
		// Spy on console.error to check if it's called
		vi.spyOn(console, 'error').mockImplementation(() => {});
	}); // Restore console.error after all tests
	afterAll(() => {
		vi.restoreAllMocks();
	});

	it('should throw 500 error if R2 binding is missing', async () => {
		const mockPlatformMissingR2 = { env: {} };

		await expect(GET({ platform: mockPlatformMissingR2 })).rejects.toThrow(
			'R2 bucket binding not configured correctly.'
		);
		expect(error).toHaveBeenCalledWith(500, 'R2 bucket binding not configured correctly.');
		expect(console.error).toHaveBeenCalledWith('R2_WDI binding not available on platform.env');
	});

	it('should throw 404 error if object is not found in R2', async () => {
		mockR2Bucket.get.mockResolvedValue(null); // Simulate object not found

		await expect(GET({ platform: mockPlatform })).rejects.toThrow(
			'File not found in R2 bucket: docs/static_index.html'
		);
		expect(mockR2Bucket.get).toHaveBeenCalledWith('docs/static_index.html');
		expect(error).toHaveBeenCalledWith(404, 'File not found in R2 bucket: docs/static_index.html');
	});

	it('should return the object body with correct headers if found', async () => {
		const mockObjectBody = '<html><body>Mock HTML</body></html>';
		const mockObject = {
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode(mockObjectBody));
					controller.close();
				}
			}),
			httpEtag: 'mock-etag',
			httpMetadata: {
				cacheControl: 'max-age=3600'
			}
		};
		mockR2Bucket.get.mockResolvedValue(mockObject);

		const response = await GET({ platform: mockPlatform });

		expect(mockR2Bucket.get).toHaveBeenCalledWith('docs/static_index.html');
		expect(response).toBeInstanceOf(Response);
		expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(response.headers.get('etag')).toBe('mock-etag');
		expect(response.headers.get('cache-control')).toBe('max-age=3600');

		// Read the response body to verify content
		const responseBody = await response.text();
		expect(responseBody).toBe(mockObjectBody);
	});

	it('should handle errors during R2 get operation', async () => {
		const mockR2Error = new Error('R2 access denied');
		mockR2Bucket.get.mockRejectedValue(mockR2Error); // Simulate an R2 error

		await expect(GET({ platform: mockPlatform })).rejects.toThrow(
			'Failed to retrieve file from R2: R2 access denied'
		);
		expect(mockR2Bucket.get).toHaveBeenCalledWith('docs/static_index.html');
		expect(console.error).toHaveBeenCalledWith(
			'Error fetching docs/static_index.html from R2. Details: R2 access denied. Raw error:',
			mockR2Error
		);
		expect(error).toHaveBeenCalledWith(500, 'Failed to retrieve file from R2: R2 access denied');
	});
});
