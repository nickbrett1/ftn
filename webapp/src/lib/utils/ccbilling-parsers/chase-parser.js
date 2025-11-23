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
		// Handle null or undefined text
		if (!text) return false;

		const textUpper = text.toUpperCase();

		// Look for Chase-specific identifiers - be more specific to avoid false positives
		const chaseIdentifiers = ['JPMORGAN CHASE', 'CHASE BANK', 'CHASE CARD'];

		// Check for Chase identifiers
		const hasChaseIdentifier = chaseIdentifiers.some((identifier) =>
			textUpper.includes(identifier)
		);

		// Also check for "CHASE" when it appears as a standalone word or at word boundaries
		// This avoids matching "Cash Advance" -> "CASH ADVANCE" which contains "CHASE"
		const hasChaseWord =
			/\bCHASE\b/.test(textUpper) &&
			!textUpper.includes('WELLS FARGO') &&
			!textUpper.includes('BILT');

		// Check for Amazon Chase card identifiers
		const amazonChaseIdentifiers = [
			'AMAZON REWARDS',
			'AMAZON PRIME',
			'AMAZON.COM',
			'AMAZON CHASE',
			'CHASE AMAZON'
		];

		const hasAmazonChaseIdentifier = amazonChaseIdentifiers.some((identifier) =>
			textUpper.includes(identifier)
		);

		return hasChaseIdentifier || hasChaseWord || hasAmazonChaseIdentifier;
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
	 * Returns the regex patterns for identifying the last 4 digits of the credit card.
	 * @returns {RegExp[]}
	 */
	getLast4DigitsPatterns() {
		return [
			/Account Number:\s*XXXX\s+XXXX\s+XXXX\s+(\d{4})/i,
			/Account Number:\s*(\d{4})/i,
			/XXXX\s+XXXX\s+XXXX\s+(\d{4})/i,
			/(?:card|account)\s+(?:number|#)[:\s]*\*{0,4}(\d{4})/i,
			/Account.*?(\d{4})/i,
			/Card.*?(\d{4})/i,
			/Account Number.*?(\d{4})/i,
			/Card Number.*?(\d{4})/i,
			/ending\s+in\s+(\d{4})/i,
			/\*{4}\s*(\d{4})/i,
			/\*+\s*(\d{4})/i
		];
	}

	/**
	 * Returns the regex patterns for identifying the statement date.
	 * @returns {RegExp[]}
	 */
	getStatementDatePatterns() {
		return [
			/Opening\/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Statement Date\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Billing Cycle\s+(\d{1,2}\/\d{1,2}\/\d{2})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Billing Period\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Statement Period\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Statement Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Billing Cycle\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
		];
	}

	/**
	 * Parse Chase date format (MM/DD/YY) to YYYY-MM-DD
	 * @param {string} dateStr - Date string in MM/DD/YY format
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseChaseDate(dateString) {
		if (!dateString) return null;

		const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(dateString);
		if (!match) return null;

		const month = Number.parseInt(match[1], 10);
		const day = Number.parseInt(match[2], 10);
		const year2Digit = Number.parseInt(match[3], 10);

		// Convert 2-digit year to 4-digit year
		const year = year2Digit < 50 ? 2000 + year2Digit : 1900 + year2Digit;

		if (month < 1 || month > 12 || day < 1 || day > 31) {
			return null;
		}

		return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
	}

	/**
	 * Parse Chase date format (MM/DD/YYYY) to YYYY-MM-DD
	 * @param {string} dateStr - Date string in MM/DD/YYYY format
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseChaseDate4Digit(dateString) {
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
		const charges = [];
		const lines = text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		// Flag to track if we're in the SHOP WITH POINTS ACTIVITY section
		let inShopWithPointsSection = false;

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];

			const sectionState = this.updateSectionState(line, inShopWithPointsSection);
			inShopWithPointsSection = sectionState.inShopWithPointsSection;
			if (sectionState.shouldSkip) continue;

			// Only process transaction lines when we're NOT in the SHOP WITH POINTS ACTIVITY section
			if (inShopWithPointsSection) {
				continue;
			}

			const transaction = this.parseBasicTransaction(line);
			if (!transaction) continue;

			// Additional check: Skip if this looks like a "SHOP WITH POINTS" transaction
			if (
				this.isLikelyShopWithPointsTransaction(
					transaction.merchant,
					transaction.amount,
					transaction.restOfLine
				)
			) {
				continue;
			}

			// Skip payments to the card
			if (this.isPaymentToCard(transaction.merchant)) {
				continue;
			}

			// Check if this might be a foreign currency transaction
			const foreignInfo = this.extractForeignTransactionInfo(lines, index);

			// Check if this is a flight transaction and capture additional flight details
			const flightDetails = this.isFlightTransaction(transaction.merchant)
				? this.extractFlightDetails(lines, index)
				: null;

			// Check if this is an Amazon charge and capture full statement text
			const fullStatementText = this.isAmazonTransaction(transaction.merchant)
				? this.extractFullStatementText(lines, index)
				: null;

			const charge = {
				merchant: transaction.merchant,
				amount: transaction.amount,
				date: transaction.date,
				allocated_to: null,
				...foreignInfo,
				flight_details: flightDetails,
				full_statement_text: fullStatementText
			};

			charges.push(charge);
		}

		return charges;
	}

	/**
	 * Update section state based on current line
	 * @param {string} line - Current line
	 * @param {boolean} inShopWithPointsSection - Current state
	 * @returns {Object} - New state { inShopWithPointsSection, shouldSkip }
	 */
	updateSectionState(line, inShopWithPointsSection) {
		const lineUpper = line.toUpperCase();

		if (lineUpper.includes('SHOP WITH POINTS ACTIVITY')) {
			return { inShopWithPointsSection: true, shouldSkip: true };
		}

		if (lineUpper.includes('ACCOUNT ACTIVITY')) {
			return { inShopWithPointsSection: false, shouldSkip: true };
		}

		if (inShopWithPointsSection) {
			if (
				lineUpper.includes('INTEREST CHARGES') ||
				lineUpper.includes('YOUR ACCOUNT MESSAGES') ||
				lineUpper.includes('ACCOUNT SUMMARY') ||
				lineUpper.includes('ACCOUNT ACTIVITY')
			) {
				return { inShopWithPointsSection: false, shouldSkip: false };
			}
			// Skip all lines while in this section
			return { inShopWithPointsSection: true, shouldSkip: true };
		}

		return { inShopWithPointsSection, shouldSkip: false };
	}

	/**
	 * Parse basic transaction details from a line
	 * @param {string} line - Line to parse
	 * @returns {Object|null} - Basic transaction details or null
	 */
	parseBasicTransaction(line) {
		// Look for date pattern at the start of a line (MM/DD)
		const dateMatch = /^(\d{2}\/\d{2})\s+(.+)/.exec(line);
		if (!dateMatch) return null;

		const date = this.parseDate(dateMatch[1]);
		const restOfLine = dateMatch[2];

		// Check if this line contains an amount (purchase transaction)
		const amountMatch = this.safeMatchAmount(restOfLine);
		if (!amountMatch) return null;

		const merchant = amountMatch.merchant.trim();
		const amount = this.parseAmount(amountMatch.amount);

		if (!date || !amount || merchant.length < 2) return null;

		return { date, merchant, amount, restOfLine };
	}

	/**
	 * Extract foreign transaction information by looking ahead
	 * @param {string[]} lines - All lines
	 * @param {number} currentIndex - Current line index
	 * @returns {Object} - Foreign transaction details
	 */
	extractForeignTransactionInfo(lines, currentIndex) {
		for (let i = currentIndex + 1; i < Math.min(currentIndex + 5, lines.length); i++) {
			const nextLine = lines[i];

			if (this._isTransactionLine(nextLine)) {
				break;
			}

			const currencyInfo = this._parseCurrencyInfo(nextLine, lines, i);
			if (currencyInfo) {
				return currencyInfo;
			}
		}

		return {
			is_foreign_currency: false,
			foreign_currency_amount: null,
			foreign_currency_type: null
		};
	}

	_isTransactionLine(line) {
		return /^\d{2}\/\d{2}\s+/.test(line) && /\d+\.\d{2}$/.test(line);
	}

	_parseCurrencyInfo(line, lines, index) {
		if (this.safeMatchCurrencyLine(line)) {
			const currencyType = line.trim();
			let currencyAmount = null;

			if (index + 1 < lines.length) {
				const rateLine = lines[index + 1];
				const rateMatch = this.safeMatchExchangeRate(rateLine);
				if (rateMatch) {
					currencyAmount = rateMatch.amount1;
				}
			}
			return {
				is_foreign_currency: true,
				foreign_currency_amount: currencyAmount,
				foreign_currency_type: currencyType
			};
		}

		const rateMatch = this.safeMatchExchangeRate(line);
		if (rateMatch) {
			const currencyAmount = rateMatch.amount1;
			const currencyType = this.safeMatchCurrencyLine(line) ? line.trim() : null;
			return {
				is_foreign_currency: true,
				foreign_currency_amount: currencyAmount,
				foreign_currency_type: currencyType
			};
		}

		return null;
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
	 * Check if a merchant name represents a flight transaction
	 * @param {string} merchant - Merchant name
	 * @returns {boolean} - True if it's a flight transaction
	 */
	isFlightTransaction(merchant) {
		const flightIndicators = [
			'FLIGHT',
			'AIRLINE',
			'AIRPORT',
			'TICKET',
			'TRAVEL',
			'HOTEL',
			'CAR RENTAL',
			'TRANSPORTATION',
			'UNITED',
			'AMERICAN',
			'DELTA',
			'SOUTHWEST',
			'JETBLUE',
			'SPIRIT',
			'FRONTIER',
			'ALASKA',
			'BRITISH AIRWAYS',
			'LUFTHANSA',
			'AIR CANADA',
			'EMIRATES',
			'QATAR',
			'TURKISH AIRLINES'
		];

		const merchantUpper = merchant.toUpperCase();
		return flightIndicators.some((indicator) => merchantUpper.includes(indicator));
	}

	/**
	 * Extract flight details from multi-line flight transactions
	 * @param {string[]} lines - All lines of the text content
	 * @param {number} startIndex - The index of the first line of the flight transaction
	 * @returns {Object|null} - Object containing flight details or null
	 */
	extractFlightDetails(lines, startIndex) {
		const airportDetails = this.extractAirportCodes(lines, startIndex);
		const airline = this.extractAirline(lines, startIndex);

		const flightDetails = {
			departure_airport: airportDetails.departure_airport,
			arrival_airport: airportDetails.arrival_airport,
			departure_date: null,
			arrival_date: null,
			airline: airline,
			fare: null,
			currency: null,
			exchange_rate: null
		};

		// Only return details if at least one is found
		return Object.values(flightDetails).some((value) => value !== null) ? flightDetails : null;
	}

	/**
	 * Extract airport codes from transaction lines
	 * @param {string[]} lines - All lines of the text content
	 * @param {number} startIndex - The index of the first line of the flight transaction
	 * @returns {Object} - Object containing departure and arrival airports
	 */
	extractAirportCodes(lines, startIndex) {
		for (let index = startIndex + 1; index < Math.min(startIndex + 5, lines.length); index++) {
			const line = lines[index];
			const airportDetails = this._parseAirportCodesFromLine(line);
			if (airportDetails) {
				return airportDetails;
			}
			if (/^\d{2}\/\d{2}\s+/.test(line)) {
				break;
			}
		}
		return {
			departure_airport: null,
			arrival_airport: null
		};
	}

	_parseAirportCodesFromLine(line) {
		const airportMatch = /(\d{6})\s+(\d+)\s+(\w)\s+(\w{3})\s+(\w{3})/.exec(line);
		if (airportMatch) {
			return {
				departure_airport: airportMatch[4],
				arrival_airport: airportMatch[5]
			};
		}

		if (
			line.length < 20 &&
			!line.includes('UNITED') &&
			!line.includes('TX') &&
			!line.includes('$')
		) {
			const simpleAirportMatch = /^(\w{3})\s+(\w{3})$/.exec(line);
			if (simpleAirportMatch) {
				return {
					departure_airport: simpleAirportMatch[1],
					arrival_airport: simpleAirportMatch[2]
				};
			}
		}

		return null;
	}

	/**
	 * Extract airline from the merchant name
	 * @param {string[]} lines - All lines of the text content
	 * @param {number} startIndex - The index of the first line of the flight transaction
	 * @returns {string|null} - Airline name or null
	 */
	extractAirline(lines, startIndex) {
		const merchant = /^(\d{2}\/\d{2})\s+(.+)/.exec(lines[startIndex])?.[2] || '';

		if (merchant) {
			// Look for airline names in the merchant field
			const airlines = [
				'UNITED',
				'AMERICAN',
				'DELTA',
				'SOUTHWEST',
				'JETBLUE',
				'SPIRIT',
				'FRONTIER',
				'ALASKA',
				'BRITISH AIRWAYS'
			];
			for (const airline of airlines) {
				if (merchant.toUpperCase().includes(airline)) {
					return airline;
				}
			}
		}
		return null;
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
		const dateMatch = /^(\d{1,2}\/\d{1,2})/.exec(line);
		if (!dateMatch) return null;

		const date = this.parseDate(dateMatch[1]);
		if (!date) return null;

		// Look for amount at the end (negative for credits)
		const amountMatch = this.safeMatchAmount(line);
		if (!amountMatch) return null;

		const amount = this.parseAmount(amountMatch.amount);

		// Extract merchant name from the safe match, but remove the date part
		let merchant = amountMatch.merchant;

		// Remove the date part from the beginning of the merchant name
		const datePattern = /^\d{1,2}\/\d{1,2}\s+/;
		merchant = merchant.replace(datePattern, '');

		// Clean up merchant name
		merchant = merchant.replaceAll(/\s+/g, ' ').trim();

		// Skip if merchant is empty or too short
		if (!merchant || merchant.length < 2) return null;

		return {
			merchant,
			amount,
			date,
			allocated_to: null
		};
	}

	/**
	 * Safely match amount pattern to avoid ReDoS attacks
	 * @param {string} line - Line to parse
	 * @returns {Object|null} - Object with merchant and amount, or null
	 */
	safeMatchAmount(line) {
		// Split on whitespace and look for amount at the end
		const parts = line.trim().split(/\s+/);
		if (parts.length < 2) return null;

		// Check if last part looks like an amount
		const lastPart = parts.at(-1);
		const amountPattern = /^[-\d,]*\.?\d{1,2}$/;

		if (!amountPattern.test(lastPart)) return null;

		// Extract merchant (everything except the amount)
		const merchant = parts.slice(0, -1).join(' ');

		return {
			merchant,
			amount: lastPart
		};
	}

	/**
	 * Safely match currency line pattern
	 * @param {string} line - Line to check
	 * @returns {boolean} - True if line contains only uppercase letters and spaces
	 */
	safeMatchCurrencyLine(line) {
		// Check if line contains only uppercase letters and spaces, or starts with date + uppercase letters
		// But exclude common section headers and non-currency text
		const lineTrimmed = line.trim();

		// Skip if line is too short or contains common section headers
		if (lineTrimmed.length < 3) return false;

		// Skip common section headers that might look like currency lines
		const sectionHeaders = [
			'SHOP WITH POINTS ACTIVITY',
			'ACCOUNT ACTIVITY',
			'INTEREST CHARGES',
			'YOUR ACCOUNT MESSAGES',
			'ACCOUNT SUMMARY',
			'TRANSACTION',
			'MERCHANT NAME',
			'DESCRIPTION',
			'AMOUNT',
			'REWARDS'
		];

		if (sectionHeaders.some((header) => lineTrimmed.toUpperCase().includes(header))) {
			return false;
		}

		// Only match lines that look like actual currency names
		// These should be relatively short and contain currency-related words
		const currencyKeywords = [
			'DOLLAR',
			'POUND',
			'EURO',
			'YEN',
			'FRANC',
			'KRONE',
			'KRONA',
			'PESO',
			'REAL',
			'YUAN',
			'WON',
			'RUBLE',
			'LIRA',
			'RAND',
			'RUPEE'
		];

		const hasCurrencyKeyword = currencyKeywords.some((keyword) =>
			lineTrimmed.toUpperCase().includes(keyword)
		);

		// Only return true if it has a currency keyword and matches the pattern
		const matchesPattern =
			/^[A-Z\s]+$/.test(lineTrimmed) || /^\d{2}\/\d{2}\s+[A-Z\s]+$/.test(lineTrimmed);

		return matchesPattern && hasCurrencyKeyword;
	}

	/**
	 * Safely match exchange rate pattern
	 * @param {string} line - Line to check
	 * @returns {Object|null} - Object with amounts, or null
	 */
	safeMatchExchangeRate(line) {
		// Look for pattern like "123.45 X 0.67" or "123.45 X 0.67 (EXCHG RATE)"
		const parts = line.trim().split(/\s+X\s+/);
		if (parts.length !== 2) {
			return null;
		}

		const [amount1, amount2WithExtra] = parts;
		// Extract just the number from amount2, removing any extra text like "(EXCHG RATE)"
		const amount2 = /^(\d+\.\d+)/.exec(amount2WithExtra)?.[1];

		const numberPattern = /^\d+\.\d+$/;

		if (!numberPattern.test(amount1) || !amount2 || !numberPattern.test(amount2)) {
			return null;
		}

		const result = {
			amount1: Number.parseFloat(amount1),
			amount2: Number.parseFloat(amount2)
		};
		return result;
	}

	/**
	 * Check if a merchant name represents a payment to the card
	 * @param {string} merchant - Merchant name
	 * @returns {boolean} - True if it's a payment to the card
	 */
	/**
	 * Returns the keywords for identifying a payment to the card.
	 * @returns {string[]}
	 */
	getPaymentKeywords() {
		return [
			'payment thank you',
			'payment thank you-mobile',
			'online payment',
			'payment received',
			'payment',
			'credit card payment',
			'payment - thank you',
			'payment - thank you-mobile'
		];
	}

	/**
	 * Check if a transaction is likely a "SHOP WITH POINTS" transaction
	 * These transactions use points instead of money and often have suspicious amounts
	 * @param {string} merchant - Merchant name
	 * @param {string} amount - Transaction amount
	 * @param {string} fullLine - Full transaction line text
	 * @returns {boolean} - True if it's likely a SHOP WITH POINTS transaction
	 */
	isLikelyShopWithPointsTransaction(merchant, amount, fullLine) {
		const lineLower = fullLine.toLowerCase();
		const merchantLower = merchant.toLowerCase();

		// Helper functions for individual checks
		const checkAmznBillwa = () => lineLower.includes('amzn.com/billwa');
		const checkSuspiciousAmount = () => amount > 1000 && merchantLower.includes('amazon');
		const checkPointsKeywords = () => {
			const pointsKeywords = ['points', 'rewards', 'shop with points'];
			return pointsKeywords.some((keyword) => lineLower.includes(keyword));
		};
		const checkSuspiciousMerchants = () => {
			const suspiciousMerchants = ['amazon.com', 'amazon marketplace', 'amazon mkpl'];
			return (
				suspiciousMerchants.some((suspicious) => merchantLower.includes(suspicious)) && amount > 500
			);
		};

		// Combine checks
		return (
			checkAmznBillwa() ||
			checkSuspiciousAmount() ||
			checkPointsKeywords() ||
			checkSuspiciousMerchants()
		);
	}
}
