import { ParsingUtils as ParsingUtilities } from '../parsing-utils.js';

/**
 * Base class for credit card statement parsers
 * Provides common functionality for parsing PDF statements
 * Enhanced with shared parsing utilities
 */
export class BaseParser {
	constructor() {
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
		for (let index = 1; index <= pdfDocument.numPages; index++) {
			const page = await pdfDocument.getPage(index);
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
		for (let index = 0; index < this.pages.length; index++) {
			const text = await this.extractPageText(index);
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
		const match = pattern.exec(text);
		return match ? match[1] : null;
	}

	/**
	 * Parse a date string using shared utilities
	 * @param {string} dateStr - Date string in various formats
	 * @param {Object} options - Parsing options
	 * @returns {string|null} - Date in YYYY-MM-DD format or null if invalid
	 */
	parseDate(dateString, options = {}) {
		return ParsingUtilities.parseDate(dateString, options);
	}

	/**
	 * Parse an amount string using shared utilities
	 * @param {string} amountStr - Amount string (e.g., "123.45", "-123.45", "$1,234.56")
	 * @param {Object} options - Parsing options
	 * @returns {number} - Parsed amount as number
	 */
	parseAmount(amountString, options = {}) {
		return ParsingUtilities.parseAmount(amountString, options);
	}

	/**
	 * Parse JSON response using shared utilities
	 * @param {string} content - Raw JSON content
	 * @param {Object} options - Parsing options
	 * @returns {Object} - Parsed JSON object
	 */
	parseJSONResponse(content, options = {}) {
		return ParsingUtilities.parseJSONResponse(content, options);
	}

	/**
	 * Clean merchant name using shared utilities
	 * @param {string} merchantName - Raw merchant name
	 * @param {Object} options - Cleaning options
	 * @returns {string} - Cleaned merchant name
	 */
	cleanMerchantName(merchantName, options = {}) {
		return ParsingUtilities.cleanMerchantName(merchantName, options);
	}

	/**
	 * Extract numeric value from string using shared utilities
	 * @param {string} str - String containing numeric value
	 * @param {Object} options - Extraction options
	 * @returns {number} - Extracted numeric value
	 */
	extractNumeric(string_, options = {}) {
		return ParsingUtilities.extractNumeric(string_, options);
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
		return ParsingUtilities.validateParsedData(data, requiredFields, options);
	}
	pdfDocument = null;

	/**
	 * Check if a transaction is an Amazon transaction
	 * @param {string} merchant - Merchant name
	 * @returns {boolean} - True if it's an Amazon transaction
	 */
	isAmazonTransaction(merchant) {
		if (!merchant) return false;

		const merchantUpper = merchant.toUpperCase();
		return merchantUpper.includes('AMAZON') || merchantUpper.includes('AMZN');
	}

	/**
	 * Extract full statement text for Amazon transactions
	 * This captures multiple lines to get the order ID information
	 * @param {Array} lines - All lines from the statement
	 * @param {number} currentIndex - Current line index
	 * @returns {string|null} - Full statement text or null
	 */
	extractFullStatementText(lines, currentIndex) {
		if (currentIndex >= lines.length) return null;

		const currentLine = lines[currentIndex];
		let fullText = currentLine;

		// Look ahead for additional lines that might contain order ID information
		// Check the next few lines for order ID patterns
		for (let index = currentIndex + 1; index < Math.min(currentIndex + 5, lines.length); index++) {
			const nextLine = lines[index];

			// Stop if we hit another transaction line (starts with date pattern)
			if (this.getTransactionLineRegex().test(nextLine)) {
				break;
			}

			// Check if this line contains order ID information
			if (this.containsOrderIdInfo(nextLine)) {
				fullText += '\n' + nextLine;
			}
		}

		return fullText;
	}

	/**
	 * Check if a line contains order ID information
	 * @param {string} line - Line to check
	 * @returns {boolean} - True if line contains order ID info
	 */
	containsOrderIdInfo(line) {
		if (!line) return false;

		const lineUpper = line.toUpperCase();

		// Look for order ID patterns
		const orderIdPatterns = [
			/ORDER NUMBER/i,
			/ORDER ID/i,
			/ORDER #/i,
			/\d{3}-\d{7}-\d{7}/, // Standard Amazon order ID format
			/\d{16}/, // Compact order ID format
			/\d{10,}/ // Any long number sequence
		];

		return orderIdPatterns.some((pattern) => {
			if (typeof pattern === 'string') {
				return lineUpper.includes(pattern);
			}
			return pattern.test(line);
		});
	}

	/**
	 * Returns the regex for identifying a transaction line.
	 * Subclasses can override this to provide a more specific regex.
	 * @returns {RegExp}
	 */
	getTransactionLineRegex() {
		return /^\d{2}\/\d{2}\s+/;
	}

	/**
	 * Returns the regex patterns for identifying the statement date.
	 * Subclasses can override this to provide more specific regex.
	 * @returns {RegExp[]}
	 */
	getStatementDatePatterns() {
		return [];
	}

	/**
	 * Extract the statement closing date
	 * @param {string} text - PDF text content
	 * @returns {string|null} - Statement date in YYYY-MM-DD format
	 */
	extractStatementDate(text) {
		const patterns = this.getStatementDatePatterns();
		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) {
				const dateString = match[2] || match[1];
				return this.parseDate(dateString);
			}
		}
		return null;
	}

	/**
	 * Returns the regex patterns for identifying the last 4 digits of the credit card.
	 * Subclasses can override this to provide more specific regex.
	 * @returns {RegExp[]}
	 */
	getLast4DigitsPatterns() {
		return [];
	}

	/**
	 * Extract the last 4 digits of the credit card
	 * @param {string} text - PDF text content
	 * @returns {string|null} - Last 4 digits or null
	 */
	extractLast4Digits(text) {
		const patterns = this.getLast4DigitsPatterns();
		for (const pattern of patterns) {
			const match = this.findText(text, pattern);
			if (match) {
				return match;
			}
		}
		return null;
	}

	/**
	 * Returns the keywords for identifying a payment to the card.
	 * Subclasses can override this to provide more specific keywords.
	 * @returns {string[]}
	 */
	getPaymentKeywords() {
		return [];
	}

	/**
	 * Check if a merchant name represents a payment to the card
	 * @param {string} merchant - Merchant name
	 * @returns {boolean} - True if it's a payment to the card
	 */
	isPaymentToCard(merchant) {
		const paymentKeywords = this.getPaymentKeywords();
		const merchantLower = merchant.toLowerCase();
		return paymentKeywords.some((keyword) => merchantLower.includes(keyword.toLowerCase()));
	}
}
