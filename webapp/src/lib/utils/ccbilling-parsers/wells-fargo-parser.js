import { BaseParser } from './base-parser.js';

/**
 * Wells Fargo (Bilt) credit card statement parser
 * Based on the documented Wells Fargo statement structure
 */
export class WellsFargoParser extends BaseParser {
	constructor() {
		super();
		this.providerName = 'Wells Fargo';
	}

	/**
	 * Check if this parser can handle the given statement
	 * @param {string} text - Text content from PDF
	 * @returns {boolean} - True if this is a Wells Fargo statement
	 */
	canParse(text) {
		// Handle null or undefined text
		if (!text) return false;

		const textUpper = text.toUpperCase();

		// Look for Wells Fargo-specific identifiers
		const wellsFargoIdentifiers = [
			'WELLS FARGO',
			'WELLSFARGO',
			'BILT',
			'BILTPROTECT',
			'BILTREWARDS'
		];

		// Check for Wells Fargo identifiers
		const hasWellsFargoIdentifier = wellsFargoIdentifiers.some((identifier) =>
			textUpper.includes(identifier)
		);

		// Check for Wells Fargo specific patterns
		const hasWellsFargoPattern =
			textUpper.includes('ACCOUNT NUMBER ENDING IN') ||
			(textUpper.includes('BILLING CYCLE') && textUpper.includes('TO'));

		return hasWellsFargoIdentifier || hasWellsFargoPattern;
	}

	/**
	 * Parse Wells Fargo statement and extract required information
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
			throw new Error('Failed to parse required fields from Wells Fargo statement');
		}

		return result;
	}

	/**
	 * Extract the last 4 digits of the credit card
	 * @param {string} text - PDF text content
	 * @returns {string|null} - Last 4 digits or null
	 */
	extractLast4Digits(text) {
		// Look for "Account Number Ending in XXXX" pattern
		const patterns = [
			/Account Number Ending in\s*(\d{4})/i,
			/Account Number.*?(\d{4})/i,
			/Ending in\s*(\d{4})/i
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
		// Look for "Billing Cycle MM/DD/YYYY to MM/DD/YYYY" pattern
		const patterns = [
			/Billing Cycle\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Statement Period\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Statement Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
		];

		for (const pattern of patterns) {
			const match = pattern.exec(text);
			if (match) {
				// Use the second date (closing date) if two dates are provided
				const dateString = match[2] || match[1];
				return this.parseWellsFargoDate(dateString);
			}
		}

		return null;
	}

	/**
	 * Parse Wells Fargo date format (MM/DD/YYYY) to YYYY-MM-DD
	 * @param {string} dateStr - Date string in MM/DD/YYYY format
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseWellsFargoDate(dateString) {
		if (!dateString) return null;

		const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateString);
		if (!match) return null;

		const month = Number.parseInt(match[1], 10);
		const day = Number.parseInt(match[2], 10);
		const year = Number.parseInt(match[3], 10);

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
		const statementDate = this.extractStatementDate(text);
		const statementYear = statementDate
			? new Date(statementDate).getFullYear()
			: new Date().getFullYear();
		const transactionSection = this._getTransactionSection(text);
		if (!transactionSection) return [];

		const lines = transactionSection
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		return this._parseTransactionLines(lines, statementYear);
	}

	_getTransactionSection(text) {
		const upperText = text.toUpperCase();
		const startIndex = upperText.indexOf('TRANSACTION SUMMARY');
		if (startIndex === -1) return null;

		const endCandidates = [
			upperText.indexOf('FEES CHARGED', startIndex + 1),
			upperText.indexOf('INTEREST CHARGED', startIndex + 1),
			upperText.indexOf('BILTPROTECT SUMMARY', startIndex + 1)
		].filter((index) => index !== -1);

		const endIndex = endCandidates.length > 0 ? Math.min(...endCandidates) : text.length;
		return text.slice(startIndex, endIndex);
	}

	_parseTransactionLines(lines, statementYear) {
		const charges = [];
		const pattern =
			/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+\d+\s+\w+\s+(.+?)\s+\$(-?\d+(?:,\d{3})*\.?\d{0,2})-?$/;
		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];
			const transactionMatch = pattern.exec(line);

			if (transactionMatch) {
				const charge = this._processTransaction(transactionMatch, lines, index, statementYear);
				if (charge) {
					charges.push(charge);
				}
			}
		}
		return charges;
	}

	_processTransaction(transactionMatch, lines, index, statementYear) {
		const transDate = transactionMatch[1];
		const description = transactionMatch[3].trim();
		const amountString = transactionMatch[4];

		if (this.isPaymentToCard(description)) return null;

		const amount = this.parseAmount(amountString);
		const date = this.parseWellsFargoFullDate(transDate, statementYear);

		if (!date || !amount || description.length < 2) return null;

		const foreignDetails = this._extractForeignCurrencyDetails(lines, index);
		const fullStatementText = this.isAmazonTransaction(description)
			? this.extractFullStatementText(lines, index)
			: null;

		return {
			merchant: description,
			amount: Math.abs(amount),
			date,
			allocated_to: null,
			is_foreign_currency: foreignDetails.isForeignTransaction,
			foreign_currency_amount: foreignDetails.foreignCurrencyAmount,
			foreign_currency_type: foreignDetails.foreignCurrencyType,
			full_statement_text: fullStatementText
		};
	}

	_extractForeignCurrencyDetails(lines, currentIndex) {
		const details = {
			isForeignTransaction: false,
			foreignCurrencyAmount: null,
			foreignCurrencyType: null
		};

		for (let index = currentIndex + 1; index < Math.min(currentIndex + 4, lines.length); index++) {
			const nextLine = lines[index];
			if (/^\d{1,2}\/\d{1,2}\s+\d{1,2}\/\d{1,2}/.test(nextLine)) break;

			if (this.isCurrencyLine(nextLine)) {
				this._processCurrencyLine(nextLine, lines, index, details);
				break;
			}
		}
		return details;
	}

	_processCurrencyLine(line, lines, currentIndex, details) {
		const currencyMatch = /(?:- \d{1,2}\/\d{1,2} )?(.*)/.exec(line);
		details.foreignCurrencyType = currencyMatch ? currencyMatch[1].trim() : line.trim();
		details.isForeignTransaction = true;

		if (currentIndex + 1 < lines.length) {
			const rateLine = lines[currentIndex + 1];
			const rateMatch = this.parseExchangeRate(rateLine);
			if (rateMatch) {
				details.foreignCurrencyAmount = rateMatch.foreignAmount;
			}
		}
	}

	/**
	 * Parse Wells Fargo transaction line
	 * @param {string} line - Rest of the transaction line after date
	 * @returns {Object|null} - Object with description and amount, or null
	 */
	parseWellsFargoTransaction(line) {
		// Wells Fargo format has multiple columns - we need to find the description and amount
		// Amount is in the last column with $ sign, e.g. $2.90 or -$2.90
		const amountMatch = /(.+?)\s+\$(-?\d+(?:,\d{3})*\.\d{2})$/.exec(line);
		if (!amountMatch) return null;

		const description = amountMatch[1].trim();
		const amountString = amountMatch[2];
		const amount = this.parseAmount(amountString);

		if (!description || description.length < 2) return null;

		return {
			description,
			amount
		};
	}

	/**
	 * Parse Wells Fargo transaction date from MM/DD format to full date
	 * @param {string} dateStr - Date string in MM/DD format
	 * @param {number} statementYear - Year from statement date
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseWellsFargoFullDate(dateString, statementYear) {
		if (!dateString) return null;

		const match = /^(\d{1,2})\/(\d{1,2})$/.exec(dateString);
		if (!match) return null;

		const month = Number.parseInt(match[1], 10);
		const day = Number.parseInt(match[2], 10);

		if (month < 1 || month > 12 || day < 1 || day > 31) return null;

		// Use statement year for transaction year
		return `${statementYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	}

	/**
	 * Parse Wells Fargo transaction date from MM/YY format
	 * @param {string} dateStr - Date string in MM/YY format
	 * @param {number} statementYear - Year from statement date
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseWellsFargoTransactionDate(dateString, statementYear) {
		if (!dateString) return null;

		const match = /^(\d{1,2})\/(\d{2})$/.exec(dateString);
		if (!match) return null;

		const month = Number.parseInt(match[1], 10);
		const year2Digit = Number.parseInt(match[2], 10);

		if (month < 1 || month > 12) return null;

		// Determine the full year based on the statement year
		// If the transaction year (YY) is close to the statement year, use statement year
		// Otherwise, adjust for year boundaries
		let transactionYear;
		const statementYear2Digit = statementYear % 100;

		if (Math.abs(year2Digit - statementYear2Digit) <= 1) {
			// Transaction is within 1 year of statement year
			transactionYear = Math.floor(statementYear / 100) * 100 + year2Digit;
		} else if (year2Digit > statementYear2Digit) {
			// Transaction year is significantly higher - likely previous century
			transactionYear = Math.floor(statementYear / 100) * 100 + year2Digit - 100;
		} else {
			// Transaction year is significantly lower - likely next century
			transactionYear = Math.floor(statementYear / 100) * 100 + year2Digit + 100;
		}

		// Default to middle of month since Wells Fargo only provides MM/YY
		const day = 15;

		return `${transactionYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	}

	/**
	 * Check if a line contains only currency information
	 * @param {string} line - Line to check
	 * @returns {boolean} - True if line contains currency information
	 */
	isCurrencyLine(line) {
		const trimmed = line.trim();

		// Must be between 3 and 25 characters
		if (trimmed.length < 3 || trimmed.length > 25) {
			return false;
		}

		// Check for specific currency keywords
		const currencyKeywords = ['KRONE', 'EURO', 'POUND', 'YEN', 'FRANC', 'PESO', 'STERLING'];

		// Must contain a currency keyword OR be all uppercase letters and spaces
		const containsCurrencyKeyword = currencyKeywords.some((keyword) =>
			trimmed.toUpperCase().includes(keyword)
		);

		const isAllUppercaseLetters =
			/^[A-Z\s]+$/.test(trimmed) &&
			!trimmed.includes('STORE') &&
			!trimmed.includes('WALMART') &&
			!trimmed.includes('AMAZON');

		return containsCurrencyKeyword || isAllUppercaseLetters;
	}

	/**
	 * Parse exchange rate information
	 * @param {string} line - Line containing exchange rate
	 * @returns {Object|null} - Object with foreign amount and exchange rate, or null
	 */
	parseExchangeRate(line) {
		// Look for pattern like "123.45 X 0.67" or similar
		const rateMatch = /(\d+\.\d+)\s*X\s*(\d+\.\d+)/.exec(line);
		if (!rateMatch) return null;

		return {
			foreignAmount: Number.parseFloat(rateMatch[1]),
			exchangeRate: Number.parseFloat(rateMatch[2])
		};
	}

	/**
	 * Check if a description represents a payment to the card
	 * @param {string} description - Transaction description
	 * @returns {boolean} - True if it's a payment to the card
	 */
	isPaymentToCard(description) {
		const paymentKeywords = [
			'ONLINE ACH PAYMENT THANK YOU',
			'PAYMENT THANK YOU',
			'ONLINE PAYMENT',
			'PAYMENT RECEIVED',
			'AUTOPAY',
			'ACH PAYMENT',
			'PAYMENT - THANK YOU'
		];

		const descriptionUpper = description.toUpperCase();
		return paymentKeywords.some((keyword) => descriptionUpper.includes(keyword));
	}

	/**
	 * Returns the regex for identifying a transaction line.
	 * @returns {RegExp}
	 */
	getTransactionLineRegex() {
		return /^\d{1,2}\/\d{1,2}\s+\d{1,2}\/\d{1,2}/;
	}
}
