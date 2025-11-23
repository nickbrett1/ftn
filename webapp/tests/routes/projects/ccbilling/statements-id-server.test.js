import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '../../../../src/routes/projects/ccbilling/statements/[id]/+server.js';

// Mock the json function
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, init) => Response.json(data, init))
}));

// Mock the requireUser function
vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

// Mock the ccbilling-db functions
vi.mock('$lib/server/ccbilling-db.js', () => ({
	getStatement: vi.fn(),
	deleteStatement: vi.fn()
}));

describe('/projects/ccbilling/statements/[id]/+server.js', () => {
	let mockEvent;
	let mockRequireUser;
	let mockGetStatement;
	let mockDeleteStatement;
	let mockJson;

	beforeEach(async () => {
		vi.clearAllMocks();

		mockEvent = {
			params: { id: '1' },
			platform: {
				env: {
					CCBILLING_DB: {}
				}
			}
		};

		mockRequireUser = (await import('$lib/server/require-user.js')).requireUser;
		mockGetStatement = (await import('$lib/server/ccbilling-db.js')).getStatement;
		mockDeleteStatement = (await import('$lib/server/ccbilling-db.js')).deleteStatement;
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

		it('should return statement data on success', async () => {
			mockRequireUser.mockResolvedValue(null);
			const statement = { id: 1, name: 'Test Statement' };
			mockGetStatement.mockResolvedValue(statement);

			await GET(mockEvent);

			expect(mockJson).toHaveBeenCalledWith(statement);
		});

		it('should return 500 on error', async () => {
			mockRequireUser.mockResolvedValue(null);
			const error = new Error('Database error');
			mockGetStatement.mockRejectedValue(error);

			await GET(mockEvent);

			expect(mockJson).toHaveBeenCalledWith(
				{ error: `Failed to get statement: ${error.message}` },
				{ status: 500 }
			);
		});
	});

	describe('DELETE', () => {
		it('should return an auth error if user is not authenticated', async () => {
			const authResponse = new Response('Unauthorized', { status: 401 });
			mockRequireUser.mockResolvedValue(authResponse);

			const response = await DELETE(mockEvent);

			expect(response).toBe(authResponse);
		});

		it('should return 400 if statement ID is invalid', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockEvent.params.id = 'invalid';

			await DELETE(mockEvent);

			expect(mockJson).toHaveBeenCalledWith({ error: 'Invalid statement ID' }, { status: 400 });
		});

		it('should return 404 if statement is not found before deleting', async () => {
			mockRequireUser.mockResolvedValue(null);
			mockGetStatement.mockResolvedValue(null);

			await DELETE(mockEvent);

			expect(mockJson).toHaveBeenCalledWith({ error: 'Statement not found' }, { status: 404 });
		});

		it('should delete statement and return success on success', async () => {
			mockRequireUser.mockResolvedValue(null);
			const statement = { id: 1, name: 'Test Statement' };
			mockGetStatement.mockResolvedValue(statement);
			mockDeleteStatement.mockResolvedValue();

			await DELETE(mockEvent);

			expect(mockDeleteStatement).toHaveBeenCalledWith(mockEvent, 1);
			expect(mockJson).toHaveBeenCalledWith({
				success: true,
				message: 'Statement deleted successfully'
			});
		});

		it('should return 500 on error', async () => {
			mockRequireUser.mockResolvedValue(null);
			const statement = { id: 1, name: 'Test Statement' };
			mockGetStatement.mockResolvedValue(statement);
			const error = new Error('Database error');
			mockDeleteStatement.mockRejectedValue(error);

			await DELETE(mockEvent);

			expect(mockJson).toHaveBeenCalledWith(
				{ error: `Failed to delete statement: ${error.message}` },
				{ status: 500 }
			);
		});
	});
});
