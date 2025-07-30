/**
 * Base parser class for credit card statement parsing
 * Extend this class to create provider-specific parsers
 */
export class BaseStatementParser {
	constructor() {
		this.providerName = 'Unknown';
		this.supportedFormats = [];
	}

	/**
	 * Detect if this parser can handle the given statement text
	 * @param {string} text - The extracted text from the PDF
	 * @returns {boolean} - True if this parser can handle the statement
	 */
	canParse(text) {
		throw new Error('canParse method must be implemented by subclass');
	}

	/**
	 * Parse the statement text and extract charges
	 * @param {string} text - The extracted text from the PDF
	 * @returns {Array} - Array of charge objects with merchant, amount, date
	 */
	parse(text) {
		throw new Error('parse method must be implemented by subclass');
	}

	/**
	 * Extract the billing cycle dates from the statement
	 * @param {string} text - The extracted text from the PDF
	 * @returns {Object} - Object with startDate and endDate (ISO strings)
	 */
	extractBillingCycle(text) {
		throw new Error('extractBillingCycle method must be implemented by subclass');
	}

	/**
	 * Extract the credit card information from the statement
	 * @param {string} text - The extracted text from the PDF
	 * @returns {Object} - Object with cardName, last4, etc.
	 */
	extractCardInfo(text) {
		throw new Error('extractCardInfo method must be implemented by subclass');
	}

	/**
	 * Clean and validate a charge object
	 * @param {Object} charge - Raw charge object
	 * @returns {Object|null} - Cleaned charge object or null if invalid
	 */
	validateCharge(charge) {
		if (!charge || typeof charge !== 'object') {
			return null;
		}

		const { merchant, amount, date } = charge;

		// Validate merchant
		if (!merchant || typeof merchant !== 'string' || merchant.trim().length === 0) {
			return null;
		}

		// Validate amount
		const numAmount = parseFloat(amount);
		if (isNaN(numAmount) || numAmount === 0) {
			return null;
		}

		// Validate date (optional)
		let parsedDate = null;
		if (date) {
			parsedDate = this.parseDate(date);
		}

		return {
			merchant: merchant.trim(),
			amount: numAmount,
			date: parsedDate,
			allocated_to: 'Both' // Default allocation
		};
	}

	/**
	 * Parse a date string into ISO format
	 * @param {string} dateStr - Date string in various formats
	 * @returns {string|null} - ISO date string or null if invalid
	 */
	parseDate(dateStr) {
		if (!dateStr || typeof dateStr !== 'string') {
			return null;
		}

		// Try different date formats
		const patterns = [
			// MM/DD/YYYY
			{ regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: 'MM/DD/YYYY' },
			// MM-DD-YYYY
			{ regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, format: 'MM-DD-YYYY' },
			// YYYY-MM-DD
			{ regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, format: 'YYYY-MM-DD' },
			// MM/DD/YY
			{ regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, format: 'MM/DD/YY' },
			// MM-DD-YY
			{ regex: /^(\d{1,2})-(\d{1,2})-(\d{2})$/, format: 'MM-DD-YY' }
		];

		for (const pattern of patterns) {
			const match = dateStr.match(pattern.regex);
			if (match) {
				let month, day, year;

				if (pattern.format === 'YYYY-MM-DD') {
					// YYYY-MM-DD format
					year = match[1];
					month = match[2];
					day = match[3];
				} else if (pattern.format.includes('YYYY')) {
					// Full year format (MM/DD/YYYY or MM-DD-YYYY)
					month = match[1];
					day = match[2];
					year = match[3];
				} else {
					// Two-digit year format
					month = match[1];
					day = match[2];
					const year2Digit = match[3];
					year = parseInt(year2Digit) < 50 ? `20${year2Digit}` : `19${year2Digit}`;
				}

				// Simple validation and formatting
				const monthNum = parseInt(month);
				const dayNum = parseInt(day);
				const yearNum = parseInt(year);

				if (
					monthNum >= 1 &&
					monthNum <= 12 &&
					dayNum >= 1 &&
					dayNum <= 31 &&
					yearNum >= 1900 &&
					yearNum <= 2100
				) {
					// Return YYYY-MM-DD format
					const yearStr = yearNum.toString();
					const monthStr = monthNum.toString().padStart(2, '0');
					const dayStr = dayNum.toString().padStart(2, '0');
					return `${yearStr}-${monthStr}-${dayStr}`;
				}
			}
		}

		return null;
	}

	/**
	 * Filter out payment credits and invalid charges
	 * @param {Array} charges - Array of charge objects
	 * @returns {Array} - Filtered array of valid charges
	 */
	filterCharges(charges) {
		const paymentKeywords = [
			'payment thank you',
			'payment thank you-mobile',
			'online payment',
			'payment received',
			'payment',
			'credit card payment',
			'payment - thank you',
			'payment - thank you-mobile'
		];

		return charges.filter((charge) => {
			if (!charge || charge.amount === 0) {
				return false;
			}

			// Exclude payment credits (paying off previous balances)
			const merchant = charge.merchant?.toLowerCase() || '';
			if (paymentKeywords.some((keyword) => merchant.includes(keyword))) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Extract text from specific sections of the statement
	 * @param {string} text - Full statement text
	 * @param {Array} patterns - Array of regex patterns to match sections
	 * @returns {string} - Extracted section text
	 */
	extractSection(text, patterns) {
		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) {
				return match[1] || match[0];
			}
		}
		return '';
	}

	/**
	 * Split text into lines and clean them
	 * @param {string} text - Text to split
	 * @returns {Array} - Array of cleaned lines
	 */
	splitIntoLines(text) {
		return text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}

	/**
	 * Extract amount from a string, handling currency symbols and formatting
	 * @param {string} amountStr - String containing amount
	 * @returns {number|null} - Parsed amount or null if invalid
	 */
	extractAmount(amountStr) {
		if (!amountStr || typeof amountStr !== 'string') {
			return null;
		}

		// Remove currency symbols and commas, handle negative amounts
		const cleaned = amountStr
			.replace(/[$,\s]/g, '') // Remove $, commas, and spaces
			.replace(/\(([^)]+)\)/g, '-$1'); // Convert parentheses to negative

		const amount = parseFloat(cleaned);
		return isNaN(amount) ? null : amount;
	}
}
