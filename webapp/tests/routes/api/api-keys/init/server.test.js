import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../../../../src/routes/api/api-keys/init/+server.js';
import * as auth from '../../../../../src/lib/server/auth.js';
import { ApiKeyService } from '../../../../../src/lib/server/api-key-service.js';

vi.mock('../../../../../src/lib/server/auth.js', () => ({
	requireUser: vi.fn()
}));

let mockService = {
	initializeDatabase: vi.fn()
};

vi.mock('../../../../../src/lib/server/api-key-service.js', () => ({
	ApiKeyService: class {
		constructor() {
			return mockService;
		}
	}
}));

describe('/api/api-keys/init POST', () => {
	let mockUser;
	let mockEnv;

	beforeEach(() => {
		vi.resetAllMocks();
		mockUser = { email: 'test@example.com' };
		mockEnv = { GENPROJ_DB: {} };

		auth.requireUser.mockResolvedValue(mockUser);
		mockService.initializeDatabase.mockReset();
	});

	it('initializes the database', async () => {
		mockService.initializeDatabase.mockResolvedValue();

		const event = { platform: { env: mockEnv } };
		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(mockService.initializeDatabase).toHaveBeenCalled();
	});

	it('handles errors', async () => {
		mockService.initializeDatabase.mockRejectedValue(new Error('DB Error'));

		const event = { platform: { env: mockEnv } };
		const response = await POST(event);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data.error).toBe('Failed to initialize database');
	});
});
