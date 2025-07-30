import { describe, it, expect, beforeEach } from 'vitest';
import { BaseStatementParser } from './base-parser.js';

describe('BaseStatementParser', () => {
	let parser;

	beforeEach(() => {
		parser = new BaseStatementParser();
	});

	describe('parseDate', () => {
		it('should parse MM/DD/YYYY format', () => {
			expect(parser.parseDate('01/15/2024')).toBe('2024-01-15');
			expect(parser.parseDate('12/31/2023')).toBe('2023-12-31');
		});

		it('should parse MM-DD-YYYY format', () => {
			expect(parser.parseDate('01-15-2024')).toBe('2024-01-15');
			expect(parser.parseDate('12-31-2023')).toBe('2023-12-31');
		});

		it('should parse YYYY-MM-DD format', () => {
			expect(parser.parseDate('2024-01-15')).toBe('2024-01-15');
			expect(parser.parseDate('2023-12-31')).toBe('2023-12-31');
		});

		it('should parse MM/DD/YY format', () => {
			expect(parser.parseDate('01/15/24')).toBe('2024-01-15');
			expect(parser.parseDate('01/15/23')).toBe('2023-01-15');
		});

		it('should return null for invalid dates', () => {
			expect(parser.parseDate('invalid')).toBeNull();
			expect(parser.parseDate('13/32/2024')).toBeNull();
			expect(parser.parseDate('')).toBeNull();
			expect(parser.parseDate(null)).toBeNull();
		});
	});

	describe('extractAmount', () => {
		it('should extract positive amounts', () => {
			expect(parser.extractAmount('$123.45')).toBe(123.45);
			expect(parser.extractAmount('$1,234.56')).toBe(1234.56);
			expect(parser.extractAmount('123.45')).toBe(123.45);
		});

		it('should extract negative amounts', () => {
			expect(parser.extractAmount('($123.45)')).toBe(-123.45);
			expect(parser.extractAmount('-$123.45')).toBe(-123.45);
		});

		it('should return null for invalid amounts', () => {
			expect(parser.extractAmount('invalid')).toBeNull();
			expect(parser.extractAmount('')).toBeNull();
			expect(parser.extractAmount(null)).toBeNull();
		});
	});

	describe('validateCharge', () => {
		it('should validate valid charge objects', () => {
			const charge = {
				merchant: 'Test Store',
				amount: 123.45,
				date: '01/15/2024'
			};

			const result = parser.validateCharge(charge);
			expect(result).toEqual({
				merchant: 'Test Store',
				amount: 123.45,
				date: '2024-01-15',
				allocated_to: 'Both'
			});
		});

		it('should return null for invalid charge objects', () => {
			expect(parser.validateCharge(null)).toBeNull();
			expect(parser.validateCharge({})).toBeNull();
			expect(parser.validateCharge({ merchant: '', amount: 0 })).toBeNull();
			expect(parser.validateCharge({ merchant: 'Test', amount: 'invalid' })).toBeNull();
		});
	});

	describe('filterCharges', () => {
		it('should filter out payment credits', () => {
			const charges = [
				{ merchant: 'Amazon', amount: 100 },
				{ merchant: 'Payment Thank You', amount: -500 },
				{ merchant: 'Grocery Store', amount: 50 },
				{ merchant: 'Online Payment', amount: -200 }
			];

			const filtered = parser.filterCharges(charges);
			expect(filtered).toHaveLength(2);
			expect(filtered[0].merchant).toBe('Amazon');
			expect(filtered[1].merchant).toBe('Grocery Store');
		});

		it('should filter out zero amounts', () => {
			const charges = [
				{ merchant: 'Amazon', amount: 100 },
				{ merchant: 'Test Store', amount: 0 },
				{ merchant: 'Grocery Store', amount: 50 }
			];

			const filtered = parser.filterCharges(charges);
			expect(filtered).toHaveLength(2);
		});
	});

	describe('splitIntoLines', () => {
		it('should split text into clean lines', () => {
			const text = 'Line 1\n  Line 2  \n\nLine 3';
			const lines = parser.splitIntoLines(text);
			expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
		});
	});

	describe('extractSection', () => {
		it('should extract section using patterns', () => {
			const text = 'Some text before PURCHASES section content PAYMENTS after';
			const patterns = [/PURCHASES(.*?)PAYMENTS/, /SECTION(.*?)END/];

			const result = parser.extractSection(text, patterns);
			expect(result).toBe(' section content ');
		});

		it('should return empty string if no pattern matches', () => {
			const text = 'Some text without patterns';
			const patterns = [/PATTERN1/, /PATTERN2/];

			const result = parser.extractSection(text, patterns);
			expect(result).toBe('');
		});
	});
});
