import { ChaseStatementParser } from './chase-parser.js';

/**
 * Manager for handling different credit card statement parsers
 */
export class StatementParserManager {
	constructor() {
		this.parsers = [
			new ChaseStatementParser()
			// Add other parsers here as they are implemented
			// new AmexStatementParser(),
			// new CitiStatementParser(),
			// new CapitalOneStatementParser(),
			// new DiscoverStatementParser(),
		];
	}

	/**
	 * Find the appropriate parser for a given statement text
	 * @param {string} text - The extracted text from the PDF
	 * @returns {BaseStatementParser|null} - The appropriate parser or null if none found
	 */
	findParser(text) {
		for (const parser of this.parsers) {
			if (parser.canParse(text)) {
				return parser;
			}
		}
		return null;
	}

	/**
	 * Parse a statement using the appropriate parser
	 * @param {string} text - The extracted text from the PDF
	 * @returns {Object} - Object with charges, billingCycle, cardInfo, and parser info
	 */
	parseStatement(text) {
		const parser = this.findParser(text);

		if (!parser) {
			throw new Error('No suitable parser found for this statement format');
		}

		try {
			const charges = parser.parse(text);
			const billingCycle = parser.extractBillingCycle(text);
			const cardInfo = parser.extractCardInfo(text);

			return {
				charges,
				billingCycle,
				cardInfo,
				parser: {
					name: parser.providerName,
					supportedFormats: parser.supportedFormats
				}
			};
		} catch (error) {
			throw new Error(
				`Failed to parse statement with ${parser.providerName} parser: ${error.message}`
			);
		}
	}

	/**
	 * Get a list of supported providers
	 * @returns {Array} - Array of supported provider names
	 */
	getSupportedProviders() {
		return this.parsers.map((parser) => parser.providerName);
	}

	/**
	 * Get parser statistics
	 * @returns {Object} - Object with parser information
	 */
	getParserStats() {
		return {
			totalParsers: this.parsers.length,
			supportedProviders: this.getSupportedProviders(),
			parsers: this.parsers.map((parser) => ({
				name: parser.providerName,
				formats: parser.supportedFormats
			}))
		};
	}
}
