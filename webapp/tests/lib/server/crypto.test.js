import { describe, it, expect, vi } from 'vitest';
import { encrypt, decrypt } from '$lib/server/crypto.js';

// Mock the environment variable
vi.mock('$env/static/private', () => ({
	SECRET_KEY: 'test-secret-key-must-be-at-least-32-bytes-long-for-security-reasons'
}));

vi.mock('$lib/utils/logging', () => ({
	logError: vi.fn()
}));

describe('crypto', () => {
	it('should encrypt and decrypt text correctly', async () => {
		const text = 'Hello, World!';
		const encrypted = await encrypt(text);
		expect(encrypted).not.toBe(text);

		const decrypted = await decrypt(encrypted);
		expect(decrypted).toBe(text);
	});

	it('should produce different ciphertexts for the same plaintext', async () => {
		const text = 'Hello, World!';
		const encrypted1 = await encrypt(text);
		const encrypted2 = await encrypt(text);

		expect(encrypted1).not.toBe(encrypted2);

		const decrypted1 = await decrypt(encrypted1);
		const decrypted2 = await decrypt(encrypted2);

		expect(decrypted1).toBe(text);
		expect(decrypted2).toBe(text);
	});

	it('should throw error when decrypting invalid data', async () => {
		const invalidData = 'invalid-base64-data';
		await expect(decrypt(invalidData)).rejects.toThrow();
	});
});
