/**
 * Base class for credit card statement parsers
 * Provides common functionality for parsing PDF statements
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
	 * Parse a date string in MM/DD format and convert to YYYY-MM-DD
	 * @param {string} dateStr - Date string in MM/DD format
	 * @param {number} year - Year to use (defaults to current year)
	 * @returns {string|null} - Date in YYYY-MM-DD format or null if invalid
	 */
	parseDate(dateStr, year = new Date().getFullYear()) {
		if (!dateStr) return null;

		const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
		if (!match) return null;

		const month = parseInt(match[1], 10);
		const day = parseInt(match[2], 10);

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return null;
		}

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	}

	/**
	 * Parse an amount string and convert to number
	 * @param {string} amountStr - Amount string (e.g., "123.45", "-123.45")
	 * @returns {number} - Parsed amount as number
	 */
	parseAmount(amountStr) {
		if (!amountStr) return 0;

		// Remove currency symbols and commas
		const cleanAmount = amountStr.replace(/[$,]/g, '');
		const amount = parseFloat(cleanAmount);

		return isNaN(amount) ? 0 : amount;
	}

	/**
	 * Abstract method that subclasses must implement
	 * @param {string} pdfText - Text content from PDF
	 * @returns {Object} - Parsed statement data
	 */
	async parse(pdfText) {
		throw new Error('parse() method must be implemented by subclass');
	}

	/**
	 * Validate that required fields are present
	 * @param {Object} data - Parsed data to validate
	 * @returns {boolean} - True if valid, false otherwise
	 */
	validateParsedData(data) {
		const required = ['last4', 'statement_date', 'charges'];

		for (const field of required) {
			if (!data[field]) {
				console.warn(`Missing required field: ${field}`);
				return false;
			}
		}

		return true;
	}
}
