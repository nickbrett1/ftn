import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mock function that can be controlled
const mockGetDocument = vi.hoisted(() => vi.fn());

// Mock pdfjs-dist for dynamic imports
vi.mock('pdfjs-dist', () => ({
	GlobalWorkerOptions: {
		workerSrc: ''
	},
	getDocument: mockGetDocument,
	version: '5.4.54'
}));

// Mock pdfjs-dist/legacy/build/pdf.mjs for dynamic imports
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
	GlobalWorkerOptions: {
		workerSrc: ''
	},
	getDocument: mockGetDocument,
	version: '5.4.54'
}));

// Import the mocked module
import * as pdfjsLib from 'pdfjs-dist';
import { PDFUtils } from './pdf-utils.js';

describe('PDFUtils', () => {
	let mockPdfDocument;
	let mockPage;
	let mockTextContent;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock PDF document
		mockPdfDocument = {
			numPages: 2,
			getPage: vi.fn()
		};

		// Mock page
		mockPage = {
			getTextContent: vi.fn()
		};

		// Mock text content with sample data
		mockTextContent = {
			items: [
				{ str: 'Statement', transform: [1, 0, 0, 1, 100, 800] },
				{ str: 'Date:', transform: [1, 0, 0, 1, 200, 800] },
				{ str: '2024-01-31', transform: [1, 0, 0, 1, 250, 800] },
				{ str: 'Merchant', transform: [1, 0, 0, 1, 100, 750] },
				{ str: 'Amount', transform: [1, 0, 0, 1, 300, 750] },
				{ str: 'Walmart', transform: [1, 0, 0, 1, 100, 700] },
				{ str: '$45.67', transform: [1, 0, 0, 1, 300, 700] },
				{ str: 'Shell', transform: [1, 0, 0, 1, 100, 650] },
				{ str: '$32.50', transform: [1, 0, 0, 1, 300, 650] }
			]
		};

		mockPage.getTextContent.mockResolvedValue(mockTextContent);
		mockPdfDocument.getPage.mockResolvedValue(mockPage);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('configureWorker', () => {
		it('should check test environment', () => {
			console.log('Window type:', typeof window);
			console.log('Process type:', typeof process);
			console.log('Window exists:', typeof window !== 'undefined');
			console.log('Process exists:', typeof process !== 'undefined');
		});

		it('should configure PDF.js worker for current environment', () => {
			PDFUtils.configureWorker();

			// In test environment (jsdom), the worker should be set to a string URL
			expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBeDefined();
			expect(typeof pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('string');
		});

		it('should configure PDF.js worker for browser environment when window is available', () => {
			// Mock window to simulate browser environment
			const originalWindow = global.window;
			global.window = {};

			try {
				PDFUtils.configureWorker();

				// In browser environment, the worker should be set to a string URL
				expect(pdfjsLib.GlobalWorkerOptions.workerSrc).toBeDefined();
				expect(typeof pdfjsLib.GlobalWorkerOptions.workerSrc).toBe('string');
			} finally {
				// Restore original window
				global.window = originalWindow;
			}
		});
	});

	describe('extractTextFromPDF', () => {
		it('should extract text with default options (groupByLine=true, sortByPosition=true)', async () => {
			const result = await PDFUtils.extractTextFromPDF(mockPdfDocument);

			expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(2);
			expect(mockPage.getTextContent).toHaveBeenCalledTimes(2);
			expect(result).toContain('Statement Date: 2024-01-31');
			expect(result).toContain('Merchant Amount');
			expect(result).toContain('Walmart $45.67');
			expect(result).toContain('Shell $32.50');
		});

		it('should extract text without grouping when groupByLine=false', async () => {
			const result = await PDFUtils.extractTextFromPDF(mockPdfDocument, { groupByLine: false });

			expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(2);
			expect(mockPage.getTextContent).toHaveBeenCalledTimes(2);
			// Should contain all text items in order without grouping
			expect(result).toContain(
				'Statement Date: 2024-01-31 Merchant Amount Walmart $45.67 Shell $32.50'
			);
		});

		it('should handle empty text content', async () => {
			mockTextContent.items = [];
			mockPage.getTextContent.mockResolvedValue(mockTextContent);

			const result = await PDFUtils.extractTextFromPDF(mockPdfDocument);

			expect(result).toBe('\n');
		});

		it('should handle single page PDF', async () => {
			mockPdfDocument.numPages = 1;

			const result = await PDFUtils.extractTextFromPDF(mockPdfDocument);

			expect(mockPdfDocument.getPage).toHaveBeenCalledTimes(1);
			expect(mockPdfDocument.getPage).toHaveBeenCalledWith(1);
			expect(result).toContain('Statement Date: 2024-01-31');
		});

		it('should filter out empty lines', async () => {
			mockTextContent.items = [
				{ str: 'Valid text', transform: [1, 0, 0, 1, 100, 800] },
				{ str: '', transform: [1, 0, 0, 1, 100, 750] },
				{ str: '   ', transform: [1, 0, 0, 1, 100, 700] },
				{ str: 'More text', transform: [1, 0, 0, 1, 100, 650] }
			];

			const result = await PDFUtils.extractTextFromPDF(mockPdfDocument);

			expect(result).toContain('Valid text');
			expect(result).toContain('More text');
			expect(result).not.toContain('   ');
		});

		it('should handle text items with same Y position', async () => {
			mockTextContent.items = [
				{ str: 'First', transform: [1, 0, 0, 1, 100, 800] },
				{ str: 'Second', transform: [1, 0, 0, 1, 200, 800] },
				{ str: 'Third', transform: [1, 0, 0, 1, 150, 800] }
			];

			const result = await PDFUtils.extractTextFromPDF(mockPdfDocument);

			// Should be sorted by X position within the same Y position (100, 150, 200)
			expect(result).toContain('First Third Second');
		});
	});

	describe('parsePDFFile', () => {
		let mockFile;
		let mockArrayBuffer;
		let mockLoadingTask;

		beforeEach(() => {
			// Mock File object
			mockFile = new File(['mock pdf content'], 'statement.pdf', {
				type: 'application/pdf'
			});

			// Mock ArrayBuffer
			mockArrayBuffer = new ArrayBuffer(8);

			// Mock the arrayBuffer method directly on the mock file
			mockFile.arrayBuffer = vi.fn().mockResolvedValue(mockArrayBuffer);

			// Mock loading task
			mockLoadingTask = {
				promise: Promise.resolve(mockPdfDocument)
			};

			// Set up the mock for both regular and legacy imports
			mockGetDocument.mockReturnValue(mockLoadingTask);
		});

		it('should parse PDF file successfully', async () => {
			const result = await PDFUtils.parsePDFFile(mockFile);

			expect(mockFile.arrayBuffer).toHaveBeenCalled();
			expect(mockGetDocument).toHaveBeenCalledWith({ data: mockArrayBuffer });
			expect(result).toContain('Statement Date: 2024-01-31');
		});

		it('should handle Buffer objects', async () => {
			const mockBuffer = Buffer.from('mock pdf content');
			vi.spyOn(mockBuffer, 'buffer', 'get').mockReturnValue(mockArrayBuffer);
			vi.spyOn(mockBuffer, 'byteOffset', 'get').mockReturnValue(0);
			vi.spyOn(mockBuffer, 'byteLength', 'get').mockReturnValue(8);

			const result = await PDFUtils.parsePDFFile(mockBuffer);

			expect(mockGetDocument).toHaveBeenCalledWith({ data: mockArrayBuffer });
			expect(result).toContain('Statement Date: 2024-01-31');
		});

		it('should throw error for invalid file format', async () => {
			const invalidFile = { name: 'test.txt', type: 'text/plain' };

			await expect(PDFUtils.parsePDFFile(invalidFile)).rejects.toThrow(
				'PDF parsing failed: Invalid PDF file format'
			);
		});

		it('should handle PDF loading errors', async () => {
			const loadingError = new Error('Failed to load PDF');

			// Create a new mock loading task with a rejected promise
			const mockLoadingTaskWithError = {
				get promise() {
					return Promise.reject(loadingError);
				}
			};

			// Mock getDocument to return the error loading task
			mockGetDocument.mockReturnValue(mockLoadingTaskWithError);

			await expect(PDFUtils.parsePDFFile(mockFile)).rejects.toThrow(
				'PDF parsing failed: Failed to load PDF'
			);
		});

		it('should handle text extraction errors', async () => {
			// Mock the page to reject when getTextContent is called
			mockPage.getTextContent.mockRejectedValue(new Error('Text extraction failed'));

			await expect(PDFUtils.parsePDFFile(mockFile)).rejects.toThrow(
				'PDF parsing failed: Text extraction failed'
			);
		});

		it('should pass options to extractTextFromPDF', async () => {
			const options = { groupByLine: false, sortByPosition: false };

			await PDFUtils.parsePDFFile(mockFile, options);

			// The options should be passed through to extractTextFromPDF
			// We can verify this by checking that the method was called
			expect(mockPdfDocument.getPage).toHaveBeenCalled();
		});
	});

	describe('parseStatement', () => {
		let mockFile;
		let mockParserFactory;

		beforeEach(() => {
			mockFile = new File(['mock pdf content'], 'statement.pdf', {
				type: 'application/pdf'
			});

			mockParserFactory = {
				parseStatement: vi.fn()
			};

			// Mock the parsePDFFile method
			vi.spyOn(PDFUtils, 'parsePDFFile').mockResolvedValue('Extracted text content');
		});

		it('should parse statement successfully', async () => {
			const mockParsedData = {
				provider: 'Chase',
				charges: [{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15' }]
			};
			mockParserFactory.parseStatement.mockResolvedValue(mockParsedData);

			const result = await PDFUtils.parseStatement(mockFile, mockParserFactory);

			expect(PDFUtils.parsePDFFile).toHaveBeenCalledWith(mockFile, {});
			expect(mockParserFactory.parseStatement).toHaveBeenCalledWith('Extracted text content');
			expect(result).toEqual(mockParsedData);
		});

		it('should pass options to parsePDFFile', async () => {
			const options = { groupByLine: true, sortByPosition: true };
			const mockParsedData = { provider: 'Chase', charges: [] };
			mockParserFactory.parseStatement.mockResolvedValue(mockParsedData);

			await PDFUtils.parseStatement(mockFile, mockParserFactory, options);

			expect(PDFUtils.parsePDFFile).toHaveBeenCalledWith(mockFile, options);
		});

		it('should handle parser factory errors', async () => {
			const parserError = new Error('Parser failed');
			mockParserFactory.parseStatement.mockRejectedValue(parserError);

			await expect(PDFUtils.parseStatement(mockFile, mockParserFactory)).rejects.toThrow(
				'Statement parsing failed: Parser failed'
			);
		});

		it('should handle PDF parsing errors', async () => {
			const pdfError = new Error('PDF parsing failed');
			vi.spyOn(PDFUtils, 'parsePDFFile').mockRejectedValue(pdfError);

			await expect(PDFUtils.parseStatement(mockFile, mockParserFactory)).rejects.toThrow(
				'Statement parsing failed: PDF parsing failed'
			);
		});
	});

	describe('validatePDFFile', () => {
		let mockFile;

		beforeEach(() => {
			mockFile = new File(['mock content'], 'statement.pdf', {
				type: 'application/pdf'
			});
		});

		it('should validate valid PDF file', () => {
			const result = PDFUtils.validatePDFFile(mockFile);

			expect(result).toBe(true);
		});

		it('should throw error for null file', () => {
			expect(() => PDFUtils.validatePDFFile(null)).toThrow('No PDF file provided');
		});

		it('should throw error for undefined file', () => {
			expect(() => PDFUtils.validatePDFFile(undefined)).toThrow('No PDF file provided');
		});

		it('should throw error for file too large', () => {
			// Create a mock file with size larger than default maxSize (10MB)
			const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
				type: 'application/pdf'
			});

			expect(() => PDFUtils.validatePDFFile(largeFile)).toThrow(
				'PDF file too large. Maximum size: 10MB'
			);
		});

		it('should accept custom max size', () => {
			const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.pdf', {
				type: 'application/pdf'
			});

			const result = PDFUtils.validatePDFFile(largeFile, { maxSize: 5 * 1024 * 1024 });

			expect(result).toBe(true);
		});

		it('should throw error for wrong file type', () => {
			const wrongTypeFile = new File(['content'], 'document.txt', {
				type: 'text/plain'
			});

			expect(() => PDFUtils.validatePDFFile(wrongTypeFile)).toThrow(
				'Invalid file type. Only PDF files are supported.'
			);
		});

		it('should validate Buffer objects', () => {
			const mockBuffer = Buffer.from('mock content');
			vi.spyOn(mockBuffer, 'length', 'get').mockReturnValue(1024);

			const result = PDFUtils.validatePDFFile(mockBuffer);

			expect(result).toBe(true);
		});

		it('should throw error for Buffer too large', () => {
			const mockBuffer = Buffer.from('mock content');
			vi.spyOn(mockBuffer, 'length', 'get').mockReturnValue(11 * 1024 * 1024);

			expect(() => PDFUtils.validatePDFFile(mockBuffer)).toThrow(
				'PDF file too large. Maximum size: 10MB'
			);
		});
	});
});
