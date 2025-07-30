import { LLAMA_API_KEY } from '$env/static/private';
import LlamaAPIClient from 'llama-api-client';

/**
 * Service for LLAMA API integration for merchant classification
 */
export class LlamaService {
	constructor() {
		this.apiKey = LLAMA_API_KEY || process.env.LLAMA_API_KEY;

		if (!this.apiKey) {
			throw new Error('LLAMA_API_KEY not found in environment variables');
		}

		this.client = new LlamaAPIClient({
			apiKey: this.apiKey,
			timeout: 30000, // 30 seconds timeout for classification
			logLevel: 'warn'
		});
	}

	/**
	 * Parse a credit card statement using Llama API
	 * @param {string} statementText - The extracted text from the PDF
	 * @returns {Promise<Array>} - Array of charge objects
	 */
	async parseStatement(statementText) {
		if (!statementText || typeof statementText !== 'string') {
			throw new Error('Invalid statement text provided');
		}

		const prompt = `Parse the following credit card statement and extract all charges. 

Statement text:
${statementText}

Please provide a JSON array of charge objects with the following structure:
[
  {
    "merchant": "Merchant name",
    "amount": 123.45,
    "date": "YYYY-MM-DD"
  }
]

Return ONLY the JSON array, no additional text or formatting. If no charges are found, return an empty array [].`;

		try {
			const response = await this.client.chat.completions.create({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful assistant that parses credit card statements and extracts charge information. Always return only valid JSON arrays without any markdown formatting or code blocks.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.1,
				max_tokens: 2000
			});

			const content = response.completion_message?.content?.text;
			if (!content) {
				throw new Error('No content received from Llama API');
			}

			// Clean up the content
			let cleanContent = content.trim();
			if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(7, -3).trim();
			} else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(3, -3).trim();
			}

			// Parse the JSON response
			const charges = JSON.parse(cleanContent);

			// Validate that it's an array
			if (!Array.isArray(charges)) {
				throw new Error('Llama API did not return a valid array');
			}

			// Validate and clean up each charge
			return charges
				.map((charge, index) => {
					if (!charge || typeof charge !== 'object') {
						console.warn(`Invalid charge object at index ${index}:`, charge);
						return null;
					}

					return {
						merchant: charge.merchant || 'Unknown Merchant',
						amount: parseFloat(charge.amount) || 0,
						date: charge.date || null,
						allocated_to: charge.allocated_to || 'Both'
					};
				})
				.filter(Boolean); // Remove null entries
		} catch (error) {
			console.error('Llama API parsing failed:', error);
			throw new Error(`Llama API parsing failed: ${error.message}`);
		}
	}

	/**
	 * Classify a merchant and provide additional information
	 * @param {string} merchantName - The merchant name to classify
	 * @returns {Promise<Object>} - Classification result
	 */
	async classifyMerchant(merchantName) {
		if (!merchantName || typeof merchantName !== 'string') {
			return {
				category: 'Unknown',
				subcategory: 'Unknown',
				website: null,
				description: null,
				confidence: 0
			};
		}

		const prompt = `Classify the following merchant and provide additional information:

Merchant: ${merchantName}

Please provide a JSON response with the following structure:
{
  "category": "The main category (e.g., Retail, Dining, Transportation, Entertainment, Healthcare, etc.)",
  "subcategory": "A more specific subcategory (e.g., Grocery Store, Fast Food, Gas Station, etc.)",
  "website": "The merchant's website URL if known, or null",
  "description": "A brief description of what this merchant does, or null if unknown",
  "confidence": "A number between 0 and 1 indicating confidence in the classification"
}

Return ONLY the JSON object, no additional text or formatting.`;

		try {
			const response = await this.client.chat.completions.create({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content:
							'You are a helpful assistant that classifies merchants and provides additional information. Always return only valid JSON without any markdown formatting or code blocks.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.1,
				max_tokens: 500
			});

			const content = response.completion_message?.content?.text;
			if (!content) {
				throw new Error('No content received from Llama API');
			}

			// Clean up the content
			let cleanContent = content.trim();
			if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(7, -3).trim();
			} else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(3, -3).trim();
			}

			// Parse the JSON response
			const classification = JSON.parse(cleanContent);

			// Validate and provide defaults
			return {
				category: classification.category || 'Unknown',
				subcategory: classification.subcategory || 'Unknown',
				website: classification.website || null,
				description: classification.description || null,
				confidence: Math.max(0, Math.min(1, parseFloat(classification.confidence) || 0))
			};
		} catch (error) {
			console.error('Llama API classification failed:', error);

			// Return default classification on error
			return {
				category: 'Unknown',
				subcategory: 'Unknown',
				website: null,
				description: null,
				confidence: 0
			};
		}
	}

	/**
	 * Classify multiple merchants in batch
	 * @param {Array<string>} merchantNames - Array of merchant names to classify
	 * @returns {Promise<Array>} - Array of classification results
	 */
	async classifyMerchants(merchantNames) {
		if (!Array.isArray(merchantNames) || merchantNames.length === 0) {
			return [];
		}

		const classifications = [];

		// Process merchants one by one to avoid rate limits and ensure reliability
		for (const merchantName of merchantNames) {
			try {
				const classification = await this.classifyMerchant(merchantName);
				classifications.push({
					merchant: merchantName,
					...classification
				});
			} catch (error) {
				console.error(`Failed to classify merchant "${merchantName}":`, error);
				classifications.push({
					merchant: merchantName,
					category: 'Unknown',
					subcategory: 'Unknown',
					website: null,
					description: null,
					confidence: 0
				});
			}

			// Add a small delay between requests to be respectful to the API
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		return classifications;
	}

	/**
	 * Get merchant insights and suggestions
	 * @param {Array<Object>} charges - Array of charge objects
	 * @returns {Promise<Object>} - Insights and suggestions
	 */
	async getMerchantInsights(charges) {
		if (!Array.isArray(charges) || charges.length === 0) {
			return {
				topCategories: [],
				spendingPatterns: [],
				suggestions: []
			};
		}

		// Extract unique merchants
		const uniqueMerchants = [...new Set(charges.map((charge) => charge.merchant))];

		// Classify all merchants
		const classifications = await this.classifyMerchants(uniqueMerchants);

		// Create a map for quick lookup
		const merchantClassifications = {};
		classifications.forEach((classification) => {
			merchantClassifications[classification.merchant] = classification;
		});

		// Analyze spending patterns
		const categoryTotals = {};
		const subcategoryTotals = {};

		charges.forEach((charge) => {
			const classification = merchantClassifications[charge.merchant];
			if (classification) {
				const category = classification.category;
				const subcategory = classification.subcategory;

				categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(charge.amount);
				subcategoryTotals[subcategory] =
					(subcategoryTotals[subcategory] || 0) + Math.abs(charge.amount);
			}
		});

		// Get top categories
		const topCategories = Object.entries(categoryTotals)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([category, total]) => ({ category, total }));

		// Get top subcategories
		const topSubcategories = Object.entries(subcategoryTotals)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5)
			.map(([subcategory, total]) => ({ subcategory, total }));

		// Generate suggestions based on spending patterns
		const suggestions = this.generateSuggestions(topCategories, topSubcategories, charges);

		return {
			topCategories,
			topSubcategories,
			suggestions,
			merchantClassifications
		};
	}

	/**
	 * Generate spending suggestions based on patterns
	 * @param {Array} topCategories - Top spending categories
	 * @param {Array} topSubcategories - Top spending subcategories
	 * @param {Array} charges - All charges
	 * @returns {Array} - Array of suggestions
	 */
	generateSuggestions(topCategories, topSubcategories, charges) {
		const suggestions = [];
		const totalSpending = charges.reduce((sum, charge) => sum + Math.abs(charge.amount), 0);

		// Analyze high spending categories
		if (topCategories.length > 0) {
			const topCategory = topCategories[0];
			const percentage = (topCategory.total / totalSpending) * 100;

			if (percentage > 30) {
				suggestions.push({
					type: 'high_spending',
					category: topCategory.category,
					percentage: Math.round(percentage),
					message: `${topCategory.category} represents ${Math.round(percentage)}% of your spending. Consider setting a budget for this category.`
				});
			}
		}

		// Look for potential budget opportunities
		const diningCategories = ['Dining', 'Restaurant', 'Fast Food'];
		const diningSpending = topCategories
			.filter((cat) => diningCategories.includes(cat.category))
			.reduce((sum, cat) => sum + cat.total, 0);

		if (diningSpending > 0) {
			const diningPercentage = (diningSpending / totalSpending) * 100;
			if (diningPercentage > 20) {
				suggestions.push({
					type: 'dining_insight',
					percentage: Math.round(diningPercentage),
					message: `Dining represents ${Math.round(diningPercentage)}% of your spending. Consider meal planning to reduce costs.`
				});
			}
		}

		return suggestions;
	}
}
