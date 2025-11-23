import { describe, it, expect } from 'vitest';
import {
	generateSecureRandomHex,
	generateSecureAuthToken
} from '../../../src/lib/utils/crypto-utils.js';

describe('Crypto Utils', () => {
	describe('generateSecureRandomHex', () => {
		it('should generate a hex string of default length (12 characters for 6 bytes)', () => {
			const result = generateSecureRandomHex();
			expect(result).toMatch(/^[0-9a-f]{12}$/);
			expect(result.length).toBe(12);
		});

		it('should generate a hex string of specified length', () => {
			const result = generateSecureRandomHex(4);
			expect(result).toMatch(/^[0-9a-f]{8}$/);
			expect(result.length).toBe(8);
		});

		it('should generate different values on each call', () => {
			const result1 = generateSecureRandomHex();
			const result2 = generateSecureRandomHex();
			expect(result1).not.toBe(result2);
		});

		it('should handle custom byte lengths', () => {
			const result = generateSecureRandomHex(16);
			expect(result).toMatch(/^[0-9a-f]{32}$/);
			expect(result.length).toBe(32);
		});

		it('should generate valid hex characters only', () => {
			const result = generateSecureRandomHex(10);
			expect(result).toMatch(/^[0-9a-f]+$/);
		});

		it('should pad single-digit hex values correctly', () => {
			// We can't test this directly since crypto.getRandomValues is random
			// But we can verify the format is correct
			const result = generateSecureRandomHex(1);
			expect(result).toMatch(/^[0-9a-f]{2}$/);
			expect(result.length).toBe(2);
		});
	});

	describe('generateSecureAuthToken', () => {
		it('should generate a base36 string of default length (40 characters for 20 bytes)', () => {
			const result = generateSecureAuthToken();
			expect(result).toMatch(/^[0-9a-z]{40}$/);
			expect(result.length).toBe(40);
		});

		it('should generate a base36 string of specified length', () => {
			const result = generateSecureAuthToken(4);
			expect(result).toMatch(/^[0-9a-z]{8}$/);
			expect(result.length).toBe(8);
		});

		it('should generate different values on each call', () => {
			const result1 = generateSecureAuthToken();
			const result2 = generateSecureAuthToken();
			expect(result1).not.toBe(result2);
		});

		it('should handle custom byte lengths', () => {
			const result = generateSecureAuthToken(16);
			expect(result).toMatch(/^[0-9a-z]{32}$/);
			expect(result.length).toBe(32);
		});

		it('should generate valid base36 characters only (0-9, a-z)', () => {
			const result = generateSecureAuthToken(10);
			expect(result).toMatch(/^[0-9a-z]+$/);
		});

		it('should pad single-digit base36 values correctly', () => {
			// We can't test this directly since crypto.getRandomValues is random
			// But we can verify the format is correct
			const result = generateSecureAuthToken(1);
			expect(result).toMatch(/^[0-9a-z]{2}$/);
			expect(result.length).toBe(2);
		});

		it('should generate URL-safe tokens (no uppercase, no special chars)', () => {
			const result = generateSecureAuthToken(10);
			expect(result).not.toMatch(/[A-Z]/);
			expect(result).not.toMatch(/[^0-9a-z]/);
		});
	});

	describe('Cryptographic properties', () => {
		it('should generate sufficiently random values for hex strings', () => {
			const results = new Set();
			for (let index = 0; index < 100; index++) {
				results.add(generateSecureRandomHex());
			}
			// All values should be unique (very high probability with random crypto)
			expect(results.size).toBeGreaterThan(50); // Allow some collisions due to small length
		});

		it('should generate sufficiently random values for auth tokens', () => {
			const results = new Set();
			for (let index = 0; index < 100; index++) {
				results.add(generateSecureAuthToken());
			}
			// All values should be unique (very high probability with random crypto)
			expect(results.size).toBeGreaterThan(90); // Less collisions expected with longer tokens
		});

		it('should generate different lengths correctly', () => {
			const short = generateSecureRandomHex(1);
			const long = generateSecureRandomHex(32);
			expect(short.length).toBe(2);
			expect(long.length).toBe(64);
			expect(short).not.toBe(long);
		});
	});
});
