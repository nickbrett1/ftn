import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './+server.js';

// Mock the dependencies
vi.mock('$lib/server/ccbilling-db.js', () => ({
	listStatements: vi.fn(),
	createStatement: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));

vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, options) => {
		const responseBody = JSON.stringify(data);
		const response = new Response(responseBody, {
			headers: { 'Content-Type': 'application/json' },
			status: options?.status || 200,
			...options
		});
		// Ensure the json() method returns the parsed data
		response.json = vi.fn().mockResolvedValue(data);
		return response;
	})
}));

// Import the mocked functions
import { listStatements, createStatement } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/cycles/[id]/statements API', () => {
	let mockEvent;
	let mockR2Bucket;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock R2 bucket
		mockR2Bucket = {
			put: vi.fn().mockResolvedValue({})
		};

		// Mock event object
		mockEvent = {
			params: { id: '1' },
			platform: {
				env: {
					R2_CCBILLING: mockR2Bucket
				}
			},
			request: {
				json: vi.fn(),
				formData: vi.fn()
			}
		};

		// Mock requireUser to return success by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
	});
	describe('GET endpoint', () => {
		it('should return statements for a billing cycle', async () => {
			const mockStatements = [
				{ id: 1, filename: 'statement1.pdf', credit_card_id: 1 },
				{ id: 2, filename: 'statement2.pdf', credit_card_id: 2 }
			];
			listStatements.mockResolvedValue(mockStatements);

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(listStatements).toHaveBeenCalledWith(mockEvent, 1);
			expect(result).toEqual(mockStatements);
		});

		it('should return 400 for invalid cycle ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing or invalid billing cycle id');
		});

		it('should handle database errors', async () => {
			listStatements.mockRejectedValue(new Error('Database error'));

			const response = await GET(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to list statements');
		});

		it('should redirect if user not authenticated', async () => {
			requireUser.mockResolvedValue(new Response('', { status: 302 }));
			expect(await GET(mockEvent)).toEqual(expect.any(Response));
			expect(listStatements).not.toHaveBeenCalled();
		});
	});

	describe('POST endpoint', () => {
		let mockFile;
		let mockFormData;

		beforeEach(() => {
			// Mock PDF file
			mockFile = {
				name: 'statement.pdf',
				type: 'application/pdf',
				size: 1024 * 1024, // 1MB
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
			};

			// Mock FormData
			mockFormData = new Map([['file', mockFile]]);

			mockEvent.request.formData.mockResolvedValue({
				get: (key) => mockFormData.get(key)
			});
		});

		it('should successfully upload a PDF statement', async () => {
			createStatement.mockResolvedValue({});

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(requireUser).toHaveBeenCalledWith(mockEvent);
			expect(mockFile.arrayBuffer).toHaveBeenCalled();
			expect(mockR2Bucket.put).toHaveBeenCalledWith(
				expect.stringMatching(/^statements\/1\/\d+-[a-f0-9]{12}-statement\.pdf$/),
				expect.any(ArrayBuffer),
				expect.objectContaining({
					customMetadata: expect.objectContaining({
						originalName: 'statement.pdf',
						cycleId: '1',
						contentType: 'application/pdf'
					})
				})
			);
			expect(createStatement).toHaveBeenCalledWith(
				mockEvent,
				1,
				null, // credit_card_id is null now
				'statement.pdf',
				expect.stringMatching(/^statements\/1\/\d+-[a-f0-9]{12}-statement\.pdf$/),
				null // statement_date is null until parsed
			);
			expect(result.success).toBe(true);
			expect(result.filename).toBe('statement.pdf');
		});

		it('should return 400 for missing file', async () => {
			mockFormData.set('file', null);

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing required field: file');
		});

		it('should return 400 for non-PDF files', async () => {
			mockFile.type = 'image/jpeg';

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Invalid file type. Only PDF files are allowed.');
		});

		it('should return 400 for files over size limit', async () => {
			mockFile.size = 15 * 1024 * 1024; // 15MB

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('File size too large. Maximum size is 10MB.');
		});

		it('should return 500 when R2 bucket not configured', async () => {
			mockEvent.platform.env.R2_CCBILLING = null;

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('R2 ccbilling bucket not configured');
		});

		it('should handle R2 upload errors', async () => {
			mockR2Bucket.put.mockRejectedValue(new Error('R2 upload failed'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to upload statement');
		});

		it('should handle database errors', async () => {
			createStatement.mockRejectedValue(new Error('Database error'));

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(500);
			expect(result.error).toBe('Failed to upload statement');
		});

		it('should return 400 for invalid cycle ID', async () => {
			mockEvent.params.id = 'invalid';

			const response = await POST(mockEvent);
			const result = await response.json();

			expect(response.status).toBe(400);
			expect(result.error).toBe('Missing or invalid billing cycle id');
		});

		it('should generate secure random R2 keys', async () => {
			createStatement.mockResolvedValue({});

			// Call multiple times to ensure uniqueness
			const keys = [];
			for (let i = 0; i < 5; i++) {
				await POST(mockEvent);
				const call = mockR2Bucket.put.mock.calls[i];
				keys.push(call[0]);
			}

			// All keys should be unique
			const uniqueKeys = new Set(keys);
			expect(uniqueKeys.size).toBe(5);

			// Keys should follow the expected pattern
			keys.forEach((key) => {
				expect(key).toMatch(/^statements\/1\/\d+-[a-f0-9]{12}-statement\.pdf$/);
			});
		});
	});
});
