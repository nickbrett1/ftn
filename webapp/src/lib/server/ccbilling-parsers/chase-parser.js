import { BaseStatementParser } from './base-parser.js';

/**
 * Parser for Chase Bank credit card statements
 */
export class ChaseStatementParser extends BaseStatementParser {
	constructor() {
		super();
		this.providerName = 'Chase Bank';
		this.supportedFormats = ['Chase Credit Card Statement'];
	}

	/**
	 * Detect if this is a Chase statement
	 * @param {string} text - The extracted text from the PDF
	 * @returns {boolean} - True if this is a Chase statement
	 */
	canParse(text) {
		const chaseIndicators = [
			'CHASE',
			'JPMORGAN CHASE',
			'CHASE BANK',
			'CHASE CREDIT CARD',
			'CHASE CARD SERVICES',
			'CHASE CREDIT CARD STATEMENT'
		];

		const upperText = text.toUpperCase();
		return chaseIndicators.some((indicator) => upperText.includes(indicator));
	}

	/**
	 * Parse Chase statement and extract charges
	 * @param {string} text - The extracted text from the PDF
	 * @returns {Array} - Array of charge objects
	 */
	parse(text) {
		const charges = [];

		// Extract the transactions section
		const transactionSection = this.extractTransactionSection(text);
		if (!transactionSection) {
			console.warn('No transaction section found in Chase statement');
			return charges;
		}

		// Parse individual transactions
		const lines = this.splitIntoLines(transactionSection);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Skip header lines and empty lines
			if (this.isHeaderLine(line) || line.trim().length === 0) {
				continue;
			}

			// Try to parse the line as a transaction
			const charge = this.parseTransactionLine(line, lines, i);
			if (charge) {
				charges.push(charge);
			}
		}

		// Filter out payment credits and validate charges
		return this.filterCharges(charges.map((charge) => this.validateCharge(charge)).filter(Boolean));
	}

	/**
	 * Extract the transaction section from the statement
	 * @param {string} text - Full statement text
	 * @returns {string} - Transaction section text
	 */
	extractTransactionSection(text) {
		// Look for common Chase transaction section headers
		const sectionPatterns = [
			/(?:PURCHASES|TRANSACTIONS|CHARGES).*?(?=PAYMENTS|CREDITS|SUMMARY|TOTAL|$)/is,
			/(?:PURCHASES AND ADJUSTMENTS).*?(?=PAYMENTS AND CREDITS|SUMMARY|TOTAL|$)/is,
			/(?:PURCHASES).*?(?=PAYMENTS|CREDITS|SUMMARY|TOTAL|$)/is,
			/(?:TRANSACTIONS).*?(?=PAYMENTS|CREDITS|SUMMARY|TOTAL|$)/is
		];

		return this.extractSection(text, sectionPatterns);
	}

	/**
	 * Check if a line is a header line that should be skipped
	 * @param {string} line - Line to check
	 * @returns {boolean} - True if it's a header line
	 */
	isHeaderLine(line) {
		const headerKeywords = [
			'PURCHASES',
			'TRANSACTIONS',
			'CHARGES',
			'DATE',
			'DESCRIPTION',
			'AMOUNT',
			'POST DATE',
			'TRANS DATE',
			'REFERENCE',
			'BALANCE',
			'---',
			'==='
		];

		const upperLine = line.toUpperCase();
		return headerKeywords.some((keyword) => upperLine.includes(keyword));
	}

	/**
	 * Parse a single transaction line
	 * @param {string} line - Current line
	 * @param {Array} allLines - All lines in the section
	 * @param {number} currentIndex - Current line index
	 * @returns {Object|null} - Parsed charge object or null
	 */
	parseTransactionLine(line, allLines, currentIndex) {
		// Chase transaction format is typically:
		// MM/DD/YYYY  MERCHANT NAME                    $XX.XX
		// or
		// MM/DD/YYYY  MM/DD/YYYY  MERCHANT NAME       $XX.XX

		// Try different patterns for Chase transaction lines
		const patterns = [
			// Pattern 1: DATE MERCHANT AMOUNT
			/^(\d{1,2}\/\d{1,2}\/\d{4})\s+([^$]+?)\s+(\$[\d,]+\.\d{2})$/,
			// Pattern 2: DATE DATE MERCHANT AMOUNT (post date and transaction date)
			/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+([^$]+?)\s+(\$[\d,]+\.\d{2})$/,
			// Pattern 3: DATE MERCHANT (multi-line merchant name)
			/^(\d{1,2}\/\d{1,2}\/\d{4})\s+([^$]+?)\s+(\$[\d,]+\.\d{2})/,
			// Pattern 4: MERCHANT AMOUNT (date on previous line)
			/^([^$]+?)\s+(\$[\d,]+\.\d{2})$/,
			// Pattern 5: DATE MERCHANT (amount on next line)
			/^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+)$/
		];

		for (const pattern of patterns) {
			const match = line.match(pattern);
			if (match) {
				return this.buildChargeFromMatch(match, line, allLines, currentIndex);
			}
		}

		// If no pattern matches, try to extract date and amount separately
		return this.parseUnstructuredLine(line, allLines, currentIndex);
	}

	/**
	 * Build a charge object from a regex match
	 * @param {Array} match - Regex match groups
	 * @param {string} line - Original line
	 * @param {Array} allLines - All lines
	 * @param {number} currentIndex - Current line index
	 * @returns {Object|null} - Charge object or null
	 */
	buildChargeFromMatch(match, line, allLines, currentIndex) {
		let date, merchant, amount;

		if (match.length === 4) {
			// Pattern 1: DATE MERCHANT AMOUNT
			[, date, merchant, amount] = match;
		} else if (match.length === 5) {
			// Pattern 2: DATE DATE MERCHANT AMOUNT (use transaction date)
			[, , date, merchant, amount] = match;
		} else if (match.length === 4 && match[1].includes('$')) {
			// Pattern 4: MERCHANT AMOUNT (no date in this line)
			[, merchant, amount] = match;
			// Try to get date from previous line
			if (currentIndex > 0) {
				const prevLine = allLines[currentIndex - 1];
				const dateMatch = prevLine.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/);
				if (dateMatch) {
					date = dateMatch[1];
				}
			}
		} else if (match.length === 3 && match[1].includes('$')) {
			// Pattern 4: MERCHANT AMOUNT
			[, merchant, amount] = match;
		} else if (match.length === 3) {
			// Pattern 5: DATE MERCHANT (amount on next line)
			[, date, merchant] = match;
			// Try to get amount from next line
			if (currentIndex < allLines.length - 1) {
				const nextLine = allLines[currentIndex + 1];
				const amountMatch = nextLine.match(/(\$[\d,]+\.\d{2})/);
				if (amountMatch) {
					amount = amountMatch[1];
				}
			}
		}

		if (date && merchant && amount) {
			const parsedAmount = this.extractAmount(amount);
			if (parsedAmount !== null) {
				return {
					merchant: merchant.trim(),
					amount: parsedAmount,
					date: this.parseDate(date)
				};
			}
		}

		return null;
	}

	/**
	 * Parse a line that doesn't match standard patterns
	 * @param {string} line - Line to parse
	 * @param {Array} allLines - All lines
	 * @param {number} currentIndex - Current line index
	 * @returns {Object|null} - Charge object or null
	 */
	parseUnstructuredLine(line, allLines, currentIndex) {
		// Look for date and amount patterns in the line
		const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
		const amountMatch = line.match(/(\$[\d,]+\.\d{2})/);

		if (dateMatch && amountMatch) {
			const date = dateMatch[1];
			const amount = amountMatch[1];

			// Extract merchant name (everything between date and amount)
			const dateIndex = line.indexOf(date);
			const amountIndex = line.indexOf(amount);

			if (dateIndex < amountIndex) {
				const merchant = line.substring(dateIndex + date.length, amountIndex).trim();
				const parsedAmount = this.extractAmount(amount);

				if (merchant && parsedAmount !== null) {
					return {
						merchant: merchant,
						amount: parsedAmount,
						date: this.parseDate(date)
					};
				}
			}
		}

		return null;
	}

	/**
	 * Extract billing cycle dates from Chase statement
	 * @param {string} text - Full statement text
	 * @returns {Object} - Object with startDate and endDate
	 */
	extractBillingCycle(text) {
		// Look for billing cycle patterns in Chase statements
		const cyclePatterns = [
			/BILLING CYCLE[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/STATEMENT PERIOD[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
			/CLOSING DATE[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i
		];

		for (const pattern of cyclePatterns) {
			const match = text.match(pattern);
			if (match) {
				if (match.length === 3) {
					// Start and end dates
					return {
						startDate: this.parseDate(match[1]),
						endDate: this.parseDate(match[2])
					};
				} else if (match.length === 2) {
					// Only closing date, estimate start date (30 days earlier)
					const endDate = this.parseDate(match[1]);
					if (endDate) {
						const end = new Date(endDate);
						const start = new Date(end);
						start.setDate(start.getDate() - 30);
						return {
							startDate: start.toISOString().split('T')[0],
							endDate: endDate
						};
					}
				}
			}
		}

		return { startDate: null, endDate: null };
	}

	/**
	 * Extract credit card information from Chase statement
	 * @param {string} text - Full statement text
	 * @returns {Object} - Object with card information
	 */
	extractCardInfo(text) {
		// Look for card number patterns (last 4 digits)
		const cardPatterns = [
			/CARD ENDING IN (\d{4})/i,
			/ACCOUNT ENDING (\d{4})/i,
			/CARD #\s*\*+\s*(\d{4})/i,
			/ACCOUNT #\s*\*+\s*(\d{4})/i
		];

		for (const pattern of cardPatterns) {
			const match = text.match(pattern);
			if (match) {
				return {
					last4: match[1],
					cardName: `Chase Card ending in ${match[1]}`,
					provider: 'Chase Bank'
				};
			}
		}

		return {
			last4: null,
			cardName: 'Chase Credit Card',
			provider: 'Chase Bank'
		};
	}
}
