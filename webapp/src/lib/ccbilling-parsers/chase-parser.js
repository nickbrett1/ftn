import { BaseParser } from './base-parser.js';

/**
 * Chase Bank credit card statement parser
 * Based on the documented Chase statement structure
 */
export class ChaseParser extends BaseParser {
	constructor() {
		super();
		this.providerName = 'Chase';
	}

	/**
	 * Check if this parser can handle the given statement
	 * @param {string} text - Text content from PDF
	 * @returns {boolean} - True if this is a Chase statement
	 */
	canParse(text) {
		// Look for Chase-specific identifiers
		const chaseIdentifiers = ['CHASE', 'JPMORGAN CHASE', 'ACCOUNT SUMMARY', 'ACCOUNT ACTIVITY'];

		return chaseIdentifiers.some((identifier) => text.toUpperCase().includes(identifier));
	}

	/**
	 * Parse Chase statement and extract required information
	 * @param {string} pdfText - Text content from PDF
	 * @returns {Object} - Parsed statement data
	 */
	async parse(pdfText) {
		const last4 = this.extractLast4Digits(pdfText);
		const statementDate = this.extractStatementDate(pdfText);
		const charges = this.extractCharges(pdfText);

		const result = {
			last4,
			statement_date: statementDate,
			charges
		};

		// Validate the parsed data
		if (!this.validateParsedData(result)) {
			throw new Error('Failed to parse required fields from Chase statement');
		}

		return result;
	}

	/**
	 * Extract the last 4 digits of the credit card
	 * @param {string} text - PDF text content
	 * @returns {string|null} - Last 4 digits or null
	 */
	extractLast4Digits(text) {
		// Look for "Account Number: XXXX XXXX XXXX 1234" pattern
		const patterns = [
			/Account Number:\s*XXXX\s+XXXX\s+XXXX\s+(\d{4})/i,
			/Account Number:\s*(\d{4})/i,
			/XXXX\s+XXXX\s+XXXX\s+(\d{4})/i
		];

		for (const pattern of patterns) {
			const match = this.findText(text, pattern);
			if (match) {
				return match;
			}
		}

		return null;
	}

	/**
	 * Extract the statement closing date
	 * @param {string} text - PDF text content
	 * @returns {string|null} - Statement date in YYYY-MM-DD format
	 */
	extractStatementDate(text) {
		// Look for "Opening/Closing Date MM/DD/YY - MM/DD/YY" pattern
		const patterns = [
			/Opening\/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Statement Date\s+(\d{1,2}\/\d{1,2}\/\d{2})/i
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) {
				// Use the second date (closing date) if two dates are provided
				const dateStr = match[2] || match[1];
				return this.parseChaseDate(dateStr);
			}
		}

		return null;
	}

	/**
	 * Parse Chase date format (MM/DD/YY) to YYYY-MM-DD
	 * @param {string} dateStr - Date string in MM/DD/YY format
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseChaseDate(dateStr) {
		if (!dateStr) return null;

		const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
		if (!match) return null;

		const month = parseInt(match[1], 10);
		const day = parseInt(match[2], 10);
		const year2Digit = parseInt(match[3], 10);

		// Convert 2-digit year to 4-digit year
		const year = year2Digit < 50 ? 2000 + year2Digit : 1900 + year2Digit;

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return null;
		}

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	}

	/**
	 * Extract charges from the statement
	 * @param {string} text - PDF text content
	 * @returns {Array} - Array of charge objects
	 */
	extractCharges(text) {
		const charges = [];
		const lines = text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Look for date pattern at the start of a line (MM/DD)
			const dateMatch = line.match(/^(\d{2}\/\d{2})\s+(.+)/);
			if (!dateMatch) continue;

			const date = this.parseDate(dateMatch[1]);
			const restOfLine = dateMatch[2];

			// Check if this line contains an amount (purchase transaction)
			const amountMatch = restOfLine.match(/(.+?)\s+([-\d,]*\.?\d{1,2})$/);
			if (!amountMatch) continue;

			const merchant = amountMatch[1].trim();
			const amount = this.parseAmount(amountMatch[2]);

			if (!date || !amount || merchant.length < 2) continue;

			// Skip payments to the card
			if (this.isPaymentToCard(merchant)) {
				continue;
			}

			// Check if this might be a foreign currency transaction
			let isForeignTransaction = false;
			let foreignCurrencyAmount = null;
			let foreignCurrencyType = null;

			// Look ahead for currency conversion information
			if (this.isLikelyForeignTransaction(merchant)) {
				isForeignTransaction = true;

				// Look at the next few lines for currency conversion info
				for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
					const nextLine = lines[j];

					// Check for currency type line (e.g., "DANISH KRONE")
					if (nextLine.match(/^[A-Z\s]+$/)) {
						foreignCurrencyType = nextLine.trim();

						// Look for the amount and exchange rate on the next line
						if (j + 1 < lines.length) {
							const rateLine = lines[j + 1];
							const rateMatch = rateLine.match(/(\d+\.\d+)\s+X\s+(\d+\.\d+)/);
							if (rateMatch) {
								foreignCurrencyAmount = parseFloat(rateMatch[1]);
								break;
							}
						}
					}

					// Check for exchange rate pattern in the same line
					const rateMatch = nextLine.match(/(\d+\.\d+)\s+X\s+(\d+\.\d+)/);
					if (rateMatch) {
						foreignCurrencyAmount = parseFloat(rateMatch[1]);
						// Look for currency type in the same line or previous line
						const currencyMatch = nextLine.match(/^([A-Z\s]+)/);
						if (currencyMatch) {
							foreignCurrencyType = currencyMatch[1].trim();
						}
						break;
					}
				}
			}

			const charge = {
				merchant,
				amount,
				date,
				allocated_to: 'Both',
				is_foreign_currency: isForeignTransaction,
				foreign_currency_amount: foreignCurrencyAmount,
				foreign_currency_type: foreignCurrencyType
			};

			charges.push(charge);
		}

		return charges;
	}

	/**
	 * Check if a merchant name suggests a foreign currency transaction
	 * @param {string} merchant - Merchant name
	 * @returns {boolean} - True if likely foreign transaction
	 */
	isLikelyForeignTransaction(merchant) {
		const foreignIndicators = [
			'DSB',
			'DANISH KRONE',
			'EURO',
			'POUND',
			'YEN',
			'FRANC',
			'KRONA',
			'PESO',
			'REAL',
			'YUAN',
			'WON',
			'RUBLE',
			'LIRA',
			'RAND'
		];

		return foreignIndicators.some((indicator) => merchant.toUpperCase().includes(indicator));
	}

	/**
	 * Parse a single transaction line
	 * @param {string} line - Transaction line text
	 * @returns {Object|null} - Parsed charge object or null
	 */
	parseTransactionLine(line) {
		// Chase transaction format: DATE MERCHANT AMOUNT
		// We need to handle multi-line merchants and various formats

		// Look for date pattern at the beginning
		const dateMatch = line.match(/^(\d{1,2}\/\d{1,2})/);
		if (!dateMatch) return null;

		const date = this.parseDate(dateMatch[1]);
		if (!date) return null;

		// Look for amount at the end (negative for credits)
		const amountMatch = line.match(/([-\d,]+\.\d{2})$/);
		if (!amountMatch) return null;

		const amount = this.parseAmount(amountMatch[1]);

		// Extract merchant name (everything between date and amount)
		const merchantStart = dateMatch[0].length;
		const merchantEnd = line.lastIndexOf(amountMatch[1]);

		if (merchantEnd <= merchantStart) return null;

		let merchant = line.substring(merchantStart, merchantEnd).trim();

		// Clean up merchant name
		merchant = merchant.replace(/\s+/g, ' ').trim();

		// Skip if merchant is empty or too short
		if (!merchant || merchant.length < 2) return null;

		return {
			merchant,
			amount,
			date,
			allocated_to: 'Both'
		};
	}

	/**
	 * Check if a merchant name represents a payment to the card
	 * @param {string} merchant - Merchant name
	 * @returns {boolean} - True if it's a payment to the card
	 */
	isPaymentToCard(merchant) {
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

		const merchantLower = merchant.toLowerCase();
		return paymentKeywords.some((keyword) => merchantLower.includes(keyword));
	}
}
