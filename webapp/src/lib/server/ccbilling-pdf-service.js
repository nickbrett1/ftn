import * as pdfjsLib from 'pdfjs-dist';
import { ParserFactory } from './ccbilling-parsers/parser-factory.js';

// Set up PDF.js worker for browser environment
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

/**
 * Service for parsing credit card statements using PDF.js (Client-side)
 */
export class PDFService {
	constructor() {
		this.parserFactory = new ParserFactory();
	}

	/**
	 * Parse a PDF file and extract statement information
	 * @param {File} pdfFile - PDF file from input
	 * @returns {Promise<Object>} - Parsed statement data
	 */
	async parseStatement(pdfFile) {
		try {
			console.log('📄 Loading PDF with PDF.js...');

			// Convert file to ArrayBuffer
			const arrayBuffer = await pdfFile.arrayBuffer();

			// Load the PDF document
			const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
			const pdfDocument = await loadingTask.promise;

			console.log(`📄 PDF loaded: ${pdfDocument.numPages} pages`);

			// Extract text from all pages
			const allText = await this.extractTextFromPDF(pdfDocument);
			console.log('📄 Text extracted from PDF');

			// Parse the statement using appropriate parser
			const parsedData = await this.parserFactory.parseStatement(allText);

			console.log('✅ Statement parsed successfully');
			return parsedData;
		} catch (error) {
			console.error('❌ PDF parsing failed:', error);
			throw new Error(`PDF parsing failed: ${error.message}`);
		}
	}

	/**
	 * Extract text content from all pages of a PDF
	 * @param {Object} pdfDocument - PDF.js document object
	 * @returns {Promise<string>} - Combined text from all pages
	 */
	async extractTextFromPDF(pdfDocument) {
		const textParts = [];

		for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
			const page = await pdfDocument.getPage(pageNum);
			const textContent = await page.getTextContent();

			// Extract text items and join them
			const pageText = textContent.items.map((item) => item.str).join(' ');

			textParts.push(pageText);
		}

		return textParts.join('\n');
	}

	/**
	 * Get list of supported credit card providers
	 * @returns {Array} - Array of supported provider names
	 */
	getSupportedProviders() {
		return this.parserFactory.getSupportedProviders();
	}
}
