import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../../../../src/routes/api/api-keys/[id]/rotate/+server.js';
import * as auth from '../../../../../../src/lib/server/auth.js';

vi.mock('../../../../../../src/lib/server/auth.js', () => ({
	requireUser: vi.fn()
}));

let mockService = {
	rotateSystemKey: vi.fn()
};

vi.mock('../../../../../../src/lib/server/api-key-service.js', () => ({
	ApiKeyService: class {
		constructor() {
			return mockService;
		}
	}
}));

describe('/api/api-keys/[id]/rotate POST', () => {
	let mockUser;
	let mockEnv;

	beforeEach(() => {
		vi.resetAllMocks();
		mockUser = { email: 'test@example.com' };
		mockEnv = { API_KEYS_DB: {} };
		auth.requireUser.mockResolvedValue(mockUser);
		mockService.rotateSystemKey.mockReset();
	});

	it('returns the new value once', async () => {
		mockService.rotateSystemKey.mockResolvedValue({ id: 'sys-1', rawKey: 'pat_new' });

		const response = await POST({ platform: { env: mockEnv }, params: { id: 'sys-1' } });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.rawKey).toBe('pat_new');
		expect(mockService.rotateSystemKey).toHaveBeenCalledWith('sys-1', mockUser.email);
	});

	it('rejects rotating a key a human created', async () => {
		mockService.rotateSystemKey.mockRejectedValue(
			new Error('Only system-managed keys can be rotated')
		);

		const response = await POST({ platform: { env: mockEnv }, params: { id: 'u-1' } });
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.error).toContain('Only system-managed keys can be rotated');
	});

	it('reports an unknown key as a bad request', async () => {
		mockService.rotateSystemKey.mockRejectedValue(new Error('API key not found'));

		const response = await POST({ platform: { env: mockEnv }, params: { id: 'nope' } });

		expect(response.status).toBe(400);
	});

	it('does not leak other failures', async () => {
		mockService.rotateSystemKey.mockRejectedValue(new Error('D1_ERROR: internal'));

		const response = await POST({ platform: { env: mockEnv }, params: { id: 'sys-1' } });
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to rotate API key');
	});
});
