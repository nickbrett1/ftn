import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseParser } from './base-parser.js';
import { ParsingUtils } from '../utils/parsing-utils.js';

describe('BaseParser', () => {
	let parser;

	beforeEach(() => {
		parser = new BaseParser();
	});

	describe('parseDate', () => {
		it('should parse MM/DD format', () => {
			expect(parser.parseDate('01/15')).toBe('2001-01-15');
			expect(parser.parseDate('12/31')).toBe('2001-12-31');
		});

		it('should return null for invalid dates', () => {
			expect(parser.parseDate('invalid')).toBeNull();
			expect(parser.parseDate('13/32')).toBeNull();
			expect(parser.parseDate('')).toBeNull();
			expect(parser.parseDate(null)).toBeNull();
		});

		it('should use ParsingUtils.parseDate', () => {
			const spy = vi.spyOn(ParsingUtils, 'parseDate');
			parser.parseDate('01/15');
			expect(spy).toHaveBeenCalledWith('01/15', {});
			spy.mockRestore();
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

		it('should use ParsingUtils.parseAmount', () => {
			const spy = vi.spyOn(ParsingUtils, 'parseAmount');
			parser.parseAmount('$123.45');
			expect(spy).toHaveBeenCalledWith('$123.45', {});
			spy.mockRestore();
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

		it('should use ParsingUtils.validateParsedData', () => {
			const spy = vi.spyOn(ParsingUtils, 'validateParsedData');
			const data = { last4: '1234', statement_date: '2024-01-15', charges: [] };
			parser.validateParsedData(data);
			expect(spy).toHaveBeenCalledWith(data, ['last4', 'statement_date', 'charges'], {});
			spy.mockRestore();
		});
	});

	describe('initialize', () => {
		it('should initialize with PDF document', async () => {
			const mockPdfDocument = {
				numPages: 2,
				getPage: vi.fn().mockResolvedValue({})
			};

			await parser.initialize(mockPdfDocument);

			expect(parser.pdfDocument).toBe(mockPdfDocument);
			expect(parser.pages).toHaveLength(2);
			expect(mockPdfDocument.getPage).toHaveBeenCalledWith(1);
			expect(mockPdfDocument.getPage).toHaveBeenCalledWith(2);
		});
	});

	describe('extractPageText', () => {
		beforeEach(async () => {
			const mockPdfDocument = {
				numPages: 1,
				getPage: vi.fn().mockResolvedValue({
					getTextContent: vi.fn().mockResolvedValue({
						items: [{ str: 'Test content' }, { str: ' on page' }]
					})
				})
			};
			await parser.initialize(mockPdfDocument);
		});

		it('should extract text from specific page', async () => {
			const text = await parser.extractPageText(0);
			expect(text).toBe('Test content  on page');
		});

		it('should throw error for invalid page index', async () => {
			await expect(parser.extractPageText(999)).rejects.toThrow('Page 999 not found');
		});
	});

	describe('extractAllPagesText', () => {
		beforeEach(async () => {
			const mockPdfDocument = {
				numPages: 2,
				getPage: vi.fn().mockResolvedValue({
					getTextContent: vi.fn().mockResolvedValue({
						items: [{ str: 'Page content' }]
					})
				})
			};
			await parser.initialize(mockPdfDocument);
		});

		it('should extract text from all pages', async () => {
			const texts = await parser.extractAllPagesText();
			expect(texts).toHaveLength(2);
			expect(texts[0]).toBe('Page content');
			expect(texts[1]).toBe('Page content');
		});
	});

	describe('parse', () => {
		it('should throw error for abstract method', async () => {
			await expect(parser.parse('test')).rejects.toThrow(
				'parse() method must be implemented by subclass'
			);
		});
	});

	describe('parseJSONResponse', () => {
		it('should use ParsingUtils.parseJSONResponse', () => {
			const spy = vi.spyOn(ParsingUtils, 'parseJSONResponse');
			parser.parseJSONResponse('{"test": "data"}');
			expect(spy).toHaveBeenCalledWith('{"test": "data"}', {});
			spy.mockRestore();
		});
	});

	describe('cleanMerchantName', () => {
		it('should use ParsingUtils.cleanMerchantName', () => {
			const spy = vi.spyOn(ParsingUtils, 'cleanMerchantName');
			parser.cleanMerchantName('Test Merchant LLC');
			expect(spy).toHaveBeenCalledWith('Test Merchant LLC', {});
			spy.mockRestore();
		});
	});

	describe('extractNumeric', () => {
		it('should use ParsingUtils.extractNumeric', () => {
			const spy = vi.spyOn(ParsingUtils, 'extractNumeric');
			parser.extractNumeric('Amount: $123.45');
			expect(spy).toHaveBeenCalledWith('Amount: $123.45', {});
			spy.mockRestore();
		});
	});
});
