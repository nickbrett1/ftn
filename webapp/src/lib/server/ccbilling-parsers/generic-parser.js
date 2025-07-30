import { BaseStatementParser } from './base-parser.js';
import { LlamaService } from '../ccbilling-llama-service.js';

/**
 * Generic parser for statements that don't match specific bank formats
 * Uses Llama API to parse the statement content
 */
export class GenericStatementParser extends BaseStatementParser {
	constructor(llamaService = null) {
		super();
		this.providerName = 'Generic';
		this.supportedFormats = ['Generic Credit Card Statement'];
		this.llamaService = llamaService || new LlamaService();
	}

	/**
	 * Detect if this is a generic statement (fallback for unrecognized formats)
	 * @param {string} text - The extracted text from the PDF
	 * @returns {boolean} - True if this is a generic statement
	 */
	canParse(text) {
		// This parser should be used as a fallback when no other parser matches
		// We'll return true for any text that looks like it might contain transactions
		const hasTransactionIndicators =
			/\d+\.\d{2}/.test(text) || // Has dollar amounts
			/\$\d+/.test(text) || // Has dollar signs
			/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text) || // Has dates
			/\d{4}-\d{2}-\d{2}/.test(text); // Has ISO dates

		return hasTransactionIndicators;
	}

	/**
	 * Parse generic statement using Llama API
	 * @param {string} text - The extracted text from the PDF
	 * @returns {Promise<Array>} - Array of charge objects
	 */
	async parse(text) {
		try {
			// Use Llama API to parse the statement
			const charges = await this.llamaService.parseStatement(text);
			return this.filterCharges(
				charges.map((charge) => this.validateCharge(charge)).filter(Boolean)
			);
		} catch (error) {
			console.error('Llama API parsing failed:', error);
			throw new Error(`Llama API parsing failed: ${error.message}`);
		}
	}

	/**
	 * Extract billing cycle information (minimal implementation)
	 * @param {string} text - Full statement text
	 * @returns {Object} - Billing cycle information
	 */
	extractBillingCycle(text) {
		// Try to extract billing cycle from text
		const billingCycleMatch = text.match(
			/(?:billing|statement)\s+(?:period|cycle|date)[:\s]*([^.\n]+)/i
		);
		if (billingCycleMatch) {
			return {
				period: billingCycleMatch[1].trim(),
				startDate: null,
				endDate: null
			};
		}

		return {
			period: 'Unknown',
			startDate: null,
			endDate: null
		};
	}

	/**
	 * Extract card information (minimal implementation)
	 * @param {string} text - Full statement text
	 * @returns {Object} - Card information
	 */
	extractCardInfo(text) {
		// Try to extract card number (last 4 digits)
		const cardMatch = text.match(/(?:card|account)\s+(?:number|#)[:\s]*\*{0,4}(\d{4})/i);
		if (cardMatch) {
			return {
				last4: cardMatch[1],
				type: 'Unknown',
				provider: 'Unknown'
			};
		}

		return {
			last4: null,
			type: 'Unknown',
			provider: 'Unknown'
		};
	}
}
