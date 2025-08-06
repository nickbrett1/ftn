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
		const chaseIdentifiers = ['CHASE'];

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
			// Use safe regex to avoid ReDoS attacks
			const amountMatch = this.safeMatchAmount(restOfLine);
			if (!amountMatch) continue;

			const merchant = amountMatch.merchant.trim();
			const amount = this.parseAmount(amountMatch.amount);

			if (!date || !amount || merchant.length < 2) continue;

			// Skip payments to the card
			if (this.isPaymentToCard(merchant)) {
				continue;
			}

			// Check if this might be a foreign currency transaction
			let isForeignTransaction = false;
			let foreignCurrencyAmount = null;
			let foreignCurrencyType = null;

			// Always look ahead for currency conversion information
			// Look at the next few lines for currency conversion info
			for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
				const nextLine = lines[j];

				// Check for currency type line (e.g., "POUND STERLING")
				if (this.safeMatchCurrencyLine(nextLine)) {
					foreignCurrencyType = nextLine.trim();
					isForeignTransaction = true;

					// Look for the amount and exchange rate on the next line
					if (j + 1 < lines.length) {
						const rateLine = lines[j + 1];
						const rateMatch = this.safeMatchExchangeRate(rateLine);
						if (rateMatch) {
							foreignCurrencyAmount = rateMatch.amount1;
							break;
						}
					}
				}

				// Check for exchange rate pattern in the same line
				const rateMatch = this.safeMatchExchangeRate(nextLine);
				if (rateMatch) {
					foreignCurrencyAmount = rateMatch.amount1;
					isForeignTransaction = true;
					// Look for currency type in the same line or previous line
					const currencyMatch = this.safeMatchCurrencyLine(nextLine);
					if (currencyMatch) {
						foreignCurrencyType = nextLine.trim();
					}
					break;
				}

				// Stop looking if we encounter another transaction line (starts with date pattern and contains an amount)
				if (nextLine.match(/^\d{2}\/\d{2}\s+/) && nextLine.match(/\d+\.\d{2}$/)) {
					break;
				}
			}

			// Check if this is a flight transaction and capture additional flight details
			let flightDetails = null;
			if (this.isFlightTransaction(merchant)) {
				flightDetails = this.extractFlightDetails(lines, i);
			}

			const charge = {
				merchant,
				amount,
				date,
				allocated_to: null,
				is_foreign_currency: isForeignTransaction,
				foreign_currency_amount: foreignCurrencyAmount,
				foreign_currency_type: foreignCurrencyType,
				flight_details: flightDetails
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
		let flightDetails = {
			departure_airport: null,
			arrival_airport: null,
			departure_date: null,
			arrival_date: null,
			airline: null,
			fare: null,
			currency: null,
			exchange_rate: null
		};

		// Look at the next few lines for airport codes
		for (let i = startIndex + 1; i < Math.min(startIndex + 5, lines.length); i++) {
			const line = lines[i];

			// Look for airport codes pattern (e.g., "100925 1 L LGA IAH")
			const airportMatch = line.match(/(\d{6})\s+(\d+)\s+(\w)\s+(\w{3})\s+(\w{3})/);
			if (airportMatch) {
				flightDetails.departure_airport = airportMatch[4]; // LGA
				flightDetails.arrival_airport = airportMatch[5]; // IAH
				break;
			}

			// Look for simple airport codes (e.g., "LGA IAH") - but only if line is short and doesn't contain transaction details
			if (
				line.length < 20 &&
				!line.includes('UNITED') &&
				!line.includes('TX') &&
				!line.includes('$')
			) {
				const simpleAirportMatch = line.match(/^(\w{3})\s+(\w{3})$/);
				if (simpleAirportMatch) {
					flightDetails.departure_airport = simpleAirportMatch[1];
					flightDetails.arrival_airport = simpleAirportMatch[2];
					break;
				}
			}

			// Stop looking if we encounter another transaction line (starts with date pattern)
			if (line.match(/^\d{2}\/\d{2}\s+/)) {
				break;
			}
		}

		// Extract airline from the merchant name
		const merchant = lines[startIndex].match(/^(\d{2}\/\d{2})\s+(.+)/)?.[2] || '';

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
				'ALASKA'
			];
			for (const airline of airlines) {
				if (merchant.toUpperCase().includes(airline)) {
					flightDetails.airline = airline;
					break;
				}
			}
		}

		// Only return details if at least one is found
		return Object.values(flightDetails).some((value) => value !== null) ? flightDetails : null;
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
		const amountMatch = this.safeMatchAmount(line);
		if (!amountMatch) return null;

		const amount = this.parseAmount(amountMatch.amount);

		// Extract merchant name from the safe match, but remove the date part
		let merchant = amountMatch.merchant;

		// Remove the date part from the beginning of the merchant name
		const datePattern = /^\d{1,2}\/\d{1,2}\s+/;
		merchant = merchant.replace(datePattern, '');

		// Clean up merchant name
		merchant = merchant.replace(/\s+/g, ' ').trim();

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
		const lastPart = parts[parts.length - 1];
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
		const result =
			(/^[A-Z\s]+$/.test(line) || /^\d{2}\/\d{2}\s+[A-Z\s]+$/.test(line)) && line.trim().length > 0;
		return result;
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
		const amount2 = amount2WithExtra.match(/^(\d+\.\d+)/)?.[1];

		const numberPattern = /^\d+\.\d+$/;

		if (!numberPattern.test(amount1) || !amount2 || !numberPattern.test(amount2)) {
			return null;
		}

		const result = {
			amount1: parseFloat(amount1),
			amount2: parseFloat(amount2)
		};
		return result;
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

	/**
	 * Find text using a regex pattern and return the first match
	 * @param {string} text - Text to search in
	 * @param {RegExp} pattern - Regex pattern to match
	 * @returns {string|null} - First match or null
	 */
	findText(text, pattern) {
		const match = text.match(pattern);
		return match ? match[1] : null;
	}
}
