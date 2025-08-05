import { PDFUtils } from './pdf-utils.js';
import { ParserFactory } from '../ccbilling-parsers/parser-factory.js';

/**
 * Service for parsing credit card statements using PDF.js (Client-side)
 * Refactored to use shared PDF utilities
 */
export class PDFService {
	constructor() {
		this.parserFactory = new ParserFactory();
		// Configure PDF.js worker for browser environment
		PDFUtils.configureWorker();
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

			// Use shared PDF parsing logic
			const parsedData = await PDFUtils.parseStatement(pdfFile, this.parserFactory, {
				groupByLine: true,
				sortByPosition: true
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
