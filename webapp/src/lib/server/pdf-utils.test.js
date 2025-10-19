import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerPDFUtils } from './pdf-utils.js';

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
	default: vi.fn()
}));

describe('ServerPDFUtils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('extractTextFromPDF', () => {
		it('should extract text from PDF buffer', async () => {
			const mockPdfData = {
				text: 'Sample PDF text content',
				numpages: 1
			};
			
			const pdf = await import('pdf-parse');
			pdf.default.mockResolvedValue(mockPdfData);

			const buffer = Buffer.from('mock pdf data');
			const result = await ServerPDFUtils.extractTextFromPDF(buffer);

			expect(pdf.default).toHaveBeenCalledWith(buffer, {});
			expect(result).toBe('Sample PDF text content');
		});

		it('should handle ArrayBuffer input', async () => {
			const mockPdfData = {
				text: 'Sample PDF text content',
				numpages: 1
			};
			
			const pdf = await import('pdf-parse');
			pdf.default.mockResolvedValue(mockPdfData);

			const arrayBuffer = new ArrayBuffer(8);
			const result = await ServerPDFUtils.extractTextFromPDF(arrayBuffer);

			expect(pdf.default).toHaveBeenCalledWith(expect.any(Buffer), {});
			expect(result).toBe('Sample PDF text content');
		});

		it('should throw error for invalid buffer format', async () => {
			await expect(ServerPDFUtils.extractTextFromPDF('invalid')).rejects.toThrow('Invalid PDF buffer format');
		});

		it('should handle PDF parsing errors', async () => {
			const pdf = await import('pdf-parse');
			pdf.default.mockRejectedValue(new Error('PDF parsing failed'));

			const buffer = Buffer.from('mock pdf data');
			await expect(ServerPDFUtils.extractTextFromPDF(buffer)).rejects.toThrow('PDF text extraction failed: PDF parsing failed');
		});
	});

	describe('parsePDFFile', () => {
		it('should parse File object', async () => {
			const mockPdfData = {
				text: 'Sample PDF text content',
				numpages: 1
			};
			
			const pdf = await import('pdf-parse');
			pdf.default.mockResolvedValue(mockPdfData);

			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				size: 1024,
				type: 'application/pdf'
			};

			const result = await ServerPDFUtils.parsePDFFile(mockFile);

			expect(mockFile.arrayBuffer).toHaveBeenCalled();
			expect(pdf.default).toHaveBeenCalledWith(expect.any(Buffer), {});
			expect(result).toBe('Sample PDF text content');
		});

		it('should parse Buffer object', async () => {
			const mockPdfData = {
				text: 'Sample PDF text content',
				numpages: 1
			};
			
			const pdf = await import('pdf-parse');
			pdf.default.mockResolvedValue(mockPdfData);

			const buffer = Buffer.from('mock pdf data');
			const result = await ServerPDFUtils.parsePDFFile(buffer);

			expect(pdf.default).toHaveBeenCalledWith(buffer, {});
			expect(result).toBe('Sample PDF text content');
		});

		it('should throw error for invalid file format', async () => {
			await expect(ServerPDFUtils.parsePDFFile('invalid')).rejects.toThrow('Invalid PDF file format');
		});
	});

	describe('parseStatement', () => {
		it('should parse statement successfully', async () => {
			const mockPdfData = {
				text: 'Sample PDF text content',
				numpages: 1
			};
			
			const pdf = await import('pdf-parse');
			pdf.default.mockResolvedValue(mockPdfData);

			const mockParserFactory = {
				parseStatement: vi.fn().mockResolvedValue({
					last4: '1234',
					charges: []
				})
			};

			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				size: 1024,
				type: 'application/pdf'
			};

			const result = await ServerPDFUtils.parseStatement(mockFile, mockParserFactory);

			expect(mockParserFactory.parseStatement).toHaveBeenCalledWith('Sample PDF text content');
			expect(result).toEqual({
				last4: '1234',
				charges: []
			});
		});

		it('should handle parsing errors', async () => {
			const mockParserFactory = {
				parseStatement: vi.fn().mockRejectedValue(new Error('Parser failed'))
			};

			const mockFile = {
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
				size: 1024,
				type: 'application/pdf'
			};

			await expect(ServerPDFUtils.parseStatement(mockFile, mockParserFactory)).rejects.toThrow('Statement parsing failed: Parser failed');
		});
	});

	describe('validatePDFFile', () => {
		it('should validate File object', () => {
			const mockFile = {
				size: 1024,
				type: 'application/pdf',
				arrayBuffer: vi.fn()
			};

			expect(ServerPDFUtils.validatePDFFile(mockFile)).toBe(true);
		});

		it('should validate Buffer object', () => {
			const buffer = Buffer.alloc(1024);
			expect(ServerPDFUtils.validatePDFFile(buffer)).toBe(true);
		});

		it('should validate ArrayBuffer object', () => {
			const arrayBuffer = new ArrayBuffer(1024);
			expect(ServerPDFUtils.validatePDFFile(arrayBuffer)).toBe(true);
		});

		it('should throw error for no file', () => {
			expect(() => ServerPDFUtils.validatePDFFile(null)).toThrow('No PDF file provided');
		});

		it('should throw error for file too large', () => {
			const mockFile = {
				size: 11 * 1024 * 1024, // 11MB
				type: 'application/pdf'
			};

			expect(() => ServerPDFUtils.validatePDFFile(mockFile)).toThrow('PDF file too large. Maximum size: 10MB');
		});

		it('should throw error for invalid file type', () => {
			const mockFile = {
				size: 1024,
				type: 'text/plain'
			};

			expect(() => ServerPDFUtils.validatePDFFile(mockFile)).toThrow('Invalid file type. Only PDF files are supported.');
		});

		it('should throw error for invalid file format', () => {
			expect(() => ServerPDFUtils.validatePDFFile('invalid')).toThrow('Invalid PDF file format');
		});
	});
});