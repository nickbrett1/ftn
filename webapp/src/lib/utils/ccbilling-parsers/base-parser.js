import { ParsingUtils } from '../parsing-utils.js';

/**
 * Base class for credit card statement parsers
 * Provides common functionality for parsing PDF statements
 * Enhanced with shared parsing utilities
 */
export class BaseParser {
	constructor() {
		this.pdfDocument = null;
		this.pages = [];
	}

	/**
	 * Initialize the parser with a PDF document
	 * @param {Object} pdfDocument - PDF.js document object
	 */
	async initialize(pdfDocument) {
		this.pdfDocument = pdfDocument;
		this.pages = [];

		// Load all pages
		for (let i = 1; i <= pdfDocument.numPages; i++) {
			const page = await pdfDocument.getPage(i);
			this.pages.push(page);
		}
	}

	/**
	 * Extract text content from a specific page
	 * @param {number} pageIndex - 0-based page index
	 * @returns {Promise<string>} - Text content of the page
	 */
	async extractPageText(pageIndex) {
		if (!this.pages[pageIndex]) {
			throw new Error(`Page ${pageIndex} not found`);
		}

		const page = this.pages[pageIndex];
		const textContent = await page.getTextContent();

		return textContent.items.map((item) => item.str).join(' ');
	}

	/**
	 * Extract text content from all pages
	 * @returns {Promise<string[]>} - Array of text content for each page
	 */
	async extractAllPagesText() {
		const texts = [];
		for (let i = 0; i < this.pages.length; i++) {
			const text = await this.extractPageText(i);
			texts.push(text);
		}
		return texts;
	}

	/**
	 * Find text that matches a regex pattern
	 * @param {string} text - Text to search in
	 * @param {RegExp} pattern - Regex pattern to match
	 * @returns {string|null} - Matched text or null
	 */
	findText(text, pattern) {
		const match = text.match(pattern);
		return match ? match[1] : null;
	}

	/**
	 * Parse a date string using shared utilities
	 * @param {string} dateStr - Date string in various formats
	 * @param {Object} options - Parsing options
	 * @returns {string|null} - Date in YYYY-MM-DD format or null if invalid
	 */
	parseDate(dateStr, options = {}) {
		return ParsingUtils.parseDate(dateStr, options);
	}

	/**
	 * Parse an amount string using shared utilities
	 * @param {string} amountStr - Amount string (e.g., "123.45", "-123.45", "$1,234.56")
	 * @param {Object} options - Parsing options
	 * @returns {number} - Parsed amount as number
	 */
	parseAmount(amountStr, options = {}) {
		return ParsingUtils.parseAmount(amountStr, options);
	}

	/**
	 * Parse JSON response using shared utilities
	 * @param {string} content - Raw JSON content
	 * @param {Object} options - Parsing options
	 * @returns {Object} - Parsed JSON object
	 */
	parseJSONResponse(content, options = {}) {
		return ParsingUtils.parseJSONResponse(content, options);
	}

	/**
	 * Clean merchant name using shared utilities
	 * @param {string} merchantName - Raw merchant name
	 * @param {Object} options - Cleaning options
	 * @returns {string} - Cleaned merchant name
	 */
	cleanMerchantName(merchantName, options = {}) {
		return ParsingUtils.cleanMerchantName(merchantName, options);
	}

	/**
	 * Extract numeric value from string using shared utilities
	 * @param {string} str - String containing numeric value
	 * @param {Object} options - Extraction options
	 * @returns {number} - Extracted numeric value
	 */
	extractNumeric(str, options = {}) {
		return ParsingUtils.extractNumeric(str, options);
	}

	/**
	 * Abstract method that subclasses must implement
	 * @param {string} pdfText - Text content from PDF
	 * @returns {Object} - Parsed statement data
	 */
	async parse(/* pdfText */) {
		throw new Error('parse() method must be implemented by subclass');
	}

	/**
	 * Validate that required fields are present using shared utilities
	 * @param {Object} data - Parsed data to validate
	 * @param {Array} requiredFields - Array of required field names (default: ['last4', 'statement_date', 'charges'])
	 * @param {Object} options - Validation options
	 * @returns {boolean} - True if valid, false otherwise
	 */
	validateParsedData(data, requiredFields = ['last4', 'statement_date', 'charges'], options = {}) {
		return ParsingUtils.validateParsedData(data, requiredFields, options);
	}
}
