import { BaseParser } from './base-parser.js';

/**
 * Bilt (Cardless / Column N.A.) credit card statement parser
 */
export class BiltCardlessParser extends BaseParser {
	constructor() {
		super();
		this.providerName = 'Bilt Cardless';
	}

	/**
	 * Check if this parser can handle the given statement
	 * @param {string} text - Text content from PDF
	 * @returns {boolean} - True if this is a Bilt Cardless statement
	 */
	canParse(text) {
		if (!text) return false;

		const textUpper = text.toUpperCase();

		// Check for Cardless / Column N.A. specific Bilt identifiers
		const isBilt = textUpper.includes('BILT');
		const isCardless = textUpper.includes('CARDLESS');
		const isColumn = textUpper.includes('COLUMN N.A.');
		const isPalladium = textUpper.includes('PALLADIUM');

		// This parser is specifically for the newer Bilt cards not issued by Wells Fargo
		return (isBilt && (isCardless || isColumn)) || isPalladium;
	}

	/**
	 * Parse Bilt Cardless statement and extract required information
	 * @param {string} pdfText - Text content from PDF
	 * @returns {Object} - Parsed statement data
	 */
	async parse(pdfText) {
		const last4 = this.extractLast4Digits(pdfText);
		const statementDate = this.extractStatementDate(pdfText);
		const cardName = this.extractCardName(pdfText);
		const charges = this.extractCharges(pdfText);

		const result = {
			last4,
			card_name: cardName,
			statement_date: statementDate,
			charges
		};

		// Validate the parsed data - card_name is a valid identifier if last4 is missing
		if (!this.validateParsedData(result, ['statement_date', 'charges'])) {
			throw new Error('Failed to parse required fields from Bilt Cardless statement');
		}

		// Ensure we have at least one identifier (last4 or card_name)
		if (!result.last4 && !result.card_name) {
			// Fallback: try to find any 4 digit number that might be it
			const accountMatch = /account number:?\s*\d*(\d{4})/i.exec(pdfText);
			if (accountMatch) {
				result.last4 = accountMatch[1];
			} else {
				// If we still have nothing, use a placeholder if we have charges and date
				if (result.statement_date && result.charges.length > 0) {
					result.last4 = '0000';
				}
			}
		}

		return result;
	}

	/**
	 * Extract the card name from the statement
	 * @param {string} text - PDF text content
	 * @returns {string|null} - Card name or null
	 */
	extractCardName(text) {
		if (text.toUpperCase().includes('BILT PALLADIUM CARD')) {
			return 'Bilt Palladium Card';
		}
		if (text.toUpperCase().includes('BILT WORLD ELITE MASTERCARD')) {
			return 'Bilt World Elite Mastercard';
		}
		return null;
	}

	/**
	 * Returns the regex patterns for identifying the last 4 digits of the credit card.
	 * @returns {RegExp[]}
	 */
	getLast4DigitsPatterns() {
		return [
			/Account Number:?\s*(\d{4})/i,
			/Ending in\s*(\d{4})/i,
			/Account #\s*(\d{4})/i
		];
	}

	/**
	 * Returns the regex patterns for identifying the statement date.
	 * @returns {RegExp[]}
	 */
	getStatementDatePatterns() {
		return [
			/New balance as of\s+([A-Z][a-z]+ \d{1,2}, \d{4})/i,
			/([A-Z][a-z]+ \d{1,2})\s*–\s*([A-Z][a-z]+ \d{1,2}, \d{4})/i,
			/Statement Date:?\s*([A-Z][a-z]+ \d{1,2}, \d{4})/i
		];
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

		// Find sections
		let inTransactions = false;
		let inPayments = false;
		let inFees = false;

		// Date pattern like "Feb 7, 2026"
		const datePattern = /^([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})/;

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];
			const lineUpper = line.toUpperCase();

			if (lineUpper === 'TRANSACTIONS') {
				inTransactions = true;
				inPayments = false;
				inFees = false;
				continue;
			}

			if (lineUpper === 'PAYMENTS AND CREDITS') {
				inPayments = true;
				inTransactions = false;
				inFees = false;
				continue;
			}

			if (lineUpper === 'FEES') {
				inFees = true;
				inTransactions = false;
				inPayments = false;
				continue;
			}

			// End of sections
			if (
				lineUpper.startsWith('TOTAL NEW CHARGES') ||
				lineUpper.startsWith('TOTAL PAYMENTS') ||
				lineUpper.startsWith('TOTAL FEES') ||
				lineUpper === 'INTEREST CHARGED'
			) {
				inTransactions = false;
				inPayments = false;
				inFees = false;
				continue;
			}

			if (inTransactions || inPayments || inFees) {
				const dateMatch = datePattern.exec(line);
				if (dateMatch) {
					const monthStr = dateMatch[1];
					const day = dateMatch[2];
					const year = dateMatch[3];

					// Full date in ISO format
					const date = this.parseDate(`${monthStr} ${day}, ${year}`);

					// Description and amount might be on this line or next lines
					let description = line.replace(dateMatch[0], '').trim();
					let amount = null;
					let fullStatementText = line;

					// Check if amount is on the same line
					const amountOnSameLineMatch = /(-?)\$([\d,]+\.\d{2})$/.exec(line);
					if (amountOnSameLineMatch) {
						const isNegative = amountOnSameLineMatch[1] === '-';
						amount = this.parseAmount(amountOnSameLineMatch[2]);
						if (isNegative) amount = -Math.abs(amount);
						description = description.replace(amountOnSameLineMatch[0], '').trim();
					}

					// Look ahead for additional description lines and/or the amount if not found
					let lookAhead = 1;
					let amountFoundInLookahead = false;
					while (lookAhead < 5 && index + lookAhead < lines.length) {
						const nextLine = lines[index + lookAhead];

						// If we hit another date, we went too far
						if (datePattern.test(nextLine)) break;

						// Try to match the amount if we haven't found it yet
						if (amount === null && !amountFoundInLookahead) {
							const amountMatch = /^(-?)\$([\d,]+\.\d{2})$/.exec(nextLine);
							if (amountMatch) {
								const isNegative = amountMatch[1] === '-';
								amount = this.parseAmount(amountMatch[2]);
								if (isNegative) amount = -Math.abs(amount);
								fullStatementText += '\n' + nextLine;
								amountFoundInLookahead = true;
								lookAhead++;
								continue;
							}
						}

						// If this line is an amount that was already found, we should stop
						// This happens if amount was on the first line and we hit the NEXT transaction's amount (which shouldn't happen without a date, but just in case)
						if (amount !== null && /^(-?)\$([\d,]+\.\d{2})$/.test(nextLine)) {
							break;
						}

						// Avoid including section headers or totals from subsequent lines
						const nextLineUpper = nextLine.toUpperCase();
						if (
							nextLineUpper === 'TRANSACTIONS' ||
							nextLineUpper === 'PAYMENTS AND CREDITS' ||
							nextLineUpper === 'FEES' ||
							nextLineUpper.startsWith('TOTAL NEW CHARGES') ||
							nextLineUpper.startsWith('TOTAL PAYMENTS') ||
							nextLineUpper.startsWith('TOTAL FEES') ||
							nextLineUpper === 'INTEREST CHARGED' ||
							nextLineUpper === 'DATE DESCRIPTION AMOUNT'
						) {
							break;
						}

						// Add to description if it's not a page footer
						if (!nextLine.includes('Page') && !nextLine.includes('Cardless Inc.')) {
							description += ' ' + nextLine;
							fullStatementText += '\n' + nextLine;
						}
						lookAhead++;
					}

					// Skip fast-forwarding the outer loop; it only processes lines with datePattern anyway.

					if (date && amount !== null && description.length > 1) {
						// Skip payments in the payments section, but keep refunds (negative amounts in credits)
						if (inPayments && amount > 0) continue; // Positive in payments section is likely a payment

						const charge = {
							merchant: description.trim(),
							amount: amount, // Use raw amount (negative for credits)
							date,
							allocated_to: null,
							is_foreign_currency: false,
							foreign_currency_amount: null,
							foreign_currency_type: null,
							full_statement_text: fullStatementText
						};

						// Check for foreign currency in description or next lines
						if (
							description.includes('FRA') ||
							description.includes('GBR') ||
							description.includes('NLD')
						) {
							charge.is_foreign_currency = true;
						}

						charges.push(charge);
					}
				}
			}
		}

		return charges;
	}
}
