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
		it('should identify safe regex patterns', () => {
			const safePatterns = [
				{ pattern: '^\\d{4}$', testString: '1234' },
				{ pattern: '^[a-z]+$', testString: 'hello' },
				{ pattern: '\\$\\d+\\.\\d{2}', testString: '$123.45' }
			];

			safePatterns.forEach(({ pattern, testString }) => {
				expect(isRegexSafe(pattern, testString)).toBe(true);
			});
		});

		it('should identify dangerous regex patterns', () => {
			const dangerousPatterns = [
				{ pattern: '(a+)+', testString: 'a'.repeat(100) },
				{ pattern: '(\\w+)*', testString: 'test' },
				{ pattern: '(a|aa)*', testString: 'a'.repeat(50) },
				{ pattern: '(\\w+)+', testString: 'test' },
				{ pattern: '(\\w+)*\\1', testString: 'test' }
			];

			dangerousPatterns.forEach(({ pattern, testString }) => {
				expect(isRegexSafe(pattern, testString, 100)).toBe(false);
			});
		});
	});

	describe('createSafeDateRegex', () => {
		it('should create safe date regex patterns', () => {
			const formats = ['MM/DD/YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY', 'MM/DD/YY', 'MM-DD-YY'];
			
			formats.forEach(format => {
				const regex = createSafeDateRegex(format);
				expect(regex).toBeInstanceOf(RegExp);
				
				// Test with valid dates
				const testDate = format.includes('YYYY') ? '12/25/2023' : '12/25/23';
				expect(isRegexSafe(regex.source, testDate)).toBe(true);
			});
		});

		it('should throw error for unsupported formats', () => {
			expect(() => createSafeDateRegex('INVALID')).toThrow('Unsupported date format');
		});
	});

	describe('createSafeCurrencyRegex', () => {
		it('should create safe currency regex', () => {
			const regex = createSafeCurrencyRegex();
			expect(regex).toBeInstanceOf(RegExp);
			
			const testAmounts = ['$123.45', '$1,234.56', '$0.99'];
			testAmounts.forEach(amount => {
				expect(isRegexSafe(regex.source, amount)).toBe(true);
			});
		});
	});

	describe('createSafeCardNumberRegex', () => {
		it('should create safe card number regex', () => {
			const regex = createSafeCardNumberRegex();
			expect(regex).toBeInstanceOf(RegExp);
			
			const testStrings = [
				'card number: ****1234',
				'account #: 1234',
				'CARD NUMBER: ****5678'
			];
			
			testStrings.forEach(testString => {
				expect(isRegexSafe(regex.source, testString)).toBe(true);
			});
		});
	});

	describe('createSafeBillingCycleRegex', () => {
		it('should create safe billing cycle regex', () => {
			const regex = createSafeBillingCycleRegex();
			expect(regex).toBeInstanceOf(RegExp);
			
			const testStrings = [
				'billing period: January 2024',
				'statement cycle: Dec 2023',
				'BILLING DATE: 12/31/2023'
			];
			
			testStrings.forEach(testString => {
				expect(isRegexSafe(regex.source, testString)).toBe(true);
			});
		});
	});

	describe('createSafeCookieRegex', () => {
		it('should create safe cookie regex', () => {
			const regex = createSafeCookieRegex('auth');
			expect(regex).toBeInstanceOf(RegExp);
			
			const testCookies = [
				'auth=abc123; other=xyz',
				'auth=def456',
				'other=xyz; auth=ghi789; more=123'
			];
			
			testCookies.forEach(cookie => {
				expect(isRegexSafe(regex.source, cookie)).toBe(true);
			});
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
		it('should validate patterns used in the codebase', () => {
			const codebasePatterns = [
				{ pattern: 'auth=([^;]+)', testString: 'auth=abc123; other=xyz' },
				{ pattern: '(\\d{1,2}\\/\\d{1,2}\\/\\d{4})', testString: '12/25/2023' },
				{ pattern: '(\\$[\\d,]+\\.\\d{2})', testString: '$123.45' },
				{ pattern: '(?:card|account)\\s+(?:number|#)[:\\s]*\\*{0,4}(\\d{4})', testString: 'card number: ****1234' },
				{ pattern: '(?:billing|statement)\\s+(?:period|cycle|date)[:\\s]*([^.\\n]+)', testString: 'billing period: January 2024' }
			];
			
			codebasePatterns.forEach(({ pattern, testString }) => {
				expect(isRegexSafe(pattern, testString)).toBe(true);
			});
		});
	});
});