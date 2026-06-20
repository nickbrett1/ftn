import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../../../src/routes/api/api-keys/+server.js';
import * as auth from '../../../../src/lib/server/auth.js';
import { ApiKeyService } from '../../../../src/lib/server/api-key-service.js';

vi.mock('../../../../src/lib/server/auth.js', () => ({
	requireUser: vi.fn()
}));

let mockService = {
	getKeysForUser: vi.fn(),
	createKey: vi.fn()
};

vi.mock('../../../../src/lib/server/api-key-service.js', () => ({
	ApiKeyService: class {
		constructor() {
			return mockService;
		}
	}
}));

describe('/api/api-keys', () => {
	let mockUser;
	let mockEnv;

	beforeEach(() => {
		vi.resetAllMocks();
		mockUser = { email: 'test@example.com' };
		mockEnv = { GENPROJ_DB: {} };

		auth.requireUser.mockResolvedValue(mockUser);

		mockService.getKeysForUser.mockReset();
		mockService.createKey.mockReset();
	});

	describe('GET', () => {
		it('returns keys for authenticated user', async () => {
			const mockKeys = [{ id: '1', name: 'Key 1' }];
			mockService.getKeysForUser.mockResolvedValue(mockKeys);

			const event = { platform: { env: mockEnv } };
			const response = await GET(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.keys).toEqual(mockKeys);
			expect(mockService.getKeysForUser).toHaveBeenCalledWith(mockUser.email);
		});

		it('handles errors', async () => {
			mockService.getKeysForUser.mockRejectedValue(new Error('DB Error'));

			const event = { platform: { env: mockEnv } };
			const response = await GET(event);

			expect(response.status).toBe(500);
		});
	});

	describe('POST', () => {
		it('creates a new key', async () => {
			const newKey = { id: '1', name: 'Test Key', rawKey: 'pat_123' };
			mockService.createKey.mockResolvedValue(newKey);

			const event = {
				platform: { env: mockEnv },
				request: {
					json: vi.fn().mockResolvedValue({ name: 'Test Key' })
				}
			};
			const response = await POST(event);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.key).toEqual(newKey);
			expect(mockService.createKey).toHaveBeenCalledWith(mockUser.email, 'Test Key');
		});

		it('uses default name if none provided', async () => {
			const newKey = { id: '1', name: 'New API Key', rawKey: 'pat_123' };
			mockService.createKey.mockResolvedValue(newKey);

			const event = {
				platform: { env: mockEnv },
				request: {
					json: vi.fn().mockResolvedValue({})
				}
			};
			await POST(event);

			expect(mockService.createKey).toHaveBeenCalledWith(mockUser.email, 'New API Key');
		});

		it('handles errors', async () => {
			mockService.createKey.mockRejectedValue(new Error('DB Error'));

			const event = {
				platform: { env: mockEnv },
				request: {
					json: vi.fn().mockResolvedValue({ name: 'Test' })
				}
			};
			const response = await POST(event);

			expect(response.status).toBe(500);
		});
	});
});
