const streetSuffixes = [
	'AVE', 'AVENUE', 'ST', 'STREET', 'RD', 'ROAD', 'BLVD', 'BOULEVARD',
	'DR', 'DRIVE', 'LN', 'LANE', 'WAY', 'CT', 'COURT', 'CIR', 'CIRCLE',
	'HWY', 'HIGHWAY', 'PKWY', 'PARKWAY', 'SQ', 'SQUARE', 'BRIDGE',
	'BROADWAY', 'RUE', 'RTE', 'ROUTE', 'PL', 'PLACE', 'TER', 'TERRACE',
	'PIKE', 'TRL', 'TRAIL', 'PKY', 'FREEWAY', 'FWY', 'EXPY', 'EXPRESSWAY'
];

const suffixRegexStr = `(?:${streetSuffixes.join('|')})`;

// Match a street number, up to 3 words, and a street suffix, followed by optional extra text
const addressPattern = new RegExp(
	String.raw`\s+(?:#\s*)?\d{1,5}\s+(?:[A-Za-z0-9\-]+\s+){0,3}${suffixRegexStr}(?:\s+.*)?$`,
	'i'
);

/**
 * Shared parsing utilities for credit card statement parsing
 * Eliminates duplication in parsing logic across different services
 */
export const ParsingUtils = {
	/**
	 * Parse JSON response from API with error handling
	 * @param {string} content - Raw JSON content
	 * @param {Object} options - Parsing options
	 * @param {boolean} options.cleanMarkdown - Whether to clean markdown formatting (default: true)
	 * @returns {Object} - Parsed JSON object
	 */
	parseJSONResponse(content, options = {}) {
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
	},

	/**
	 * Validate parsed data against required fields
	 * @param {Object} data - Parsed data to validate
	 * @param {Array} requiredFields - Array of required field names
	 * @param {Object} options - Validation options
	 * @param {boolean} options.strict - Whether to throw error on missing fields (default: false)
	 * @returns {boolean} - True if valid
	 */
	validateParsedData(data, requiredFields = [], options = {}) {
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
	},

	/**
	 * Parse an amount string and convert to number
	 * @param {string} amountStr - Amount string (e.g., "123.45", "-123.45", "$1,234.56")
	 * @param {Object} options - Parsing options
	 * @param {number} options.defaultValue - Default value if parsing fails (default: 0)
	 * @param {boolean} options.allowNegative - Whether to allow negative amounts (default: true)
	 * @returns {number} - Parsed amount as number
	 */
	parseAmount(amountString, options = {}) {
		const { defaultValue = 0, allowNegative = true } = options;

		if (!amountString) return defaultValue;

		// Remove currency symbols, commas, and parentheses
		let cleanAmount = amountString.replaceAll(/[$,()]/g, '');

		// Handle negative amounts in parentheses
		const isNegative =
			cleanAmount.includes('(') || cleanAmount.includes(')') || cleanAmount.startsWith('-');
		cleanAmount = cleanAmount.replaceAll(/[()]/g, '');

		const amount = Number.parseFloat(cleanAmount);

		if (Number.isNaN(amount)) {
			return defaultValue;
		}

		// Apply negative sign if needed
		const finalAmount = isNegative ? -Math.abs(amount) : amount;

		// Check if negative amounts are allowed
		if (!allowNegative && finalAmount < 0) {
			return defaultValue;
		}

		return finalAmount;
	},

	/**
	 * Parse a date string and convert to YYYY-MM-DD format
	 * @param {string} dateStr - Date string in various formats
	 * @param {Object} options - Parsing options
	 * @param {string} options.format - Expected format (default: 'auto')
	 * @param {number} options.defaultYear - Default year if not provided (default: current year)
	 * @param {boolean} options.strict - Whether to throw error on invalid dates (default: false)
	 * @returns {string|null} - Date in YYYY-MM-DD format or null if invalid
	 */
	parseDate(dateString, options = {}) {
		const { format = 'auto', defaultYear = new Date().getFullYear(), strict = false } = options;

		if (!dateString) return null;

		try {
			let parsedDate;

			switch (format) {
				case 'MM/DD/YYYY': {
					parsedDate = this.parseMMDDYYYY(dateString);
					break;
				}
				case 'MM/DD/YY': {
					parsedDate = this.parseMMDDYY(dateString);
					break;
				}
				case 'auto':
				default: {
					parsedDate = this.parseDateAuto(dateString, defaultYear);
					break;
				}
			}

			if (!parsedDate) {
				if (strict) {
					throw new Error(`Invalid date format: ${dateString}`);
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
	},

	/**
	 * Parse date in MM/DD/YYYY format
	 * @param {string} dateStr - Date string
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseMMDDYYYY(dateString) {
		const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateString);
		if (!match) return null;

		const month = Number.parseInt(match[1], 10);
		const day = Number.parseInt(match[2], 10);
		const year = Number.parseInt(match[3], 10);

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return null;
		}

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	},

	/**
	 * Parse date in MM/DD/YY format
	 * @param {string} dateStr - Date string
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseMMDDYY(dateString) {
		const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(dateString);
		if (!match) return null;

		const month = Number.parseInt(match[1], 10);
		const day = Number.parseInt(match[2], 10);
		let year = Number.parseInt(match[3], 10);

		// Convert 2-digit year to 4-digit year
		year += year < 50 ? 2000 : 1900;

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return null;
		}

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	},

	/**
	 * Parse date in "Month DD, YYYY" format (e.g., "Feb 7, 2026")
	 * @param {string} dateStr - Date string
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseMonthDDYYYY(dateString) {
		const months = {
			JAN: 1,
			JANUARY: 1,
			FEB: 2,
			FEBRUARY: 2,
			MAR: 3,
			MARCH: 3,
			APR: 4,
			APRIL: 4,
			MAY: 5,
			JUN: 6,
			JUNE: 6,
			JUL: 7,
			JULY: 7,
			AUG: 8,
			AUGUST: 8,
			SEP: 9,
			SEPTEMBER: 9,
			OCT: 10,
			OCTOBER: 10,
			NOV: 11,
			NOVEMBER: 11,
			DEC: 12,
			DECEMBER: 12
		};

		const match = /^([A-Z]{3,9})\s+(\d{1,2}),\s+(\d{4})$/i.exec(dateString.trim());
		if (!match) return null;

		const monthStr = match[1].toUpperCase();
		const day = Number.parseInt(match[2], 10);
		const year = Number.parseInt(match[3], 10);

		const month = months[monthStr];
		if (!month || day < 1 || day > 31) return null;

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	},

	/**
	 * Auto-detect and parse date format
	 * @param {string} dateStr - Date string
	 * @param {number} defaultYear - Default year
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseDateAuto(dateString, defaultYear) {
		if (!dateString) return null;

		// Try different formats
		const formats = [
			() => this.parseMMDDYYYY(dateString),
			() => this.parseMMDDYY(dateString),
			() => this.parseMonthDDYYYY(dateString),
			() => {
				// Try parsing MM/DD format (common in credit card statements)
				const mmddMatch = /^(\d{1,2})\/(\d{1,2})$/.exec(dateString);
				if (mmddMatch) {
					const month = Number.parseInt(mmddMatch[1], 10);
					const day = Number.parseInt(mmddMatch[2], 10);

					if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
						return `${defaultYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
					}
				}
				return null;
			},
			() => {
				// Try parsing as ISO date (only if it's already YYYY-MM-DD)
				const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
				if (isoMatch) return dateString;
				return null;
			},
			() => {
				// Last resort: try native Date parsing but only for valid dates
				// Avoid timezone shifts by using UTC-like extraction
				const date = new Date(dateString);
				if (!Number.isNaN(date.getTime())) {
					// Use local components to avoid shift
					const y = date.getFullYear();
					const m = date.getMonth() + 1;
					const d = date.getDate();
					return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
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
	},

	/**
	 * Clean and validate merchant name
	 * @param {string} merchantName - Raw merchant name
	 * @param {Object} options - Cleaning options
	 * @param {boolean} options.removeCommonSuffixes - Remove common suffixes (default: true)
	 * @param {boolean} options.normalizeCase - Normalize case (default: true)
	 * @param {boolean} options.removeAddress - Remove trailing street address (default: true)
	 * @returns {string} - Cleaned merchant name
	 */
	cleanMerchantName(merchantName, options = {}) {
		const { removeCommonSuffixes = true, normalizeCase = true, removeAddress = true } = options;

		if (!merchantName || typeof merchantName !== 'string') {
			return '';
		}

		let cleaned = merchantName.trim();

		if (removeAddress) {
			cleaned = cleaned.replace(addressPattern, '').trim();
		}

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
			cleaned = cleaned.toLowerCase().replaceAll(/\b\w/g, (l) => l.toUpperCase());
		}

		return cleaned.trim();
	},

	/**
	 * Extract numeric value from string
	 * @param {string} str - String containing numeric value
	 * @param {Object} options - Extraction options
	 * @param {number} options.defaultValue - Default value if extraction fails (default: 0)
	 * @returns {number} - Extracted numeric value
	 */
	extractNumeric(string_, options = {}) {
		const { defaultValue = 0 } = options;

		if (!string_ || typeof string_ !== 'string') {
			return defaultValue;
		}

		// Match numbers with optional commas and decimals
		const match = /\d{1,3}(?:,\d{3})*(?:\.\d+)?/.exec(string_);
		if (!match) {
			return defaultValue;
		}

		// Remove commas and parse
		const cleanValue = match[0].replaceAll(',', '');
		const value = Number.parseFloat(cleanValue);
		return Number.isNaN(value) ? defaultValue : value;
	}
};
