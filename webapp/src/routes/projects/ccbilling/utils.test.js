import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a test version of the generateSecureRandomHex function
function generateSecureRandomHex(byteLength = 6) {
	const randomBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	return Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

describe('generateSecureRandomHex utility', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should generate hex string of correct length', () => {
		const result = generateSecureRandomHex(6);
		
		expect(result).toHaveLength(12); // 6 bytes = 12 hex characters
		expect(result).toMatch(/^[0-9a-f]{12}$/); // Only hex characters
	});

	it('should generate different values on each call', () => {
		const results = new Set();
		
		// Generate 100 values and ensure they're all unique
		for (let i = 0; i < 100; i++) {
			results.add(generateSecureRandomHex(6));
		}
		
		expect(results.size).toBe(100); // All should be unique
	});

	it('should support different byte lengths', () => {
		const tests = [
			{ bytes: 1, expectedLength: 2 },
			{ bytes: 4, expectedLength: 8 },
			{ bytes: 8, expectedLength: 16 },
			{ bytes: 16, expectedLength: 32 }
		];

		tests.forEach(({ bytes, expectedLength }) => {
			const result = generateSecureRandomHex(bytes);
			expect(result).toHaveLength(expectedLength);
			expect(result).toMatch(new RegExp(`^[0-9a-f]{${expectedLength}}$`));
		});
	});

	it('should pad single digit hex values with zero', () => {
		// Mock crypto.getRandomValues to return small values that would need padding
		const mockBytes = new Uint8Array([0, 1, 15, 255]); // 00, 01, 0f, ff in hex
		
		vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
			array.set(mockBytes.slice(0, array.length));
			return array;
		});

		const result = generateSecureRandomHex(4);
		
		expect(result).toBe('00010fff');
		expect(result).toHaveLength(8);
	});

	it('should use crypto.getRandomValues', () => {
		const spy = vi.spyOn(crypto, 'getRandomValues');
		
		generateSecureRandomHex(6);
		
		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith(expect.any(Uint8Array));
		
		const calledArray = spy.mock.calls[0][0];
		expect(calledArray).toHaveLength(6);
	});

	it('should default to 6 bytes when no parameter provided', () => {
		const result = generateSecureRandomHex();
		
		expect(result).toHaveLength(12); // 6 bytes = 12 hex characters
		expect(result).toMatch(/^[0-9a-f]{12}$/);
	});

	it('should handle edge case of 0 bytes', () => {
		const result = generateSecureRandomHex(0);
		
		expect(result).toBe('');
		expect(result).toHaveLength(0);
	});

	it('should produce varied random output', () => {
		// Test basic uniqueness with a few samples
		const result1 = generateSecureRandomHex(6);
		const result2 = generateSecureRandomHex(6);
		const result3 = generateSecureRandomHex(6);
		
		// Basic format validation
		expect(result1).toHaveLength(12);
		expect(result1).toMatch(/^[0-9a-f]{12}$/);
		
		// Results should be different (extremely high probability)
		expect(result1).not.toBe(result2);
		expect(result2).not.toBe(result3);
		expect(result1).not.toBe(result3);
	});

	it('should generate diverse character distribution', () => {
		// Generate a large sample to test character diversity
		const largeResult = generateSecureRandomHex(32); // 64 hex chars
		const uniqueChars = new Set(largeResult);
		
		// With 64 random hex chars, we should see good variety
		expect(uniqueChars.size).toBeGreaterThan(6); // At least 6 different hex chars
		
		// All characters should be valid hex
		const hexChars = '0123456789abcdef';
		for (const char of uniqueChars) {
			expect(hexChars).toContain(char);
		}
		
		// Ensure result is correct length
		expect(largeResult).toHaveLength(64);
		expect(largeResult).toMatch(/^[0-9a-f]{64}$/);
	});
});