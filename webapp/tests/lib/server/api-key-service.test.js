import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService, SYSTEM_KEY_NAME } from '../../../src/lib/server/api-key-service.js';
import * as db from '../../../src/lib/server/db.js';

vi.mock('../../../src/lib/server/db.js', () => ({
	getApiKeysDb: vi.fn(),
	executeApiKeysQuery: vi.fn(),
	getApiKeysFirstResult: vi.fn()
}));

// Mock crypto module directly for testing
if (!globalThis.crypto) {
	globalThis.crypto = {
		subtle: {
			digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
		},
		randomUUID: vi.fn().mockReturnValue('1234-5678')
	};
} else {
	// If it exists, wrap the real one with mocks if not already mocked
	if (!vi.isMockFunction(globalThis.crypto.subtle?.digest)) {
		vi.spyOn(globalThis.crypto.subtle, 'digest').mockResolvedValue(new ArrayBuffer(32));
	}
	if (!vi.isMockFunction(globalThis.crypto.randomUUID)) {
		vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('1234-5678');
	}
}

describe('ApiKeyService', () => {
	let service;
	let mockEnv;

	beforeEach(() => {
		vi.resetAllMocks();
		mockEnv = { API_KEYS_DB: {} };
		db.getApiKeysDb.mockReturnValue(mockEnv.API_KEYS_DB);
		service = new ApiKeyService(mockEnv);
		globalThis.crypto.randomUUID.mockReturnValue('1234-5678');
		globalThis.crypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));
	});

	it('creates a new key', async () => {
		const userEmail = 'test@example.com';
		const name = 'Test Key';
		db.getApiKeysFirstResult.mockResolvedValue(null);

		const key = await service.createKey(userEmail, name);

		expect(key).toHaveProperty('id');
		expect(key.name).toBe(name);
		expect(key).toHaveProperty('rawKey');
		expect(key.rawKey.startsWith('pat_')).toBe(true);

		expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
			mockEnv.API_KEYS_DB,
			expect.stringContaining('INSERT INTO ApiKeys'),
			expect.arrayContaining([expect.any(String), userEmail, expect.any(String), name])
		);
	});

	it('throws error when creating a key with duplicate name', async () => {
		const userEmail = 'test@example.com';
		const name = 'Duplicate Key';
		db.getApiKeysFirstResult.mockResolvedValue({ id: '1' });

		await expect(service.createKey(userEmail, name)).rejects.toThrow(
			'An API key with this name already exists'
		);
	});

	it('retrieves keys for a user', async () => {
		const mockKeys = [
			{
				id: '1',
				name: 'Key 1',
				createdAt: '2026-06-20 18:48:00',
				lastUsedAt: '2026-06-20 19:48:00'
			}
		];
		db.executeApiKeysQuery.mockResolvedValue(mockKeys);

		const result = await service.getKeysForUser('test@example.com');

		expect(result).toEqual([
			{
				id: '1',
				name: 'Key 1',
				kind: 'user',
				createdAt: '2026-06-20T18:48:00.000Z',
				lastUsedAt: '2026-06-20T19:48:00.000Z'
			}
		]);
		expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
			mockEnv.API_KEYS_DB,
			expect.stringContaining('SELECT id, name'),
			['test@example.com']
		);
	});

	it('revokes a key', async () => {
		await service.revokeKey('key-1', 'test@example.com');

		expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
			mockEnv.API_KEYS_DB,
			expect.stringContaining('DELETE FROM ApiKeys'),
			['key-1', 'test@example.com']
		);
	});

	describe('validateKey', () => {
		it('returns undefined for invalid prefix', async () => {
			const result = await service.validateKey('invalid_key');
			expect(result).toBeUndefined();
			expect(db.getApiKeysFirstResult).not.toHaveBeenCalled();
		});

		it('returns undefined for empty key', async () => {
			const result = await service.validateKey('');
			expect(result).toBeUndefined();
			expect(db.getApiKeysFirstResult).not.toHaveBeenCalled();
		});

		it('returns undefined for null key', async () => {
			const result = await service.validateKey(null);
			expect(result).toBeUndefined();
			expect(db.getApiKeysFirstResult).not.toHaveBeenCalled();
		});

		it('returns user_email for valid key', async () => {
			db.getApiKeysFirstResult.mockResolvedValue({ id: '1', user_email: 'test@example.com' });

			const result = await service.validateKey('pat_123456');

			expect(result).toBe('test@example.com');
			expect(db.getApiKeysFirstResult).toHaveBeenCalled();
			expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
				mockEnv.API_KEYS_DB,
				expect.stringContaining('UPDATE ApiKeys'),
				expect.any(Array)
			);
		});

		it('returns undefined when key not found in db', async () => {
			db.getApiKeysFirstResult.mockResolvedValue(null);

			const result = await service.validateKey('pat_123456');

			expect(result).toBeUndefined();
			expect(db.getApiKeysFirstResult).toHaveBeenCalled();
			expect(db.executeApiKeysQuery).not.toHaveBeenCalledWith(
				mockEnv.API_KEYS_DB,
				expect.stringContaining('UPDATE ApiKeys'),
				expect.any(Array)
			);
		});
	});
});

describe('Rate Limiting in ApiKeyService', () => {
	let service;
	let mockEnv;

	beforeEach(() => {
		vi.resetAllMocks();
		mockEnv = { API_KEYS_DB: {} };
		db.getApiKeysDb.mockReturnValue(mockEnv.API_KEYS_DB);
		service = new ApiKeyService(mockEnv);
	});

	it('throws error when rate limit is exceeded', async () => {
		const futureDate = new Date();
		futureDate.setMinutes(futureDate.getMinutes() + 1);

		db.getApiKeysFirstResult.mockResolvedValue({
			id: '1',
			user_email: 'test@example.com',
			rate_limit_count: 100,
			rate_limit_reset_at: futureDate.toISOString().replace('T', ' ').replace('Z', '')
		});

		await expect(service.validateKey('pat_123456')).rejects.toThrow('Rate limit exceeded');
	});

	it('resets rate limit counter after reset time has passed', async () => {
		const pastDate = new Date();
		pastDate.setMinutes(pastDate.getMinutes() - 1);

		db.getApiKeysFirstResult.mockResolvedValue({
			id: '1',
			user_email: 'test@example.com',
			rate_limit_count: 100,
			rate_limit_reset_at: pastDate.toISOString().replace('T', ' ').replace('Z', '')
		});

		const result = await service.validateKey('pat_123456');
		expect(result).toBe('test@example.com');

		// The update query should reset count to 1
		expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
			mockEnv.API_KEYS_DB,
			expect.stringContaining('UPDATE ApiKeys'),
			expect.arrayContaining([1, expect.any(String), '1'])
		);
	});

	describe('system-managed keys', () => {
		it('creates one on first call and reports that it created it', async () => {
			db.getApiKeysFirstResult.mockResolvedValue(null);

			const result = await service.ensureSystemKey('test@example.com');

			expect(result.created).toBe(true);
			expect(result.kind).toBe('system');
			expect(result.name).toBe(SYSTEM_KEY_NAME);
			expect(result.rawKey.startsWith('pat_')).toBe(true);
			expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
				mockEnv.API_KEYS_DB,
				expect.stringContaining('INSERT INTO ApiKeys'),
				expect.arrayContaining([
					expect.any(String),
					'test@example.com',
					expect.any(String),
					SYSTEM_KEY_NAME,
					'system'
				])
			);
		});

		it('is idempotent — an existing key is returned without a new value', async () => {
			// Sign-in calls this every time, so it must not mint a key per visit.
			db.getApiKeysFirstResult.mockResolvedValue({ id: 'existing-id' });

			const result = await service.ensureSystemKey('test@example.com');

			expect(result).toEqual({
				id: 'existing-id',
				name: SYSTEM_KEY_NAME,
				kind: 'system',
				created: false,
				rawKey: null
			});
			expect(db.executeApiKeysQuery).not.toHaveBeenCalledWith(
				mockEnv.API_KEYS_DB,
				expect.stringContaining('INSERT INTO ApiKeys'),
				expect.anything()
			);
		});

		it('rotates a system key and bumps the rotation counter', async () => {
			db.getApiKeysFirstResult.mockResolvedValue({
				id: 'sys-1',
				name: SYSTEM_KEY_NAME,
				kind: 'system'
			});

			const result = await service.rotateSystemKey('sys-1', 'test@example.com');

			expect(result.rawKey.startsWith('pat_')).toBe(true);
			expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
				mockEnv.API_KEYS_DB,
				expect.stringContaining('rotation = rotation + 1'),
				[expect.any(String), 'sys-1', 'test@example.com']
			);
		});

		it('refuses to rotate a key a human holds', async () => {
			// Rotating a user's own PAT would break them silently; they can
			// delete and recreate it instead.
			db.getApiKeysFirstResult.mockResolvedValue({ id: 'u-1', name: 'My Key', kind: 'user' });

			await expect(service.rotateSystemKey('u-1', 'test@example.com')).rejects.toThrow(
				'Only system-managed keys can be rotated'
			);
		});

		it('refuses to rotate an unknown key', async () => {
			db.getApiKeysFirstResult.mockResolvedValue(null);

			await expect(service.rotateSystemKey('nope', 'test@example.com')).rejects.toThrow(
				'API key not found'
			);
		});

		it('refuses to delete a system key', async () => {
			db.getApiKeysFirstResult.mockResolvedValue({ kind: 'system' });

			await expect(service.revokeKey('sys-1', 'test@example.com')).rejects.toThrow(
				'System-managed keys cannot be deleted'
			);
		});

		it('still deletes a user key', async () => {
			db.getApiKeysFirstResult.mockResolvedValue({ kind: 'user' });

			await service.revokeKey('u-1', 'test@example.com');

			expect(db.executeApiKeysQuery).toHaveBeenCalledWith(
				mockEnv.API_KEYS_DB,
				expect.stringContaining('DELETE FROM ApiKeys'),
				['u-1', 'test@example.com']
			);
		});
	});
});
