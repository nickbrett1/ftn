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
	 * Extract the last 4 digits of the credit card
	 * @param {string} text - PDF text content
	 * @returns {string|null} - Last 4 digits or null
	 */
	extractLast4Digits(text) {
		// Look for various account number patterns
		const patterns = [
			// Standard Chase patterns
			/Account Number:\s*XXXX\s+XXXX\s+XXXX\s+(\d{4})/i,
			/Account Number:\s*(\d{4})/i,
			/XXXX\s+XXXX\s+XXXX\s+(\d{4})/i,

			// More comprehensive patterns from regex validator
			/(?:card|account)\s+(?:number|#)[:\s]*\*{0,4}(\d{4})/i,

			// Additional patterns that might be used by Amazon Chase cards
			/Account.*?(\d{4})/i,
			/Card.*?(\d{4})/i,
			/Account Number.*?(\d{4})/i,
			/Card Number.*?(\d{4})/i,

			// Pattern for statements that show "ending in XXXX"
			/ending\s+in\s+(\d{4})/i,

			// Pattern for masked numbers with asterisks
			/\*{4}\s*(\d{4})/i,
			/\*+\s*(\d{4})/i
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
		// Look for various date patterns used by Chase statements
		const patterns = [
			// Standard Chase patterns
			/Opening\/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Statement Date\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,

			// Additional patterns that might be used by Amazon Chase cards
			/Billing Cycle\s+(\d{1,2}\/\d{1,2}\/\d{2})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Billing Period\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,
			/Statement Period\s+(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})/i,

			// Patterns with 4-digit years
			/Closing Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Statement Date\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/Billing Cycle\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
		];

		for (const pattern of patterns) {
			const match = text.match(pattern);
			if (match) {
				// Use the second date (closing date) if two dates are provided
				const dateString = match[2] || match[1];

				// Check if the date is in 4-digit year format
				return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)
					? this.parseChaseDate4Digit(dateString)
					: this.parseChaseDate(dateString);
			}
		}

		return null;
	}

	/**
	 * Parse Chase date format (MM/DD/YY) to YYYY-MM-DD
	 * @param {string} dateStr - Date string in MM/DD/YY format
	 * @returns {string|null} - Date in YYYY-MM-DD format
	 */
	parseChaseDate(dateString) {
		if (!dateString) return null;

		const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
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
		const lines = text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		// Flag to track if we're in the SHOP WITH POINTS ACTIVITY section
		let inShopWithPointsSection = false;

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];

			// Check if we're entering the SHOP WITH POINTS ACTIVITY section
			if (line.toUpperCase().includes('SHOP WITH POINTS ACTIVITY')) {
				inShopWithPointsSection = true;
				continue;
			}

			// Check if we're entering the ACCOUNT ACTIVITY section (including continued)
			if (line.toUpperCase().includes('ACCOUNT ACTIVITY')) {
				inShopWithPointsSection = false; // Exit points section when entering account activity
				continue;
			}

			// Check if we're exiting the SHOP WITH POINTS ACTIVITY section
			// Look for other section headers
			if (inShopWithPointsSection) {
				if (
					line.toUpperCase().includes('INTEREST CHARGES') ||
					line.toUpperCase().includes('YOUR ACCOUNT MESSAGES') ||
					line.toUpperCase().includes('ACCOUNT SUMMARY') ||
					line.toUpperCase().includes('ACCOUNT ACTIVITY')
				) {
					inShopWithPointsSection = false;
				} else {
					// Skip all lines while in this section
					continue;
				}
			}

			// Only process transaction lines when we're NOT in the SHOP WITH POINTS ACTIVITY section
			// If we have a clear ACCOUNT ACTIVITY section, use it as a boundary
			// Otherwise, process all transaction lines (for backward compatibility with test data)
			if (inShopWithPointsSection) {
				continue;
			}

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

			// Additional check: Skip if this looks like a "SHOP WITH POINTS" transaction
			// These typically have very large amounts that don't match the transaction description
			// and often appear in the SHOP WITH POINTS ACTIVITY section
			if (this.isLikelyShopWithPointsTransaction(merchant, amount, restOfLine)) {
				continue;
			}

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
			for (let index_ = index + 1; index_ < Math.min(index + 5, lines.length); index_++) {
				const nextLine = lines[index_];

				// Check for currency type line (e.g., "POUND STERLING")
				if (this.safeMatchCurrencyLine(nextLine)) {
					foreignCurrencyType = nextLine.trim();
					isForeignTransaction = true;

					// Look for the amount and exchange rate on the next line
					if (index_ + 1 < lines.length) {
						const rateLine = lines[index_ + 1];
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
				if (/^\d{2}\/\d{2}\s+/.test(nextLine) && /\d+\.\d{2}$/.test(nextLine)) {
					break;
				}
			}

			// Check if this is a flight transaction and capture additional flight details
			let flightDetails = null;
			if (this.isFlightTransaction(merchant)) {
				flightDetails = this.extractFlightDetails(lines, index);
			}

			// Check if this is an Amazon charge and capture full statement text
			let fullStatementText = null;
			if (this.isAmazonTransaction(merchant)) {
				fullStatementText = this.extractFullStatementText(lines, index);
			}

			const charge = {
				merchant,
				amount,
				date,
				allocated_to: null,
				is_foreign_currency: isForeignTransaction,
				foreign_currency_amount: foreignCurrencyAmount,
				foreign_currency_type: foreignCurrencyType,
				flight_details: flightDetails,
				full_statement_text: fullStatementText
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
		for (let index = startIndex + 1; index < Math.min(startIndex + 5, lines.length); index++) {
			const line = lines[index];

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
			if (/^\d{2}\/\d{2}\s+/.test(line)) {
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
				'ALASKA',
				'BRITISH AIRWAYS'
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
		const amount2 = amount2WithExtra.match(/^(\d+\.\d+)/)?.[1];

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
	 * Check if a transaction is likely a "SHOP WITH POINTS" transaction
	 * These transactions use points instead of money and often have suspicious amounts
	 * @param {string} merchant - Merchant name
	 * @param {string} amount - Transaction amount
	 * @param {string} fullLine - Full transaction line text
	 * @returns {boolean} - True if it's likely a SHOP WITH POINTS transaction
	 */
	isLikelyShopWithPointsTransaction(merchant, amount, fullLine) {
		// Check for suspicious patterns that indicate SHOP WITH POINTS transactions

		// 1. Check if the line contains the specific AMZN.COM/BILLWA pattern
		// This is a clear indicator of SHOP WITH POINTS transactions
		if (fullLine.includes('AMZN.COM/BILLWA')) {
			return true;
		}

		// 2. Check if the amount is suspiciously large for the merchant description
		// SHOP WITH POINTS transactions often have amounts like $1567.00 for a $15.67 purchase
		if (amount > 1000 && merchant.toLowerCase().includes('amazon')) {
			// Look for patterns that suggest this is a points transaction
			// The amount might be 100x the actual purchase price
			return true;
		}

		// 3. Check if the line contains points-related keywords
		const pointsKeywords = ['points', 'rewards', 'shop with points'];
		const lineLower = fullLine.toLowerCase();
		if (pointsKeywords.some((keyword) => lineLower.includes(keyword))) {
			return true;
		}

		// 4. Check if the merchant name contains suspicious patterns
		// SHOP WITH POINTS transactions often have very generic merchant names
		const suspiciousMerchants = ['amazon.com', 'amazon marketplace', 'amazon mkpl'];

		if (
			suspiciousMerchants.some((suspicious) => merchant.toLowerCase().includes(suspicious)) && // If it's an Amazon transaction with a very large amount, it's likely points
			amount > 500
		) {
			return true;
		}

		return false;
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
			if (/^\d{2}\/\d{2}\s+/.test(nextLine)) {
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
}
