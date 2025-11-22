import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PDFService } from '../../../src/lib/client/ccbilling-pdf-service.js';

// Mock the PDFUtils module
vi.mock('../../../src/lib/client/pdf-utils.js', () => ({
	PDFUtils: {
		configureWorker: vi.fn(),
		validatePDFFile: vi.fn(),
		parseStatement: vi.fn()
	}
}));

// Mock the ParserFactory module
const mockGetSupportedProviders = vi.fn().mockReturnValue(['Chase', 'Amex', 'Discover']);
vi.mock('../../../src/lib/utils/ccbilling-parsers/parser-factory.js', () => ({
	ParserFactory: vi.fn().mockImplementation(function () {
		this.getSupportedProviders = mockGetSupportedProviders;
	})
}));

describe('PDFService', () => {
	let pdfService;
	let mockPDFUtilities;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Get the mocked modules
		const pdfUtilitiesModule = await import('../../../src/lib/client/pdf-utils.js');
		await import('../../../src/lib/utils/ccbilling-parsers/parser-factory.js');

		mockPDFUtilities = pdfUtilitiesModule.PDFUtils;

		// Reset mock implementations to default behavior
		mockPDFUtilities.validatePDFFile.mockImplementation(() => {});
		mockPDFUtilities.parseStatement.mockResolvedValue({ success: true });

		pdfService = new PDFService();
		await pdfService.init();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should initialize with ParserFactory and configure PDF worker', () => {
			expect(mockPDFUtilities.configureWorker).toHaveBeenCalledWith();
			expect(pdfService.parserFactory).toBeDefined();
		});
	});

	describe('parseStatement', () => {
		let mockPdfFile;

		beforeEach(() => {
			// Create a mock PDF file
			mockPdfFile = new File(['mock pdf content'], 'statement.pdf', {
				type: 'application/pdf'
			});

			// Mock successful parsing
			mockPDFUtilities.parseStatement.mockResolvedValue({
				provider: 'Chase',
				charges: [
					{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15' },
					{ merchant: 'Shell', amount: 32.5, date: '2024-01-16' }
				],
				summary: {
					totalCharges: 78.17,
					statementDate: '2024-01-31'
				}
			});
		});

		it('should successfully parse a valid PDF file', async () => {
			const result = await pdfService.parseStatement(mockPdfFile);

			expect(mockPDFUtilities.validatePDFFile).toHaveBeenCalledWith(mockPdfFile);
			expect(mockPDFUtilities.parseStatement).toHaveBeenCalledWith(
				mockPdfFile,
				pdfService.parserFactory
			);

			expect(result).toEqual({
				provider: 'Chase',
				charges: [
					{ merchant: 'Walmart', amount: 45.67, date: '2024-01-15' },
					{ merchant: 'Shell', amount: 32.5, date: '2024-01-16' }
				],
				summary: {
					totalCharges: 78.17,
					statementDate: '2024-01-31'
				}
			});
		});

		it('should throw error when PDF validation fails', async () => {
			const validationError = new Error('Invalid PDF file format');
			mockPDFUtilities.validatePDFFile.mockImplementation(() => {
				throw validationError;
			});

			await expect(pdfService.parseStatement(mockPdfFile)).rejects.toThrow(
				'PDF parsing failed: Invalid PDF file format'
			);

			expect(mockPDFUtilities.validatePDFFile).toHaveBeenCalledWith(mockPdfFile);
			expect(mockPDFUtilities.parseStatement).not.toHaveBeenCalled();
		});

		it('should throw error when PDF parsing fails', async () => {
			const parsingError = new Error('Failed to extract text from PDF');
			mockPDFUtilities.parseStatement.mockRejectedValue(parsingError);

			await expect(pdfService.parseStatement(mockPdfFile)).rejects.toThrow(
				'PDF parsing failed: Failed to extract text from PDF'
			);

			expect(mockPDFUtilities.validatePDFFile).toHaveBeenCalledWith(mockPdfFile);
			expect(mockPDFUtilities.parseStatement).toHaveBeenCalled();
		});

		it('should handle null or undefined PDF file', async () => {
			mockPDFUtilities.validatePDFFile.mockImplementation(() => {
				throw new Error('No PDF file provided');
			});

			await expect(pdfService.parseStatement(null)).rejects.toThrow(
				'PDF parsing failed: No PDF file provided'
			);
			await expect(pdfService.parseStatement()).rejects.toThrow(
				'PDF parsing failed: No PDF file provided'
			);
		});

		it('should handle non-File objects', async () => {
			const invalidFile = { name: 'test.pdf', type: 'application/pdf' };

			mockPDFUtilities.validatePDFFile.mockImplementation(() => {
				throw new Error('Invalid PDF file format');
			});

			await expect(pdfService.parseStatement(invalidFile)).rejects.toThrow(
				'PDF parsing failed: Invalid PDF file format'
			);
		});
	});

	describe('getSupportedProviders', () => {
		it('should return list of supported providers from parser factory', () => {
			const providers = pdfService.getSupportedProviders();

			expect(pdfService.parserFactory.getSupportedProviders).toHaveBeenCalled();
			expect(providers).toEqual(['Chase', 'Amex', 'Discover']);
		});

		it('should return empty array when no providers are supported', () => {
			// Change the mock return value for this test
			mockGetSupportedProviders.mockReturnValue([]);

			const newPdfService = new PDFService();
			const providers = newPdfService.getSupportedProviders();

			expect(providers).toEqual([]);
		});
	});

	describe('error handling', () => {
		it('should log error and rethrow with descriptive message', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const mockPdfFile = new File(['mock content'], 'test.pdf', {
				type: 'application/pdf'
			});

			const originalError = new Error('Original error message');
			mockPDFUtilities.parseStatement.mockRejectedValue(originalError);

			await expect(pdfService.parseStatement(mockPdfFile)).rejects.toThrow(
				'PDF parsing failed: Original error message'
			);

			expect(consoleSpy).toHaveBeenCalledWith('❌ PDF parsing failed:', originalError);
			consoleSpy.mockRestore();
		});

		it('should handle errors without message property', async () => {
			const mockPdfFile = new File(['mock content'], 'test.pdf', {
				type: 'application/pdf'
			});

			mockPDFUtilities.parseStatement.mockRejectedValue({ code: 'UNEXPECTED_ERROR' });

			await expect(pdfService.parseStatement(mockPdfFile)).rejects.toThrow(
				'PDF parsing failed: undefined'
			);
		});
	});

	describe('integration scenarios', () => {
		it('should handle successful end-to-end parsing workflow', async () => {
			const mockPdfFile = new File(['mock pdf content'], 'chase-statement.pdf', {
				type: 'application/pdf'
			});

			const expectedResult = {
				provider: 'Chase',
				charges: [
					{ merchant: 'Amazon', amount: 29.99, date: '2024-01-10' },
					{ merchant: 'Starbucks', amount: 4.5, date: '2024-01-12' }
				],
				summary: {
					totalCharges: 34.49,
					statementDate: '2024-01-31'
				}
			};

			mockPDFUtilities.parseStatement.mockResolvedValue(expectedResult);

			const result = await pdfService.parseStatement(mockPdfFile);

			expect(result).toEqual(expectedResult);
			expect(mockPDFUtilities.validatePDFFile).toHaveBeenCalledWith(mockPdfFile);
			expect(mockPDFUtilities.parseStatement).toHaveBeenCalledWith(
				mockPdfFile,
				pdfService.parserFactory
			);
		});

		it('should handle multiple consecutive parsing requests', async () => {
			const mockPdfFile1 = new File(['content1'], 'statement1.pdf', {
				type: 'application/pdf'
			});
			const mockPdfFile2 = new File(['content2'], 'statement2.pdf', {
				type: 'application/pdf'
			});

			mockPDFUtilities.parseStatement
				.mockResolvedValueOnce({ provider: 'Chase', charges: [] })
				.mockResolvedValueOnce({ provider: 'Amex', charges: [] });

			const result1 = await pdfService.parseStatement(mockPdfFile1);
			const result2 = await pdfService.parseStatement(mockPdfFile2);

			expect(result1).toEqual({ provider: 'Chase', charges: [] });
			expect(result2).toEqual({ provider: 'Amex', charges: [] });
			expect(mockPDFUtilities.parseStatement).toHaveBeenCalledTimes(2);
		});
	});
});