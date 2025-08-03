import { ChaseParser } from './chase-parser.js';

/**
 * Factory for creating appropriate statement parsers
 */
export class ParserFactory {
	constructor() {
		this.parsers = [
			new ChaseParser()
			// Add other parsers here as they're implemented
		];
	}

	/**
	 * Detect the appropriate parser for a given statement
	 * @param {string} text - Text content from PDF
	 * @returns {BaseParser|null} - Appropriate parser or null if none found
	 */
	detectParser(text) {
		for (const parser of this.parsers) {
			if (parser.canParse(text)) {
				console.log(`🔍 Detected parser: ${parser.providerName}`);
				return parser;
			}
		}

		console.warn('⚠️ No parser found for this statement format');
		return null;
	}

	/**
	 * Parse a statement using the appropriate parser
	 * @param {string} text - Text content from PDF
	 * @returns {Object|null} - Parsed statement data or null if no parser found
	 */
	async parseStatement(text) {
		const parser = this.detectParser(text);
		if (!parser) {
			throw new Error('No parser available for this statement format');
		}

		return await parser.parse(text);
	}

	/**
	 * Get list of supported providers
	 * @returns {Array} - Array of supported provider names
	 */
	getSupportedProviders() {
		return this.parsers.map((parser) => parser.providerName);
	}
}
