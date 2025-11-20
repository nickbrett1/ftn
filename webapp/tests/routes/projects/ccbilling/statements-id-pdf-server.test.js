// This comment is added to invalidate the cache.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../../src/routes/projects/ccbilling/statements/[id]/pdf/+server.js';

// Mock the json function
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, init) => new Response(JSON.stringify(data), init))
}));

// Mock the requireUser function
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

// Mock the ccbilling-db functions
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn()
}));

describe('/projects/ccbilling/statements/[id]/pdf/+server.js', () => {
	let mockEvent;
	let mockRequireUser;
	let mockGetStatement;
	let mockJson;
	let mockR2Bucket;

	beforeEach(async () => {
		vi.clearAllMocks();

		mockR2Bucket = {
			get: vi.fn()
		};

		mockEvent = {
			params: { id: '1' },
			platform: {
				env: {
					R2_CCBILLING: mockR2Bucket
				}
			}
		};

		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
		mockGetStatement = (await import('$lib/server/ccbilling-db.js')).getStatement;
		mockJson = (await import('@sveltejs/kit')).json;
	});

	describe('GET', () => {
		it('should return an auth error if user is not authenticated', async () => {
			const authResponse = new Response('Unauthorized', { status: 401 });
			mockRequireUser.mockResolvedValue(authResponse);

			const response = await GET(mockEvent);

			expect(response).toBe(authResponse);
		});

		it('should return 400 if statement ID is invalid', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.params.id = 'invalid';

			await GET(mockEvent);

			expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid statement ID' }, { status: 400 });
		});

		it('should return 404 if statement is not found', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockGetStatement.mockResolvedValue(null);

			await GET(mockEvent);

			expect(mockJson).toHaveBeenCalledWith({ error: 'Statement not found' }, { status: 404 });
		});

		it('should return 500 if R2 bucket is not configured', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockGetStatement.mockResolvedValue({ id: 1, r2_key: 'test.pdf', filename: 'test.pdf' });
			mockEvent.platform.env.R2_CCBILLING = undefined;

			await GET(mockEvent);

			expect(mockJson).toHaveBeenCalledWith(
				{ error: 'R2_CCBILLING bucket not configured' },
				{ status: 500 }
			);
		});

		it('should return 404 if PDF not found in R2', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockGetStatement.mockResolvedValue({ id: 1, r2_key: 'test.pdf', filename: 'test.pdf' });
			mockR2Bucket.get.mockResolvedValue(null);

			await GET(mockEvent);

			expect(mockJson).toHaveBeenCalledWith({ error: 'PDF not found in R2' }, { status: 404 });
		});

		it('should try encoded key if initial key fails', async () => {
			mockRequireUser.mockResolvedValue(null);
			const statement = { id: 1, r2_key: 'test file.pdf', filename: 'test file.pdf' };
			mockGetStatement.mockResolvedValue(statement);

			const pdfObject = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
			};

			mockR2Bucket.get.mockImplementation((key) => {
				if (key === 'test%20file.pdf') {
					return Promise.resolve(pdfObject);
				}
				return Promise.resolve(null);
			});

			await GET(mockEvent);

			expect(mockR2Bucket.get).toHaveBeenCalledWith('test file.pdf');
			expect(mockR2Bucket.get).toHaveBeenCalledWith('test%20file.pdf');
		});

		it('should return PDF on success', async () => {
			mockRequireUser.mockResolvedValue(null);
			const statement = { id: 1, r2_key: 'test.pdf', filename: 'test.pdf' };
			mockGetStatement.mockResolvedValue(statement);

			const pdfBuffer = new ArrayBuffer(8);
			const pdfObject = {
				arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer)
			};
			mockR2Bucket.get.mockResolvedValue(pdfObject);

			const response = await GET(mockEvent);
			const responseBuffer = await response.arrayBuffer();

			expect(response.headers.get('Content-Type')).toBe('application/pdf');
			expect(response.headers.get('Content-Disposition')).toBe(
				`attachment; filename="${statement.filename}"`
			);
			expect(responseBuffer).toEqual(pdfBuffer);
		});

		it('should return 500 on error', async () => {
			mockRequireUser.mockResolvedValue(null);
			const error = new Error('R2 error');
			mockGetStatement.mockRejectedValue(error);

			await GET(mockEvent);

			expect(mockJson).toHaveBeenCalledWith(
				{ error: `Failed to download PDF: ${error.message}` },
				{ status: 500 }
			);
		});
	});
});
