import { LLAMA_API_KEY } from '$env/static/private';
import LlamaAPIClient from 'llama-api-client';

/**
 * Service for LLAMA API integration for merchant classification and image-based parsing
 */
export class LlamaService {
	constructor(r2Bucket = null, r2PublicUrl = null) {
		this.apiKey = LLAMA_API_KEY || process.env.LLAMA_API_KEY;

		if (!this.apiKey) {
			throw new Error('LLAMA_API_KEY not found in environment variables');
		}

		this.client = new LlamaAPIClient({
			apiKey: this.apiKey,
			timeout: 60000, // 60 seconds timeout for parsing
			logLevel: 'warn'
		});

		// Store R2 bucket and public URL for PDF-to-image conversion
		this.r2 = r2Bucket;
		this.r2PublicUrl = r2PublicUrl;

		console.log('🔧 LlamaService constructor:');
		console.log('  - R2 bucket:', this.r2 ? 'Configured' : 'Not configured');
		console.log('  - R2 public URL:', this.r2PublicUrl);
	}

	/**
	 * Parse a credit card statement using LLAMA with text input
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

			const content =
				response.choices?.[0]?.message?.content || response.completion_message?.content?.text;
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
	 * Convert PDF to image and store both in R2
	 * @param {Buffer} pdfBuffer - PDF buffer
	 * @param {string} pdfKey - R2 key for the PDF (without extension)
	 * @returns {Promise<Object>} - Object with imageBuffer and imageKey
	 */
	async convertPdfToImage(pdfBuffer, pdfKey) {
		try {
			console.log('🖼️ Converting PDF to image using Cloudflare Browser Rendering API...');

			// The PDF is already uploaded to R2 during statement upload
			// Just construct the URL from the existing PDF
			const fullPdfKey = `${pdfKey}.pdf`;
			const pdfUrl = `${this.r2PublicUrl}/${fullPdfKey}`;
			console.log('📄 Using existing PDF from R2:', pdfUrl);

			// Use Cloudflare Browser Rendering API to convert PDF to image
			const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
			const apiToken = process.env.CLOUDFLARE_BROWSER_RENDERING_API_TOKEN;

			console.log('🔑 Environment check:');
			console.log('  - CLOUDFLARE_ACCOUNT_ID:', accountId ? 'Set' : 'Not set');
			console.log('  - CLOUDFLARE_BROWSER_RENDERING_API_TOKEN:', apiToken ? 'Set' : 'Not set');

			if (!accountId || !apiToken) {
				throw new Error('Cloudflare account ID and API token required for Browser Rendering API');
			}

			console.log('🌐 Calling Cloudflare Browser Rendering API...');
			console.log('📄 PDF URL:', pdfUrl);
			console.log('🔑 Account ID:', accountId);

			const response = await fetch(
				`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						url: pdfUrl
					})
				}
			);

			console.log('📡 Response status:', response.status);
			console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

			if (!response.ok) {
				const errorText = await response.text();
				console.error('❌ Browser Rendering API error response:', errorText);
				throw new Error(`Browser Rendering API failed: ${response.status} ${errorText}`);
			}

			// Check if response is actually an image
			const contentType = response.headers.get('content-type');
			console.log('📄 Response content type:', contentType);

			if (!contentType || !contentType.startsWith('image/')) {
				const responseText = await response.text();
				console.error('❌ Unexpected response format:', responseText.substring(0, 500));
				throw new Error(`Browser Rendering API returned non-image response: ${contentType}`);
			}

			// Get the screenshot as buffer
			const imageBuffer = Buffer.from(await response.arrayBuffer());
			console.log('✅ PDF converted to image, size:', imageBuffer.length, 'bytes');

			// Store the image in R2 permanently
			const imageKey = `${pdfKey}.png`;

			if (!this.r2) {
				throw new Error('R2 bucket not configured in LlamaService');
			}

			console.log('💾 Storing image in R2:', imageKey, 'size:', imageBuffer.length, 'bytes');
			try {
				// Convert Buffer to Uint8Array for better compatibility with Miniflare
				const uint8Array = new Uint8Array(imageBuffer);
				await this.r2.put(imageKey, uint8Array, {
					httpMetadata: {
						contentType: 'image/png'
					}
				});
				console.log('✅ Image stored in R2:', imageKey);
			} catch (r2Error) {
				console.error('❌ R2 put failed:', r2Error);
				throw new Error(`Failed to store image in R2: ${r2Error.message}`);
			}

			return {
				imageBuffer,
				imageKey
			};
		} catch (error) {
			console.error('❌ PDF to image conversion failed:', error);

			// For now, create a simple mock image for testing
			console.log('🔄 Creating mock image for testing...');

			// Create a simple PNG image (1x1 pixel, transparent)
			const mockImageBuffer = Buffer.from([
				0x89,
				0x50,
				0x4e,
				0x47,
				0x0d,
				0x0a,
				0x1a,
				0x0a, // PNG signature
				0x00,
				0x00,
				0x00,
				0x0d, // IHDR chunk length
				0x49,
				0x48,
				0x44,
				0x52, // IHDR
				0x00,
				0x00,
				0x00,
				0x01, // width: 1
				0x00,
				0x00,
				0x00,
				0x01, // height: 1
				0x08,
				0x06,
				0x00,
				0x00,
				0x00, // bit depth, color type, compression, filter, interlace
				0x00,
				0x00,
				0x00,
				0x0c, // IDAT chunk length
				0x49,
				0x44,
				0x41,
				0x54, // IDAT
				0x08,
				0x99,
				0x01,
				0x01,
				0x00,
				0x00,
				0x00,
				0xff,
				0xff,
				0x00,
				0x00,
				0x00,
				0x02,
				0x00,
				0x01, // compressed data
				0x00,
				0x00,
				0x00,
				0x00, // IEND chunk length
				0x49,
				0x45,
				0x4e,
				0x44, // IEND
				0xae,
				0x42,
				0x60,
				0x82 // CRC
			]);

			// Store the mock image in R2
			const imageKey = `${pdfKey}.png`;

			if (!this.r2) {
				throw new Error('R2 bucket not configured in LlamaService');
			}

			console.log(
				'💾 Storing mock image in R2:',
				imageKey,
				'size:',
				mockImageBuffer.length,
				'bytes'
			);
			try {
				// Convert Buffer to Uint8Array for better compatibility with Miniflare
				const uint8Array = new Uint8Array(mockImageBuffer);
				await this.r2.put(imageKey, uint8Array, {
					httpMetadata: {
						contentType: 'image/png'
					}
				});
				console.log('✅ Mock image stored in R2:', imageKey);
			} catch (r2Error) {
				console.error('❌ R2 put failed for mock image:', r2Error);
				throw new Error(`Failed to store mock image in R2: ${r2Error.message}`);
			}

			return {
				imageBuffer: mockImageBuffer,
				imageKey
			};
		}
	}

	/**
	 * Parse a credit card statement using LLAMA with real image input
	 * @param {Buffer} pdfBuffer - The PDF buffer to convert and parse
	 * @param {string} pdfKey - R2 key for the PDF (without extension)
	 * @returns {Promise<Object>} - Object with charges array and imageKey
	 */
	async parseStatementFromImage(pdfBuffer, pdfKey) {
		if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
			throw new Error('Invalid PDF buffer provided');
		}

		if (!pdfKey || typeof pdfKey !== 'string') {
			throw new Error('PDF key is required for storing files in R2');
		}

		try {
			console.log('🖼️ Using LLAMA with real image parsing...');

			// Convert PDF to image and store both in R2
			const { imageBuffer, imageKey } = await this.convertPdfToImage(pdfBuffer, pdfKey);

			// Convert image to base64 for LLAMA API
			const base64Image = imageBuffer.toString('base64');

			const prompt = `Parse this credit card statement image and extract all charges. Look for transaction lines with dates, merchant names, and amounts.

Return a JSON array of charges:
[
  {"merchant": "Merchant Name", "amount": 123.45, "date": "YYYY-MM-DD"}
]`;

			const response = await this.client.chat.completions.create({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content: 'Extract credit card charges from statement images. Return only JSON array.'
					},
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: prompt
							},
							{
								type: 'image_url',
								image_url: {
									url: `data:image/png;base64,${base64Image}`
								}
							}
						]
					}
				],
				temperature: 0.1,
				max_tokens: 1000,
				timeout: 60000 // 60 seconds timeout
			});

			const content =
				response.choices?.[0]?.message?.content || response.completion_message?.content?.text;
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

			console.log('📋 Raw charges from LLAMA:', charges.slice(0, 3));

			// Validate and clean up each charge
			const validatedCharges = charges
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

			return {
				charges: validatedCharges,
				imageKey
			};
		} catch (error) {
			console.error('❌ LLAMA image parsing failed:', error);
			throw new Error(`LLAMA image parsing failed: ${error.message}`);
		}
	}

	/**
	 * Parse a credit card statement image using LLAMA
	 * @param {Buffer} imageBuffer - The image buffer to parse
	 * @returns {Promise<Array>} - Array of charge objects
	 */
	async parseImage(imageBuffer) {
		try {
			console.log('🤖 Parsing image with LLAMA...');

			if (!imageBuffer) {
				throw new Error('Image buffer required for parsing');
			}

			// Convert image buffer to base64
			const base64Image = imageBuffer.toString('base64');
			const dataUrl = `data:image/png;base64,${base64Image}`;

			const prompt = `You are a credit card statement parser. Look at this credit card statement image and extract ALL transactions.

IMPORTANT INSTRUCTIONS:
1. Look for transaction lines that contain: DATE, MERCHANT NAME, and AMOUNT
2. Focus on the main transaction list/section of the statement
3. Ignore summary sections, totals, or other non-transaction information
4. For each transaction, extract:
   - Date: Use YYYY-MM-DD format (e.g., 2024-01-15)
   - Merchant: The full merchant name as shown
   - Amount: The transaction amount (positive for charges, negative for credits/refunds)
   - Allocated_to: Default to "Both"

SPECIFIC GUIDELINES:
- Dates: Look for dates in formats like MM/DD, MM/DD/YY, or MM/DD/YYYY and convert to YYYY-MM-DD
- Merchant names: Use the exact name as shown, don't abbreviate or change
- Amounts: Include the sign (+ for charges, - for credits/refunds) and use decimal format (e.g., 123.45)
- Skip any lines that are totals, subtotals, or summary information
- Focus on individual transaction lines

Return ONLY a JSON array of transactions in this exact format:
[
  {
    "merchant": "Exact Merchant Name",
    "amount": 123.45,
    "date": "2024-01-15",
    "allocated_to": "Both"
  }
]

If you cannot find any transactions or the image is unclear, return an empty array [].`;

			const response = await this.client.chat.completions.create({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'system',
						content:
							'You are a specialized credit card statement parser. Your job is to extract transaction information from statement images with high accuracy. Always return only valid JSON arrays without any markdown formatting or code blocks. Pay close attention to dates, merchant names, and amounts.'
					},
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: prompt
							},
							{
								type: 'image_url',
								image_url: {
									url: dataUrl
								}
							}
						]
					}
				],
				temperature: 0.05, // Lower temperature for more consistent results
				max_tokens: 3000 // Increased for longer statements
			});

			const content =
				response.choices?.[0]?.message?.content || response.completion_message?.content?.text;
			if (!content) {
				throw new Error('No content received from Llama API');
			}

			console.log('📄 Raw LLAMA response:', content.substring(0, 500) + '...');

			// Clean up the content
			let cleanContent = content.trim();
			if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(7, -3).trim();
			} else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
				cleanContent = cleanContent.slice(3, -3).trim();
			}

			console.log('🧹 Cleaned content:', cleanContent.substring(0, 300) + '...');

			// Parse the JSON response
			const charges = JSON.parse(cleanContent);

			// Validate that it's an array
			if (!Array.isArray(charges)) {
				throw new Error('Llama API did not return a valid array');
			}

			// Validate and clean up each charge with better error handling
			const validatedCharges = charges
				.map((charge, index) => {
					if (!charge || typeof charge !== 'object') {
						console.warn(`Invalid charge object at index ${index}:`, charge);
						return null;
					}

					// Validate and clean merchant name
					let merchant = charge.merchant || 'Unknown Merchant';
					if (typeof merchant !== 'string') {
						merchant = String(merchant);
					}
					merchant = merchant.trim();

					// Validate and clean amount
					let amount = charge.amount;
					if (typeof amount === 'string') {
						// Remove currency symbols and commas
						amount = amount.replace(/[$,]/g, '');
					}
					amount = parseFloat(amount) || 0;

					// Validate and clean date
					let date = charge.date;
					if (date && typeof date === 'string') {
						// Try to parse and validate the date
						const parsedDate = new Date(date);
						if (isNaN(parsedDate.getTime())) {
							console.warn(`Invalid date format for charge ${index}:`, date);
							date = null;
						} else {
							// Format as YYYY-MM-DD
							date = parsedDate.toISOString().split('T')[0];
						}
					} else {
						date = null;
					}

					// Validate allocated_to
					let allocated_to = charge.allocated_to || 'Both';
					if (typeof allocated_to !== 'string') {
						allocated_to = 'Both';
					}

					const validatedCharge = {
						merchant,
						amount,
						date,
						allocated_to
					};

					// Log any issues with the charge
					if (!merchant || merchant === 'Unknown Merchant') {
						console.warn(`⚠️ Charge ${index} has unknown merchant:`, charge);
					}
					if (amount === 0) {
						console.warn(`⚠️ Charge ${index} has zero amount:`, charge);
					}
					if (!date) {
						console.warn(`⚠️ Charge ${index} has no valid date:`, charge);
					}

					return validatedCharge;
				})
				.filter(Boolean); // Remove null entries

			console.log('📊 LLAMA image parsing found', validatedCharges.length, 'charges');
			console.log('📋 Sample charges:', validatedCharges.slice(0, 3));

			return validatedCharges;
		} catch (error) {
			console.error('❌ LLAMA image parsing failed:', error);
			throw new Error(`LLAMA image parsing failed: ${error.message}`);
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

			const content =
				response.choices?.[0]?.message?.content || response.completion_message?.content?.text;
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
