import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../../../../../src/routes/api/api-keys/[id]/+server.js';
import * as auth from '../../../../../src/lib/server/auth.js';
import { ApiKeyService } from '../../../../../src/lib/server/api-key-service.js';

vi.mock('../../../../../src/lib/server/auth.js', () => ({
	requireUser: vi.fn()
}));

let mockService = {
	revokeKey: vi.fn()
};

vi.mock('../../../../../src/lib/server/api-key-service.js', () => ({
	ApiKeyService: class {
		constructor() {
			return mockService;
		}
	}
}));

describe('/api/api-keys/[id] DELETE', () => {
	let mockUser;
	let mockEnv;

	beforeEach(() => {
		vi.resetAllMocks();
		mockUser = { email: 'test@example.com' };
		mockEnv = { GENPROJ_DB: {} };

		auth.requireUser.mockResolvedValue(mockUser);
		mockService.revokeKey.mockReset();
	});

	it('revokes a key', async () => {
		mockService.revokeKey.mockResolvedValue();

		const event = {
			platform: { env: mockEnv },
			params: { id: 'key-1' }
		};
		const response = await DELETE(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockService.revokeKey).toHaveBeenCalledWith('key-1', mockUser.email);
	});

	it('handles errors', async () => {
		mockService.revokeKey.mockRejectedValue(new Error('DB Error'));

		const event = {
			platform: { env: mockEnv },
			params: { id: 'key-1' }
		};
		const response = await DELETE(event);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to revoke API key');
	});
});
