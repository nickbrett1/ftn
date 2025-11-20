import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenService } from '$lib/server/token-service.js';

vi.mock('$lib/server/crypto.js', () => ({
	encrypt: vi.fn(async (text) => `encrypted-${text}`),
	decrypt: vi.fn(async (text) => text.replace('encrypted-', ''))
}));

vi.mock('$lib/utils/logging', () => ({
	log: vi.fn(),
	logError: vi.fn()
}));

describe('TokenService', () => {
	let mockD1;
	let tokenService;

	beforeEach(() => {
		mockD1 = {
			prepare: vi.fn().mockReturnThis(),
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockResolvedValue({ success: true }),
			all: vi.fn().mockResolvedValue({ results: [] })
		};
		tokenService = new TokenService(mockD1);
	});

	describe('storeToken', () => {
		it('should encrypt and store token', async () => {
			const userId = 'user1';
			const service = 'github';
			const token = 'token123';

			const success = await tokenService.storeToken(userId, service, token);
			expect(success).toBe(true);
			expect(mockD1.prepare).toHaveBeenCalled();
			expect(mockD1.bind).toHaveBeenCalledWith(
				userId,
				service,
				'encrypted-token123',
				null,
				expect.any(String),
				expect.any(String),
				null,
				null
			);
		});
	});

	describe('getTokensByUserId', () => {
		it('should retrieve and decrypt tokens', async () => {
			const userId = 'user1';
			const mockResults = [
				{
					userId,
					serviceName: 'github',
					encryptedToken: 'encrypted-token123',
					encryptedRefreshToken: null
				}
			];
			mockD1.all.mockResolvedValue({ results: mockResults });

			const tokens = await tokenService.getTokensByUserId(userId);
			expect(tokens).toHaveLength(1);
			expect(tokens[0].accessToken).toBe('token123');
		});
	});

	describe('getToken', () => {
		it('should retrieve and decrypt a single token', async () => {
			const userId = 'user1';
			const service = 'github';
			const mockResults = [
				{
					userId,
					serviceName: service,
					encryptedToken: 'encrypted-token123'
				}
			];
			mockD1.all.mockResolvedValue({ results: mockResults });

			const token = await tokenService.getToken(userId, service);
			expect(token).not.toBeNull();
			expect(token.accessToken).toBe('token123');
		});

		it('should return null if token not found', async () => {
			mockD1.all.mockResolvedValue({ results: [] });
			const token = await tokenService.getToken('user1', 'github');
			expect(token).toBeNull();
		});
	});

	describe('listUserTokenServices', () => {
		it('should list services', async () => {
			const userId = 'user1';
			const mockResults = [{ serviceName: 'github', isRevoked: false }];
			mockD1.all.mockResolvedValue({ results: mockResults });

			const services = await tokenService.listUserTokenServices(userId);
			expect(services).toHaveLength(1);
			expect(services[0].serviceName).toBe('github');
			expect(services[0].hasToken).toBe(true);
		});
	});

	describe('revokeUserToken', () => {
		it('should revoke token', async () => {
			const userId = 'user1';
			const service = 'github';

			const success = await tokenService.revokeUserToken(userId, service);
			expect(success).toBe(true);
			expect(mockD1.prepare).toHaveBeenCalledWith(
				expect.stringContaining('UPDATE UserStoredAuthToken SET isRevoked = TRUE')
			);
		});
	});
});
