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
		mockEnv = { API_KEYS_DB: {} };

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

	it('reports a system key as a bad request, not a server fault', async () => {
		// The UI offers Rotate instead of Delete for these, so reaching here
		// means something called the wrong endpoint.
		mockService.revokeKey.mockRejectedValue(
			new Error('System-managed keys cannot be deleted — rotate them instead')
		);

		const event = {
			platform: { env: mockEnv },
			params: { id: 'sys-1' }
		};
		const response = await DELETE(event);
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('System-managed keys cannot be deleted');
	});
});
