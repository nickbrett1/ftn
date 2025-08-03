import { PDFUtils } from '../utils/pdf-utils.js';
import { ParserFactory } from '../ccbilling-parsers/parser-factory.js';

/**
 * Service for parsing credit card statements using PDF.js (Server-side)
 * Refactored to use shared PDF utilities
 */
export class PDFService {
	constructor() {
		this.parserFactory = new ParserFactory();
		// Configure PDF.js worker for server environment
		PDFUtils.configureWorker('server');
	}

	/**
	 * Parse a PDF file and extract statement information
	 * @param {File} pdfFile - PDF file from input
	 * @returns {Promise<Object>} - Parsed statement data
	 */
	async parseStatement(pdfFile) {
		try {
			// Validate PDF file
			PDFUtils.validatePDFFile(pdfFile);

			// Use shared PDF parsing logic with simpler text extraction for server
			const parsedData = await PDFUtils.parseStatement(pdfFile, this.parserFactory, {
				groupByLine: false,
				sortByPosition: false
			});

			return parsedData;
		} catch (error) {
			console.error('❌ PDF parsing failed:', error);
			throw new Error(`PDF parsing failed: ${error.message}`);
		}
	}

	/**
	 * Get list of supported credit card providers
	 * @returns {Array} - Array of supported provider names
	 */
	getSupportedProviders() {
		return this.parserFactory.getSupportedProviders();
	}
}
