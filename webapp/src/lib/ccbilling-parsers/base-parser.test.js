import { describe, it, expect, beforeEach } from 'vitest';
import { BaseParser } from './base-parser.js';

describe('BaseParser', () => {
	let parser;

	beforeEach(() => {
		parser = new BaseParser();
	});

	describe('parseDate', () => {
		it('should parse MM/DD format', () => {
			const currentYear = new Date().getFullYear();
			expect(parser.parseDate('01/15')).toBe(`${currentYear}-01-15`);
			expect(parser.parseDate('12/31')).toBe(`${currentYear}-12-31`);
		});

		it('should return null for invalid dates', () => {
			expect(parser.parseDate('invalid')).toBeNull();
			expect(parser.parseDate('13/32')).toBeNull();
			expect(parser.parseDate('')).toBeNull();
			expect(parser.parseDate(null)).toBeNull();
		});
	});

	describe('parseAmount', () => {
		it('should parse positive amounts', () => {
			expect(parser.parseAmount('$123.45')).toBe(123.45);
			expect(parser.parseAmount('$1,234.56')).toBe(1234.56);
			expect(parser.parseAmount('123.45')).toBe(123.45);
		});

		it('should parse negative amounts', () => {
			expect(parser.parseAmount('-$123.45')).toBe(-123.45);
			expect(parser.parseAmount('-123.45')).toBe(-123.45);
		});

		it('should return 0 for invalid amounts', () => {
			expect(parser.parseAmount('invalid')).toBe(0);
			expect(parser.parseAmount('')).toBe(0);
			expect(parser.parseAmount(null)).toBe(0);
		});
	});

	describe('findText', () => {
		it('should find text matching pattern', () => {
			const text = 'Account Number: XXXX XXXX XXXX 1234';
			const pattern = /Account Number:\s*XXXX\s+XXXX\s+XXXX\s+(\d{4})/i;

			const result = parser.findText(text, pattern);
			expect(result).toBe('1234');
		});

		it('should return null when pattern does not match', () => {
			const text = 'Some other text';
			const pattern = /Account Number:\s*XXXX\s+XXXX\s+XXXX\s+(\d{4})/i;

			const result = parser.findText(text, pattern);
			expect(result).toBeNull();
		});
	});

	describe('validateParsedData', () => {
		it('should validate complete data', () => {
			const data = {
				last4: '1234',
				statement_date: '2024-01-15',
				charges: [{ merchant: 'Test', amount: 100 }]
			};

			expect(parser.validateParsedData(data)).toBe(true);
		});

		it('should return false for missing fields', () => {
			const data = {
				last4: '1234'
				// missing statement_date and charges
			};

			expect(parser.validateParsedData(data)).toBe(false);
		});
	});
});
