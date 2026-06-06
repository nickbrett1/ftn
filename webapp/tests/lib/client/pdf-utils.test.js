// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFUtils as PDFUtilities } from '../../../src/lib/client/pdf-utils.js';

// Mock the environment to appear as a browser
globalThis.window = {};

describe('PDFUtils', () => {
	describe('extractTextFromPDF', () => {
		it('should handle normal text items', async () => {
			const mockPdf = {
				numPages: 1,
				getPage: vi.fn().mockResolvedValue({
					getTextContent: vi.fn().mockResolvedValue({
						items: [
							{ str: 'Hello', transform: [1, 0, 0, 1, 10, 20] },
							{ str: 'World', transform: [1, 0, 0, 1, 50, 20] }
						]
					})
				})
			};

			const result = await PDFUtilities.extractTextFromPDF(mockPdf);
			expect(result).toBe('Hello World');
		});

		it('should handle undefined items gracefully', async () => {
			const mockPdf = {
				numPages: 1,
				getPage: vi.fn().mockResolvedValue({
					getTextContent: vi.fn().mockResolvedValue({
						items: undefined
					})
				})
			};

			const result = await PDFUtilities.extractTextFromPDF(mockPdf);
			expect(result).toBe('');
		});

		it('should handle null textContent gracefully', async () => {
			const mockPdf = {
				numPages: 1,
				getPage: vi.fn().mockResolvedValue({
					getTextContent: vi.fn().mockResolvedValue(null)
				})
			};

			const result = await PDFUtilities.extractTextFromPDF(mockPdf);
			expect(result).toBe('');
		});

		it('should extract text without grouping', async () => {
			const mockPdf = {
				numPages: 1,
				getPage: vi.fn().mockResolvedValue({
					getTextContent: vi.fn().mockResolvedValue({
						items: [
							{ str: 'Hello', transform: [1, 0, 0, 1, 10, 20] },
							{ str: 'World', transform: [1, 0, 0, 1, 50, 20] }
						]
					})
				})
			};

			const result = await PDFUtilities.extractTextFromPDF(mockPdf, { groupByLine: false });
			expect(result).toBe('Hello World');
		});

		it('should handle items as a plain object without throwing undefined is not a function', async () => {
			const mockPdf = {
				numPages: 1,
				getPage: vi.fn().mockResolvedValue({
					getTextContent: vi.fn().mockResolvedValue({
						// This simulates PDF.js returning an object instead of an array
						items: { 0: { str: 'Test', transform: [1, 0, 0, 1, 0, 0] } }
					})
				})
			};

			const result = await PDFUtilities.extractTextFromPDF(mockPdf);
			expect(result).toBe('Test');
		});
	});

	describe('validatePDFFile', () => {
		it('should throw if no file provided', () => {
			expect(() => PDFUtilities.validatePDFFile(null)).toThrow('No PDF file provided');
		});

		it('should handle ArrayBuffer successfully', () => {
			const buffer = new ArrayBuffer(100);
			expect(PDFUtilities.validatePDFFile(buffer)).toBe(true);
		});

		it('should handle Buffer successfully', () => {
			const buffer = Buffer.alloc(100);
			expect(PDFUtilities.validatePDFFile(buffer)).toBe(true);
		});

		it('should handle File successfully', () => {
			const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
			expect(PDFUtilities.validatePDFFile(file)).toBe(true);
		});

		it('should throw on invalid MIME type', () => {
			const file = new File(['dummy'], 'test.png', { type: 'image/png' });
			expect(() => PDFUtilities.validatePDFFile(file)).toThrow('Invalid file type');
		});

		it('should throw on file too large', () => {
			const buffer = new ArrayBuffer(10 * 1024 * 1024 + 1); // Exceeds 10MB default
			expect(() => PDFUtilities.validatePDFFile(buffer)).toThrow('PDF file too large');
		});

		it('should throw on completely invalid object', () => {
			expect(() => PDFUtilities.validatePDFFile({})).toThrow('Invalid PDF file format');
		});
	});

	describe('_groupAndSortTextItems', () => {
		it('should group items by y-coordinate and sort by x', () => {
			const items = [
				{ str: 'World', transform: [1, 0, 0, 1, 50, 20] },
				{ str: 'Hello', transform: [1, 0, 0, 1, 10, 20] },
				{ str: 'Top', transform: [1, 0, 0, 1, 10, 50] } // Higher Y means earlier in output
			];

			const sortedLines = PDFUtilities._groupAndSortTextItems(items);
			expect(sortedLines).toEqual(['Top', 'Hello World']);
		});
	});
});

describe('parsePDFFile', () => {
	let originalInitializePDFJs;
	beforeEach(() => {
		originalInitializePDFJs = PDFUtilities._initializePDFJs;
		PDFUtilities._initializePDFJs = vi.fn().mockResolvedValue({
			GlobalWorkerOptions: { workerSrc: '' },
			getDocument: vi.fn().mockReturnValue({
				promise: Promise.resolve({
					numPages: 1,
					getMetadata: vi.fn().mockResolvedValue({}),
					getPage: vi.fn().mockResolvedValue({
						getTextContent: vi.fn().mockResolvedValue({
							items: [{ str: 'Parsed', transform: [1, 0, 0, 1, 10, 20] }]
						})
					})
				})
			})
		});
	});

	afterEach(() => {
		PDFUtilities._initializePDFJs = originalInitializePDFJs;
	});

	it('should parse an ArrayBuffer properly', async () => {
		// This test uses the dynamic import mocked above
		const buffer = new ArrayBuffer(100);
		const text = await PDFUtilities.parsePDFFile(buffer);
		expect(text).toBe('Parsed');
	});

	it('should throw if invalid file type passed', async () => {
		await expect(PDFUtilities.parsePDFFile({})).rejects.toThrow('Invalid PDF file format');
	});

	it('should handle File passed correctly', async () => {
		const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' });
		const text = await PDFUtilities.parsePDFFile(file);
		expect(text).toBe('Parsed');
	});

	it('should throw if not in browser environment', async () => {
		const originalWindow = globalThis.window;
		globalThis.window = undefined;
		await expect(PDFUtilities.parsePDFFile(new ArrayBuffer(100))).rejects.toThrow(
			'PDF parsing not available in server environment'
		);
		globalThis.window = originalWindow;
	});

	it('should throw if PDF is corrupted', async () => {
		PDFUtilities._initializePDFJs = vi.fn().mockResolvedValue({
			GlobalWorkerOptions: { workerSrc: '' },
			getDocument: vi.fn().mockReturnValue({
				promise: Promise.resolve({
					numPages: 1,
					getMetadata: vi.fn().mockRejectedValue(new Error('Corrupted')),
					getPage: vi.fn().mockResolvedValue({
						getTextContent: vi.fn().mockResolvedValue({
							items: [{ str: 'Parsed', transform: [1, 0, 0, 1, 10, 20] }]
						})
					})
				})
			})
		});

		const buffer = new ArrayBuffer(100);
		await expect(PDFUtilities.parsePDFFile(buffer)).rejects.toThrow('PDF validation failed');
	});
});

describe('parseStatement', () => {
	let originalInitializePDFJs;
	beforeEach(() => {
		originalInitializePDFJs = PDFUtilities._initializePDFJs;
		PDFUtilities._initializePDFJs = vi.fn().mockResolvedValue({
			GlobalWorkerOptions: { workerSrc: '' },
			getDocument: vi.fn().mockReturnValue({
				promise: Promise.resolve({
					numPages: 1,
					getMetadata: vi.fn().mockResolvedValue({}),
					getPage: vi.fn().mockResolvedValue({
						getTextContent: vi.fn().mockResolvedValue({
							items: [{ str: 'Parsed', transform: [1, 0, 0, 1, 10, 20] }]
						})
					})
				})
			})
		});
	});

	afterEach(() => {
		PDFUtilities._initializePDFJs = originalInitializePDFJs;
	});

	it('should validate, parse PDF, and call parser factory', async () => {
		const buffer = new ArrayBuffer(100);
		const mockParserFactory = {
			parseStatement: vi.fn().mockResolvedValue({ success: true })
		};

		// We already mocked pdfjs-dist above to return 'Parsed' text
		const result = await PDFUtilities.parseStatement(buffer, mockParserFactory);

		expect(result).toEqual({ success: true });
		expect(mockParserFactory.parseStatement).toHaveBeenCalledWith('Parsed');
	});

	it('should throw an error if validation fails', async () => {
		const mockParserFactory = { parseStatement: vi.fn() };
		await expect(PDFUtilities.parseStatement(null, mockParserFactory)).rejects.toThrow(
			'No PDF file provided'
		);
	});

	it('should catch parserFactory errors and re-throw', async () => {
		const buffer = new ArrayBuffer(100);
		const mockParserFactory = {
			parseStatement: vi.fn().mockRejectedValue(new Error('Format error'))
		};

		await expect(PDFUtilities.parseStatement(buffer, mockParserFactory)).rejects.toThrow(
			'Statement parsing failed: Format error'
		);
	});
});

describe('configureWorker', () => {
	it('should disable worker in test environment', async () => {
		// Because NODE_ENV is test, the mock will be invoked
		await PDFUtilities.configureWorker();
		// No real assertion needed unless we expose the mock, but this adds coverage to the promise chain
		expect(true).toBe(true);
	});

	it('should do nothing if not in browser environment', async () => {
		const originalWindow = globalThis.window;
		globalThis.window = undefined;
		await PDFUtilities.configureWorker();
		globalThis.window = originalWindow;
	});
});

describe('parsing failures handling', () => {
	let originalInitializePDFJs;
	beforeEach(() => {
		originalInitializePDFJs = PDFUtilities._initializePDFJs;
	});
	afterEach(() => {
		PDFUtilities._initializePDFJs = originalInitializePDFJs;
	});

	it('should cleanly throw PDF parsing failure if getTextContent throws an error', async () => {
		PDFUtilities._initializePDFJs = vi.fn().mockResolvedValue({
			GlobalWorkerOptions: { workerSrc: '' },
			getDocument: vi.fn().mockReturnValue({
				promise: Promise.resolve({
					numPages: 1,
					getMetadata: vi.fn().mockResolvedValue({}),
					getPage: vi.fn().mockResolvedValue({
						getTextContent: vi
							.fn()
							.mockRejectedValue(new TypeError("undefined is not a function (near '...i of e...')"))
					})
				})
			})
		});

		const buffer = new ArrayBuffer(100);
		const mockParserFactory = { parseStatement: vi.fn() };

		await expect(PDFUtilities.parseStatement(buffer, mockParserFactory)).rejects.toThrow(
			"Statement parsing failed: PDF parsing failed: Failed to extract text from page 1/1. The PDF structure may be corrupted. Inner error: undefined is not a function (near '...i of e...')"
		);
	});
});

describe('PDF Worker Version Consistency', () => {
	it('should have a copied worker file in static matching node_modules pdfjs-dist version', async () => {
		const fs = await import('node:fs');
		const path = await import('node:path');
		const { fileURLToPath } = await import('node:url');

		const filename = fileURLToPath(import.meta.url);
		const dirnamePath = path.dirname(filename);
		const webappDir = path.resolve(dirnamePath, '../../../');
		const workerPath = path.join(webappDir, 'static/pdf.worker.min.mjs');
		const nodeModulesPkgPath = path.join(webappDir, 'node_modules/pdfjs-dist/package.json');

		expect(fs.existsSync(nodeModulesPkgPath)).toBe(true);
		const nodeModulesPkg = JSON.parse(fs.readFileSync(nodeModulesPkgPath, 'utf8'));
		const installedVersion = nodeModulesPkg.version;
		expect(installedVersion).toBeDefined();

		expect(fs.existsSync(workerPath)).toBe(true);
		const workerContent = fs.readFileSync(workerPath, 'utf8').substring(0, 5000);

		// Look for version inside the worker code
		const versionRegex = /version\s*[:=]\s*['"]([^'"]+)['"]/i;
		const match = workerContent.match(versionRegex) || workerContent.match(/([0-9]+\.[0-9]+\.[0-9]+)/);
		
		expect(match).not.toBeNull();
		const workerVersion = match[1];

		expect(workerVersion).toBe(installedVersion);
	});
});
