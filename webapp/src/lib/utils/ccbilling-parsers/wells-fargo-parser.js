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
	 * Returns the regex patterns for identifying the last 4 digits of the credit card.
	 * @returns {RegExp[]}
	 */
	getLast4DigitsPatterns() {
		return [
			/Account Number Ending in\s*(\d{4})/i,
			/Account Number.*?(\d{4})/i,
			/Ending in\s*(\d{4})/i
		];
	}

	/**
	 * Returns the regex patterns for identifying the statement date.
	 * @returns {RegExp[]}
	 */
	getStatementDatePatterns() {
		return [
			/Billing Cycle\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Statement Period\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Statement Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
		];
	}

	/**
	 * Parse Wells Fargo date format (MM/DD/YYYY) to YYYY-MM-DD
	 * @param {string} dateStr - Date string in MM/DD/YYYY format
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseWellsFargoDate(dateString) {
		if (!dateString) return null;

		const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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
		const charges = [];

		// First, find the statement end date to determine transaction years
		const statementDate = this.extractStatementDate(text);
		const statementYear = statementDate
			? new Date(statementDate).getFullYear()
			: new Date().getFullYear();

		// Find the Transaction Summary section without using a mega-regex
		const upperText = text.toUpperCase();
		const startIndex = upperText.indexOf('TRANSACTION SUMMARY');
		if (startIndex === -1) {
			return charges;
		}

		const endCandidates = [
			upperText.indexOf('FEES CHARGED', startIndex + 1),
			upperText.indexOf('INTEREST CHARGED', startIndex + 1),
			upperText.indexOf('BILTPROTECT SUMMARY', startIndex + 1)
		].filter((index) => index !== -1);
		const endIndex = endCandidates.length > 0 ? Math.min(...endCandidates) : text.length;

		const transactionSection = text.slice(startIndex, endIndex);
		const lines = transactionSection
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];

			const transactionDetails = this._parseTransactionLineDetails(line, statementYear);

			if (transactionDetails) {
				const { description, amount, date } = transactionDetails;

				// Check if this is an Amazon charge and capture full statement text
				let fullStatementText = null;
				if (this.isAmazonTransaction(description)) {
					fullStatementText = this.extractFullStatementText(lines, index);
				}

				const { isForeignTransaction, foreignCurrencyAmount, foreignCurrencyType } =
					this._extractForeignTransactionDetails(lines, index);

				const charge = {
					merchant: description.trim(),
					amount: Math.abs(amount), // Store as positive value
					date,
					allocated_to: null,
					is_foreign_currency: isForeignTransaction,
					foreign_currency_amount: foreignCurrencyAmount,
					foreign_currency_type: foreignCurrencyType,
					full_statement_text: fullStatementText
				};

				charges.push(charge);
			}
		}
		return charges;
	}

	/**
	 * Extract foreign transaction details from statement lines.
	 * @param {string[]} lines - All lines of the text content.
	 * @param {number} startIndex - The index of the current transaction line.
	 * @returns {{isForeignTransaction: boolean, foreignCurrencyAmount: number|null, foreignCurrencyType: string|null}}
	 * @private
	 */
	_extractForeignTransactionDetails(lines, startIndex) {
		let isForeignTransaction = false;
		let foreignCurrencyAmount = null;
		let foreignCurrencyType = null;

		for (let i = startIndex + 1; i < Math.min(startIndex + 4, lines.length); i++) {
			const nextLine = lines[i];

			if (this.isCurrencyLine(nextLine)) {
				const currencyMatch = nextLine.match(/(?:- \d{1,2}\/\d{1,2} )?(.*)/);
				foreignCurrencyType = currencyMatch ? currencyMatch[1].trim() : nextLine.trim();
				isForeignTransaction = true;

				if (i + 1 < lines.length) {
					const rateLine = lines[i + 1];
					const rateMatch = this.parseExchangeRate(rateLine);
					if (rateMatch) {
						foreignCurrencyAmount = rateMatch.foreignAmount;
						break;
					}
				}
			}

			if (/^\d{1,2}\/\d{1,2}\s+\d{1,2}\/\d{1,2}/.test(nextLine)) {
				break;
			}
		}

		return { isForeignTransaction, foreignCurrencyAmount, foreignCurrencyType };
	}

	/**
				
				    	 * Parse Wells Fargo transaction line from text and statement year.
				
				    	 * @param {string} line - The transaction line text.
				
				    	 * @param {number} statementYear - The year from the statement date.
				
				    	 * @returns {{description: string, amount: number, date: string}|null} Parsed details or null if not a valid transaction line.
				
				    	 * @private
				
				    	 */

	_parseTransactionLineDetails(line, statementYear) {
		// Look for Wells Fargo transaction format: MM/DD MM/DD REFERENCE_NUMBER DESCRIPTION AMOUNT

		const transactionMatch = line.match(
			/^(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+\d+\s+\w+\s+([^\$]+?)\s+\$(-?\d+(?:,\d{3})*\.?\d{0,2})[-]?$/
		);

		if (!transactionMatch) {
			return null;
		}

		const transDate = transactionMatch[1]; // MM/DD format

		const description = transactionMatch[3].trim();

		const amountString = transactionMatch[4];

		// Skip payments to the card

		if (this.isPaymentToCard(description)) {
			return null;
		}

		const amount = this.parseAmount(amountString);

		const date = this.parseWellsFargoFullDate(transDate, statementYear);

		if (!date || isNaN(amount) || description.length < 2) {
			return null;
		}

		return { description, amount, date };
	}

	/**
				
				    	 * Parse Wells Fargo transaction line	 * @param {string} line - Rest of the transaction line after date
	 * @returns {Object|null} - Object with description and amount, or null
	 */
	parseWellsFargoTransaction(line) {
		// Wells Fargo format has multiple columns - we need to find the description and amount
		// Amount is in the last column with $ sign, e.g. $2.90 or -$2.90
		const amountMatch = line.match(/(.+?)\s+\$(-?\d+(?:,\d{3})*\.\d{2})$/);
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

		const match = dateString.match(/^(\d{1,2})\/(\d{1,2})$/);
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

		const match = dateString.match(/^(\d{1,2})\/(\d{2})$/);
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
		const rateMatch = line.match(/(\d+\.\d+)\s*X\s*(\d+\.\d+)/);
		if (!rateMatch) return null;

		return {
			foreignAmount: Number.parseFloat(rateMatch[1]),
			exchangeRate: Number.parseFloat(rateMatch[2])
		};
	}

	/**
	 * Returns the keywords for identifying a payment to the card.
	 * @returns {string[]}
	 */
	getPaymentKeywords() {
		return [
			'ONLINE ACH PAYMENT THANK YOU',
			'PAYMENT THANK YOU',
			'ONLINE PAYMENT',
			'PAYMENT RECEIVED',
			'AUTOPAY',
			'ACH PAYMENT',
			'PAYMENT - THANK YOU'
		];
	}

	/**
	 * Returns the regex for identifying a transaction line.
	 * @returns {RegExp}
	 */
	getTransactionLineRegex() {
		return /^\d{1,2}\/\d{1,2}\s+\d{1,2}\/\d{1,2}/;
	}
}
