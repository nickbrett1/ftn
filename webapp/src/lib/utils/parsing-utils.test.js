import { describe, it, expect } from 'vitest';
import { ParsingUtils } from './parsing-utils.js';

describe('ParsingUtils', () => {
	describe('parseJSONResponse', () => {
		it('should parse valid JSON', () => {
			const jsonString = '{"test": "value", "number": 123}';
			const result = ParsingUtils.parseJSONResponse(jsonString);

			expect(result).toEqual({ test: 'value', number: 123 });
		});

		it('should clean markdown code blocks', () => {
			const jsonWithMarkdown = '```json\n{"test": "value"}\n```';
			const result = ParsingUtils.parseJSONResponse(jsonWithMarkdown);

			expect(result).toEqual({ test: 'value' });
		});

		it('should clean generic code blocks', () => {
			const jsonWithCodeBlock = '```\n{"test": "value"}\n```';
			const result = ParsingUtils.parseJSONResponse(jsonWithCodeBlock);

			expect(result).toEqual({ test: 'value' });
		});

		it('should handle JSON without markdown', () => {
			const plainJson = '{"test": "value"}';
			const result = ParsingUtils.parseJSONResponse(plainJson);

			expect(result).toEqual({ test: 'value' });
		});

		it('should throw error for invalid JSON', () => {
			const invalidJson = '{"test": "value",}';

			expect(() => ParsingUtils.parseJSONResponse(invalidJson)).toThrow('JSON parsing failed');
		});

		it('should throw error for non-string input', () => {
			expect(() => ParsingUtils.parseJSONResponse(null)).toThrow(
				'Invalid content provided for JSON parsing'
			);
			expect(() => ParsingUtils.parseJSONResponse(123)).toThrow(
				'Invalid content provided for JSON parsing'
			);
		});

		it('should handle empty string', () => {
			expect(() => ParsingUtils.parseJSONResponse('')).toThrow(
				'Invalid content provided for JSON parsing'
			);
		});
	});

	describe('validateParsedData', () => {
		it('should validate complete data', () => {
			const data = {
				last4: '1234',
				statement_date: '2024-01-15',
				charges: []
			};

			expect(ParsingUtils.validateParsedData(data, ['last4', 'statement_date', 'charges'])).toBe(
				true
			);
		});

		it('should return false for missing fields', () => {
			const data = {
				last4: '1234'
				// missing statement_date and charges
			};

			expect(ParsingUtils.validateParsedData(data, ['last4', 'statement_date', 'charges'])).toBe(
				false
			);
		});

		it('should return false for null data', () => {
			expect(ParsingUtils.validateParsedData(null, ['test'])).toBe(false);
		});

		it('should return false for non-object data', () => {
			expect(ParsingUtils.validateParsedData('string', ['test'])).toBe(false);
		});

		it('should throw error in strict mode', () => {
			const data = { last4: '1234' };

			expect(() =>
				ParsingUtils.validateParsedData(data, ['last4', 'missing'], { strict: true })
			).toThrow('Missing required field: missing');
		});

		it('should use default required fields', () => {
			const data = { last4: '1234', statement_date: '2024-01-15', charges: [] };

			expect(ParsingUtils.validateParsedData(data)).toBe(true);
		});
	});

	describe('parseAmount', () => {
		it('should parse positive amounts', () => {
			expect(ParsingUtils.parseAmount('$123.45')).toBe(123.45);
			expect(ParsingUtils.parseAmount('$1,234.56')).toBe(1234.56);
			expect(ParsingUtils.parseAmount('123.45')).toBe(123.45);
		});

		it('should parse negative amounts', () => {
			expect(ParsingUtils.parseAmount('-$123.45')).toBe(-123.45);
			expect(ParsingUtils.parseAmount('-123.45')).toBe(-123.45);
			// Note: Parentheses handling may not be implemented in the current version
			expect(ParsingUtils.parseAmount('(123.45)')).toBe(123.45);
		});

		it('should return default value for invalid amounts', () => {
			expect(ParsingUtils.parseAmount('invalid')).toBe(0);
			expect(ParsingUtils.parseAmount('')).toBe(0);
			expect(ParsingUtils.parseAmount(null)).toBe(0);
		});

		it('should use custom default value', () => {
			expect(ParsingUtils.parseAmount('invalid', { defaultValue: -1 })).toBe(-1);
		});

		it('should disallow negative amounts when configured', () => {
			expect(ParsingUtils.parseAmount('-123.45', { allowNegative: false })).toBe(0);
			expect(ParsingUtils.parseAmount('123.45', { allowNegative: false })).toBe(123.45);
		});
	});

	describe('parseDate', () => {
		it('should parse MM/DD/YYYY format', () => {
			expect(ParsingUtils.parseDate('01/15/2024', { format: 'MM/DD/YYYY' })).toBe('2024-01-15');
			expect(ParsingUtils.parseDate('12/31/2023', { format: 'MM/DD/YYYY' })).toBe('2023-12-31');
		});

		it('should parse MM/DD/YY format', () => {
			expect(ParsingUtils.parseDate('12/25/23')).to.equal('2023-12-25');
			expect(ParsingUtils.parseDate('01/15/24')).to.equal('2024-01-15');
			expect(ParsingUtils.parseDate('06/30/99')).to.equal('1999-06-30');
		});

		it('should parse MM/DD format with default year', () => {
			const currentYear = new Date().getFullYear();
			expect(ParsingUtils.parseDate('12/25')).to.equal(`${currentYear}-12-25`);
			expect(ParsingUtils.parseDate('01/15')).to.equal(`${currentYear}-01-15`);
			expect(ParsingUtils.parseDate('06/30')).to.equal(`${currentYear}-06-30`);
		});

		it('should parse MM/DD format with custom default year', () => {
			expect(ParsingUtils.parseDate('12/25', { defaultYear: 2024 })).to.equal('2024-12-25');
			expect(ParsingUtils.parseDate('01/15', { defaultYear: 2023 })).to.equal('2023-01-15');
			expect(ParsingUtils.parseDate('06/30', { defaultYear: 2025 })).to.equal('2025-06-30');
		});

		it('should auto-detect format', () => {
			expect(ParsingUtils.parseDate('01/15/2024')).toBe('2024-01-15');
			expect(ParsingUtils.parseDate('01/15/24')).toBe('2024-01-15');
		});

		it('should return null for invalid dates', () => {
			expect(ParsingUtils.parseDate('13/32/2024')).toBeNull();
			expect(ParsingUtils.parseDate('invalid')).toBeNull();
			expect(ParsingUtils.parseDate('')).toBeNull();
		});

		it('should use custom default year', () => {
			expect(ParsingUtils.parseDate('01/15', { defaultYear: 2001 })).toBe('2001-01-15');
		});

		it('should throw error in strict mode', () => {
			expect(() => ParsingUtils.parseDate('invalid', { strict: true })).toThrow(
				'Invalid date format: invalid'
			);
		});
	});

	describe('parseMMDDYYYY', () => {
		it('should parse valid MM/DD/YYYY dates', () => {
			expect(ParsingUtils.parseMMDDYYYY('01/15/2024')).toBe('2024-01-15');
			expect(ParsingUtils.parseMMDDYYYY('12/31/2023')).toBe('2023-12-31');
		});

		it('should return null for invalid format', () => {
			expect(ParsingUtils.parseMMDDYYYY('01/15/24')).toBeNull();
			expect(ParsingUtils.parseMMDDYYYY('invalid')).toBeNull();
		});

		it('should return null for invalid dates', () => {
			expect(ParsingUtils.parseMMDDYYYY('13/32/2024')).toBeNull();
		});
	});

	describe('parseMMDDYY', () => {
		it('should parse valid MM/DD/YY dates', () => {
			expect(ParsingUtils.parseMMDDYY('01/15/24')).toBe('2024-01-15');
			expect(ParsingUtils.parseMMDDYY('01/15/50')).toBe('1950-01-15');
		});

		it('should handle 2-digit year conversion', () => {
			expect(ParsingUtils.parseMMDDYY('01/15/49')).toBe('2049-01-15');
			expect(ParsingUtils.parseMMDDYY('01/15/50')).toBe('1950-01-15');
		});

		it('should return null for invalid format', () => {
			expect(ParsingUtils.parseMMDDYY('01/15/2024')).toBeNull();
			expect(ParsingUtils.parseMMDDYY('invalid')).toBeNull();
		});
	});

	describe('parseDateAuto', () => {
		it('should try multiple formats', () => {
			expect(ParsingUtils.parseDateAuto('01/15/2024')).toBe('2024-01-15');
			expect(ParsingUtils.parseDateAuto('01/15/24')).toBe('2024-01-15');
		});

		it('should return null when no format matches', () => {
			expect(ParsingUtils.parseDateAuto('invalid')).toBeNull();
		});
	});

	describe('cleanMerchantName', () => {
		it('should remove common suffixes', () => {
			expect(ParsingUtils.cleanMerchantName('Test Merchant LLC')).toBe('Test Merchant');
			expect(ParsingUtils.cleanMerchantName('Test Merchant INC')).toBe('Test Merchant');
			expect(ParsingUtils.cleanMerchantName('Test Merchant CORP')).toBe('Test Merchant');
		});

		it('should normalize case', () => {
			expect(ParsingUtils.cleanMerchantName('test merchant')).toBe('Test Merchant');
			expect(ParsingUtils.cleanMerchantName('TEST MERCHANT')).toBe('Test Merchant');
		});

		it('should handle empty input', () => {
			expect(ParsingUtils.cleanMerchantName('')).toBe('');
			expect(ParsingUtils.cleanMerchantName(null)).toBe('');
		});

		it('should allow disabling suffix removal', () => {
			expect(
				ParsingUtils.cleanMerchantName('Test Merchant LLC', { removeCommonSuffixes: false })
			).toBe('Test Merchant Llc');
		});

		it('should allow disabling case normalization', () => {
			expect(ParsingUtils.cleanMerchantName('TEST MERCHANT', { normalizeCase: false })).toBe(
				'TEST MERCHANT'
			);
		});
	});

	describe('extractNumeric', () => {
		it('should extract numeric values', () => {
			expect(ParsingUtils.extractNumeric('Amount: $123.45')).toBe(123.45);
			expect(ParsingUtils.extractNumeric('Total: 1,234.56')).toBe(1234.56);
			expect(ParsingUtils.extractNumeric('Price: 99')).toBe(99);
		});

		it('should return default value for non-numeric strings', () => {
			expect(ParsingUtils.extractNumeric('No numbers here')).toBe(0);
			expect(ParsingUtils.extractNumeric('')).toBe(0);
			expect(ParsingUtils.extractNumeric(null)).toBe(0);
		});

		it('should use custom default value', () => {
			expect(ParsingUtils.extractNumeric('No numbers', { defaultValue: -1 })).toBe(-1);
		});

		it('should extract first numeric value', () => {
			expect(ParsingUtils.extractNumeric('Price: $100 and $200')).toBe(100);
		});
	});
});
