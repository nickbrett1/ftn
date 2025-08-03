/**
 * Shared parsing utilities for credit card statement parsing
 * Eliminates duplication in parsing logic across different services
 */
export class ParsingUtils {
	/**
	 * Parse JSON response from API with error handling
	 * @param {string} content - Raw JSON content
	 * @param {Object} options - Parsing options
	 * @param {boolean} options.cleanMarkdown - Whether to clean markdown formatting (default: true)
	 * @returns {Object} - Parsed JSON object
	 */
	static parseJSONResponse(content, options = {}) {
		const { cleanMarkdown = true } = options;

		if (!content || typeof content !== 'string') {
			throw new Error('Invalid content provided for JSON parsing');
		}

		// Clean up the content
		let cleanContent = content.trim();

		if (cleanMarkdown) {
			// Remove markdown code blocks
			if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(7, -3).trim();
			} else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(3, -3).trim();
			}
		}

		try {
			// Parse the JSON response
			const parsed = JSON.parse(cleanContent);
			return parsed;
		} catch (error) {
			console.error('❌ JSON parsing failed:', error);
			console.error('Raw content:', content);
			throw new Error(`JSON parsing failed: ${error.message}`);
		}
	}

	/**
	 * Validate parsed data against required fields
	 * @param {Object} data - Parsed data to validate
	 * @param {Array} requiredFields - Array of required field names
	 * @param {Object} options - Validation options
	 * @param {boolean} options.strict - Whether to throw error on missing fields (default: false)
	 * @returns {boolean} - True if valid
	 */
	static validateParsedData(data, requiredFields = [], options = {}) {
		const { strict = false } = options;

		if (!data || typeof data !== 'object') {
			if (strict) {
				throw new Error('Invalid data object provided');
			}
			return false;
		}

		for (const field of requiredFields) {
			if (!data[field]) {
				console.warn(`Missing required field: ${field}`);
				if (strict) {
					throw new Error(`Missing required field: ${field}`);
				}
				return false;
			}
		}

		return true;
	}

	/**
	 * Parse an amount string and convert to number
	 * @param {string} amountStr - Amount string (e.g., "123.45", "-123.45", "$1,234.56")
	 * @param {Object} options - Parsing options
	 * @param {number} options.defaultValue - Default value if parsing fails (default: 0)
	 * @param {boolean} options.allowNegative - Whether to allow negative amounts (default: true)
	 * @returns {number} - Parsed amount as number
	 */
	static parseAmount(amountStr, options = {}) {
		const { defaultValue = 0, allowNegative = true } = options;

		if (!amountStr) return defaultValue;

		// Remove currency symbols, commas, and parentheses
		let cleanAmount = amountStr.replace(/[$,()]/g, '');

		// Handle negative amounts in parentheses
		const isNegative =
			cleanAmount.includes('(') || cleanAmount.includes(')') || cleanAmount.startsWith('-');
		cleanAmount = cleanAmount.replace(/[()]/g, '');

		const amount = parseFloat(cleanAmount);

		if (isNaN(amount)) {
			return defaultValue;
		}

		// Apply negative sign if needed
		const finalAmount = isNegative ? -Math.abs(amount) : amount;

		// Check if negative amounts are allowed
		if (!allowNegative && finalAmount < 0) {
			return defaultValue;
		}

		return finalAmount;
	}

	/**
	 * Parse a date string and convert to YYYY-MM-DD format
	 * @param {string} dateStr - Date string in various formats
	 * @param {Object} options - Parsing options
	 * @param {string} options.format - Expected format (default: 'auto')
	 * @param {number} options.defaultYear - Default year if not provided (default: current year)
	 * @param {boolean} options.strict - Whether to throw error on invalid dates (default: false)
	 * @returns {string|null} - Date in YYYY-MM-DD format or null if invalid
	 */
	static parseDate(dateStr, options = {}) {
		const { format = 'auto', defaultYear = new Date().getFullYear(), strict = false } = options;

		if (!dateStr) return null;

		try {
			let parsedDate;

			switch (format) {
				case 'MM/DD/YYYY':
					parsedDate = this.parseMMDDYYYY(dateStr, defaultYear);
					break;
				case 'MM/DD/YY':
					parsedDate = this.parseMMDDYY(dateStr, defaultYear);
					break;
				case 'auto':
				default:
					parsedDate = this.parseDateAuto(dateStr, defaultYear);
					break;
			}

			if (!parsedDate) {
				if (strict) {
					throw new Error(`Invalid date format: ${dateStr}`);
				}
				return null;
			}

			return parsedDate;
		} catch (error) {
			if (strict) {
				throw error;
			}
			return null;
		}
	}

	/**
	 * Parse date in MM/DD/YYYY format
	 * @param {string} dateStr - Date string
	 * @param {number} defaultYear - Default year
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	static parseMMDDYYYY(dateStr, defaultYear) {
		const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (!match) return null;

		const month = parseInt(match[1], 10);
		const day = parseInt(match[2], 10);
		const year = parseInt(match[3], 10);

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return null;
		}

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	}

	/**
	 * Parse date in MM/DD/YY format
	 * @param {string} dateStr - Date string
	 * @param {number} defaultYear - Default year
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	static parseMMDDYY(dateStr, defaultYear) {
		const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
		if (!match) return null;

		const month = parseInt(match[1], 10);
		const day = parseInt(match[2], 10);
		let year = parseInt(match[3], 10);

		// Convert 2-digit year to 4-digit year
		if (year < 50) {
			year += 2000;
		} else {
			year += 1900;
		}

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return null;
		}

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	}

	/**
	 * Auto-detect and parse date format
	 * @param {string} dateStr - Date string
	 * @param {number} defaultYear - Default year
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	static parseDateAuto(dateStr, defaultYear) {
		// Try different formats
		const formats = [
			() => this.parseMMDDYYYY(dateStr, defaultYear),
			() => this.parseMMDDYY(dateStr, defaultYear),
			() => {
				// Try parsing as ISO date
				const date = new Date(dateStr);
				if (!isNaN(date.getTime())) {
					return date.toISOString().split('T')[0];
				}
				return null;
			}
		];

		for (const format of formats) {
			const result = format();
			if (result) {
				return result;
			}
		}

		return null;
	}

	/**
	 * Clean and validate merchant name
	 * @param {string} merchantName - Raw merchant name
	 * @param {Object} options - Cleaning options
	 * @param {boolean} options.removeCommonSuffixes - Remove common suffixes (default: true)
	 * @param {boolean} options.normalizeCase - Normalize case (default: true)
	 * @returns {string} - Cleaned merchant name
	 */
	static cleanMerchantName(merchantName, options = {}) {
		const { removeCommonSuffixes = true, normalizeCase = true } = options;

		if (!merchantName || typeof merchantName !== 'string') {
			return '';
		}

		let cleaned = merchantName.trim();

		// Remove common suffixes
		if (removeCommonSuffixes) {
			const suffixes = [
				/\s+LLC\s*$/i,
				/\s+INC\s*$/i,
				/\s+CORP\s*$/i,
				/\s+CO\s*$/i,
				/\s+LTD\s*$/i,
				/\s+LP\s*$/i,
				/\s+LLP\s*$/i
			];

			for (const suffix of suffixes) {
				cleaned = cleaned.replace(suffix, '');
			}
		}

		// Normalize case
		if (normalizeCase) {
			cleaned = cleaned.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
		}

		return cleaned.trim();
	}

	/**
	 * Extract numeric value from string
	 * @param {string} str - String containing numeric value
	 * @param {Object} options - Extraction options
	 * @param {number} options.defaultValue - Default value if extraction fails (default: 0)
	 * @returns {number} - Extracted numeric value
	 */
	static extractNumeric(str, options = {}) {
		const { defaultValue = 0 } = options;

		if (!str || typeof str !== 'string') {
			return defaultValue;
		}

		// Match numbers with optional commas and decimals
		const match = str.match(/\d{1,3}(?:,\d{3})*(?:\.\d+)?/);
		if (!match) {
			return defaultValue;
		}

		// Remove commas and parse
		const cleanValue = match[0].replace(/,/g, '');
		const value = parseFloat(cleanValue);
		return isNaN(value) ? defaultValue : value;
	}
}
