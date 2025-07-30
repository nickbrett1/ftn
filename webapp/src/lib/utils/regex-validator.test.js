import { describe, it, expect } from 'vitest';
import {
	isRegexSafe,
	createSafeDateRegex,
	createSafeCurrencyRegex,
	createSafeCardNumberRegex,
	createSafeBillingCycleRegex,
	createSafeCookieRegex,
	createSafeRegex
} from './regex-validator.js';

describe('Regex Validator - ReDoS Prevention', () => {
	describe('isRegexSafe', () => {
		it('should identify safe regex patterns', async () => {
			const safePatterns = [
				{ pattern: '^\\d{4}$', testString: '1234' },
				{ pattern: '^[a-z]+$', testString: 'hello' },
				{ pattern: '\\$\\d+\\.\\d{2}', testString: '$123.45' }
			];

			for (const { pattern, testString } of safePatterns) {
				const result = await isRegexSafe(pattern, testString);
				expect(result).toBe(true);
			}
		});

		it('should identify dangerous regex patterns', async () => {
			const dangerousPatterns = [
				{ pattern: '(a+)+', testString: 'a'.repeat(100) },
				{ pattern: '(\\w+)*', testString: 'test' },
				{ pattern: '(a|aa)*', testString: 'a'.repeat(50) },
				{ pattern: '(\\w+)+', testString: 'test' },
				{ pattern: '(\\w+)*\\1', testString: 'test' }
			];

			for (const { pattern, testString } of dangerousPatterns) {
				const result = await isRegexSafe(pattern, testString, 100);
				expect(result).toBe(false);
			}
		});
	});

	describe('createSafeDateRegex', () => {
		it('should create safe date regex patterns', async () => {
			const formats = ['MM/DD/YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY', 'MM/DD/YY', 'MM-DD-YY'];
			
			for (const format of formats) {
				const regex = createSafeDateRegex(format);
				expect(regex).toBeInstanceOf(RegExp);
				
				// Test with valid dates
				const testDate = format.includes('YYYY') ? '12/25/2023' : '12/25/23';
				const result = await isRegexSafe(regex.source, testDate);
				expect(result).toBe(true);
			}
		});

		it('should throw error for unsupported formats', () => {
			expect(() => createSafeDateRegex('INVALID')).toThrow('Unsupported date format');
		});
	});

	describe('createSafeCurrencyRegex', () => {
		it('should create safe currency regex', async () => {
			const regex = createSafeCurrencyRegex();
			expect(regex).toBeInstanceOf(RegExp);
			
			const testAmounts = ['$123.45', '$1,234.56', '$0.99'];
			for (const amount of testAmounts) {
				const result = await isRegexSafe(regex.source, amount);
				expect(result).toBe(true);
			}
		});
	});

	describe('createSafeCardNumberRegex', () => {
		it('should create safe card number regex', async () => {
			const regex = createSafeCardNumberRegex();
			expect(regex).toBeInstanceOf(RegExp);
			
			const testStrings = [
				'card number: ****1234',
				'account #: 1232',
				'CARD NUMBER: ****5678'
			];
			
			for (const testString of testStrings) {
				const result = await isRegexSafe(regex.source, testString);
				expect(result).toBe(true);
			}
		});
	});

	describe('createSafeBillingCycleRegex', () => {
		it('should create safe billing cycle regex', async () => {
			const regex = createSafeBillingCycleRegex();
			expect(regex).toBeInstanceOf(RegExp);
			
			const testStrings = [
				'billing period: January 2024',
				'statement cycle: Dec 2023',
				'BILLING DATE: 12/31/2023'
			];
			
			for (const testString of testStrings) {
				const result = await isRegexSafe(regex.source, testString);
				expect(result).toBe(true);
			}
		});
	});

	describe('createSafeCookieRegex', () => {
		it('should create safe cookie regex', async () => {
			const regex = createSafeCookieRegex('auth');
			expect(regex).toBeInstanceOf(RegExp);
			
			const testCookies = [
				'auth=abc123; other=xyz',
				'auth=def456',
				'other=xyz; auth=ghi789; more=123'
			];
			
			for (const cookie of testCookies) {
				const result = await isRegexSafe(regex.source, cookie);
				expect(result).toBe(true);
			}
		});
	});

	describe('createSafeRegex', () => {
		it('should create safe regex patterns', () => {
			const safePatterns = [
				'^\\d{4}$',
				'[a-z]+',
				'\\$\\d+\\.\\d{2}'
			];
			
			safePatterns.forEach(pattern => {
				const regex = createSafeRegex(pattern);
				expect(regex).toBeInstanceOf(RegExp);
			});
		});

		it('should reject dangerous regex patterns', () => {
			const dangerousPatterns = [
				'(a+)+',
				'(\\w+)*',
				'(a|aa)*',
				'(\\w+)+'
			];
			
			dangerousPatterns.forEach(pattern => {
				const regex = createSafeRegex(pattern);
				expect(regex).toBeNull();
			});
		});

		it('should handle invalid regex patterns', () => {
			const invalidPatterns = [
				'[unclosed',
				'(unclosed',
				'\\',
				'[a-z',
				'(a|b'
			];
			
			invalidPatterns.forEach(pattern => {
				const regex = createSafeRegex(pattern);
				expect(regex).toBeNull();
			});
		});
	});

	describe('Real-world pattern validation', () => {
		it('should validate patterns used in the codebase', async () => {
			const codebasePatterns = [
				{ pattern: 'auth=([^;]+)', testString: 'auth=abc123; other=xyz' },
				{ pattern: '(\\d{1,2}\\/\\d{1,2}\\/\\d{4})', testString: '12/25/2023' },
				{ pattern: '(\\$[\\d,]+\\.\\d{2})', testString: '$123.45' },
				{ pattern: '(?:card|account)\\s+(?:number|#)[:\\s]*\\*{0,4}(\\d{4})', testString: 'card number: ****1234' },
				{ pattern: '(?:billing|statement)\\s+(?:period|cycle|date)[:\\s]*([^.\\n]+)', testString: 'billing period: January 2024' }
			];
			
			for (const { pattern, testString } of codebasePatterns) {
				const result = await isRegexSafe(pattern, testString);
				expect(result).toBe(true);
			}
		});
	});
});