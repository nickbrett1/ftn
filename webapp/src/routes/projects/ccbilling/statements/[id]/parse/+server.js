import { json } from '@sveltejs/kit';
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import { LLAMA_API_KEY } from '$env/static/private';
import LlamaAPIClient from 'llama-api-client';

/** @type {import('./$types').RequestHandler} */
export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params } = event;
	const statement_id = parseInt(params.id);

	if (isNaN(statement_id)) {
		return json({ error: 'Invalid statement ID' }, { status: 400 });
	}

	try {
		// Get the statement details
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return json({ error: 'Statement not found' }, { status: 404 });
		}

		// Delete existing payments for this statement (in case of re-parsing)
		await deletePaymentsForStatement(event, statement_id);

		// Parse the statement using Llama API
		const charges = await parsePDFWithLlama(statement, event);

		// Create payment records from parsed charges
		for (const charge of charges) {
			await createPayment(
				event,
				statement_id,
				charge.merchant,
				charge.amount,
				charge.allocated_to || 'Both', // Default allocation
				charge.date // Pass the transaction date from Llama API
			);
		}

		return json({
			success: true,
			charges_found: charges.length,
			message: 'Statement parsed successfully using Llama API'
		});
	} catch (error) {
		console.error('Error parsing statement:', error);
		return json({ error: `Failed to parse statement: ${error.message}` }, { status: 500 });
	}
}

/**
 * Parse PDF statement using Llama API
 * @param {Object} statement
 * @param {Object} event
 * @returns {Promise<Array>}
 */
async function parsePDFWithLlama(statement, event) {
	// Get the ccbilling R2 bucket
	const bucket = event.platform?.env?.R2_CCBILLING;
	if (!bucket) {
		throw new Error('R2_CCBILLING bucket not configured');
	}

	// Download PDF from R2
	const pdfObject = await bucket.get(statement.r2_key);
	if (!pdfObject) {
		throw new Error(`PDF not found in R2: ${statement.r2_key}`);
	}

	// Extract text from PDF
	const pdfText = await extractTextFromPDF(pdfObject);

	// Parse charges using Llama API
	const charges = await parseChargesWithLlama(pdfText, statement, event);

	return charges;
}

/**
 * Extract text from PDF buffer using pdf-parse
 * @param {Object} pdfObject - R2 object containing PDF
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(pdfObject) {
	try {
		// Import pdf-parse dynamically
		const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;

		const arrayBuffer = await pdfObject.arrayBuffer();
		// Convert ArrayBuffer to Buffer for pdf-parse
		const buffer = Buffer.from(arrayBuffer);

		// Extract text using pdf-parse
		const pdfData = await pdfParse(buffer);

		console.log('PDF extracted:', pdfData.numpages, 'pages,', pdfData.text.length, 'characters');

		return pdfData.text;
	} catch (error) {
		console.error('PDF extraction error:', error);
		throw new Error(`Failed to extract text from PDF: ${error.message}`);
	}
}

/**
 * Parse charges from text using Llama API
 * @param {string} text
 * @param {Object} statement
 * @param {Object} event
 * @returns {Promise<Array>}
 */
async function parseChargesWithLlama(text, statement, event) {
	// Try both methods of accessing the environment variable
	const apiKey = LLAMA_API_KEY || process.env.LLAMA_API_KEY;

	if (!apiKey) {
		throw new Error(
			'LLAMA_API_KEY not found in environment variables. Please check Doppler configuration.'
		);
	}

	console.log('Parsing with Llama API, text length:', text.length);

	// Initialize the Llama API client
	const client = new LlamaAPIClient({
		apiKey: apiKey,
		timeout: 60000, // 60 seconds timeout
		logLevel: 'warn' // Only show warnings and errors
	});

	const prompt = `Parse the following credit card statement text and extract all charges and credits. 

IMPORTANT INSTRUCTIONS:
- Look for credits in sections like "Payments and Other Credits", "Credits", or similar sections
- EXCLUDE payment credits like "Payment Thank You", "Payment Thank You-Mobile", "Online Payment", etc. that are just paying off previous balances
- INCLUDE actual refunds, returns, and merchant credits (negative amounts from merchants)
- Look for both positive charges (purchases) and negative credits (refunds/returns)

Return the results as a valid JSON array with each transaction having:
- merchant: the merchant name (string)
- amount: the transaction amount as a number (positive for charges, negative for credits/refunds, no currency symbols)
- date: the transaction date (YYYY-MM-DD format if available, or null if not found)

IMPORTANT: Return ONLY a valid JSON array like this example:
[
  {"merchant": "Amazon", "amount": 85.67, "date": "2024-01-15"},
  {"merchant": "Grocery Store", "amount": 124.32, "date": null},
  {"merchant": "Target Refund", "amount": -45.99, "date": "2024-01-16"}
]

Statement text:
${text}

Return ONLY the JSON array, no markdown formatting, no code blocks, no additional text or explanations.`;

	try {
		const response = await client.chat.completions.create({
			model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
			messages: [
				{
					role: 'system',
					content:
						'You are a helpful assistant that parses credit card statements and extracts charges. You will be given a statement text and you will need to extract the charges from the statement. Always return only valid JSON arrays without any markdown formatting or code blocks.'
				},
				{
					role: 'user',
					content: prompt
				}
			],
			temperature: 0.1,
			max_tokens: 1000
		});

		// Extract content from Llama API response structure
		const content = response.completion_message?.content?.text;

		if (!content) {
			console.error('No content received from Llama API');
			throw new Error('No content received from Llama API');
		}

		// Clean up the content (remove markdown code blocks if present)
		let cleanContent = content.trim();
		if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
			cleanContent = cleanContent.slice(7, -3).trim(); // Remove ```json and ```
		} else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
			cleanContent = cleanContent.slice(3, -3).trim(); // Remove ``` and ```
		}

		// Additional JSON cleaning - remove any trailing commas and fix common issues
		cleanContent = cleanContent.replace(/,\s*}/g, '}'); // Remove trailing commas before }
		cleanContent = cleanContent.replace(/,\s*]/g, ']'); // Remove trailing commas before ]
		cleanContent = cleanContent.replace(/,\s*,/g, ','); // Remove double commas
		cleanContent = cleanContent.replace(/,\s*}/g, '}'); // Remove trailing commas before } (again)
		cleanContent = cleanContent.replace(/,\s*]/g, ']'); // Remove trailing commas before ] (again)

		// Try to find JSON array in the content if it's not the entire content
		const jsonArrayMatch = cleanContent.match(/\[[\s\S]*\]/);
		if (jsonArrayMatch) {
			cleanContent = jsonArrayMatch[0];
		}

		// Parse the JSON response with better error handling
		let charges;
		try {
			charges = JSON.parse(cleanContent);
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			console.error('Raw content:', content);
			console.error('Cleaned content:', cleanContent);

			// Try one more time with a more aggressive cleaning approach
			try {
				// Remove any non-JSON content and try to extract just the array
				const jsonMatch = content.match(/\[[\s\S]*\]/);
				if (jsonMatch) {
					const extractedJson = jsonMatch[0]
						.replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
						.replace(/,\s*,/g, ',') // Remove double commas
						.replace(/,\s*}/g, '}') // Remove trailing commas before }
						.replace(/,\s*]/g, ']'); // Remove trailing commas before ]

					charges = JSON.parse(extractedJson);
				} else {
					throw new Error('No valid JSON array found in response');
				}
			} catch (secondParseError) {
				console.error('Second JSON parse attempt failed:', secondParseError);
				console.error('Second attempt content:', content);

				// Third attempt: Try to manually fix common JSON issues
				try {
					let thirdAttemptJson = content;

					// Find the JSON array
					const jsonArrayMatch = content.match(/\[[\s\S]*\]/);
					if (jsonArrayMatch) {
						thirdAttemptJson = jsonArrayMatch[0];
					}

					// Fix common issues
					thirdAttemptJson = thirdAttemptJson
						.replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
						.replace(/,\s*,/g, ',') // Remove double commas
						.replace(/,\s*}/g, '}') // Remove trailing commas before }
						.replace(/,\s*]/g, ']') // Remove trailing commas before ]
						.replace(/}\s*,/g, '},') // Fix missing commas after }
						.replace(/]\s*,/g, '],') // Fix missing commas after ]
						.replace(/}\s*}/g, '}}') // Fix missing commas between objects
						.replace(/]\s*]/g, ']]') // Fix missing commas between arrays
						.replace(/}\s*]/g, '}]') // Fix missing commas between object and array
						.replace(/]\s*}/g, ']}') // Fix missing commas between array and object
						.replace(/,\s*}/g, '}') // Final cleanup of trailing commas
						.replace(/,\s*]/g, ']'); // Final cleanup of trailing commas

					charges = JSON.parse(thirdAttemptJson);
				} catch (thirdParseError) {
					console.error('Third JSON parse attempt failed:', thirdParseError);
					console.error('Third attempt content:', content);

					// Fourth attempt: Try to extract individual JSON objects and reconstruct
					try {
						// Find all potential JSON objects in the content - use a more flexible pattern
						const objectMatches =
							content.match(/\{[^}]*"merchant"[^}]*\}/g) ||
							content.match(/\{[^}]*"amount"[^}]*\}/g) ||
							content.match(/\{[^}]*"date"[^}]*\}/g);
						if (objectMatches && objectMatches.length > 0) {
							const reconstructedCharges = [];

							for (const match of objectMatches) {
								try {
									// Clean up each individual object
									let cleanedObject = match
										.replace(/,\s*}/g, '}') // Remove trailing commas
										.replace(/,\s*,/g, ',') // Remove double commas
										.replace(/}\s*,/g, '},') // Fix missing commas
										.replace(/]\s*,/g, '],') // Fix missing commas
										.replace(/}\s*}/g, '}}') // Fix missing commas
										.replace(/]\s*]/g, ']]') // Fix missing commas
										.replace(/}\s*]/g, '}]') // Fix missing commas
										.replace(/]\s*}/g, ']}') // Fix missing commas
										.replace(/,\s*}/g, '}') // Final cleanup
										.replace(/,\s*]/g, ']'); // Final cleanup

									// Fix missing closing braces
									if (!cleanedObject.endsWith('}')) {
										cleanedObject = cleanedObject + '}';
									}

									// Fix missing opening braces
									if (!cleanedObject.startsWith('{')) {
										cleanedObject = '{' + cleanedObject;
									}

									// Fix common malformed patterns like {"merchant": "QQ NAIL & 104.50, "date": "2024-07-03"}
									cleanedObject = cleanedObject
										.replace(/"([^"]+)"\s+([0-9.-]+),/g, '"$1", "amount": $2,') // Fix missing amount field
										.replace(/"([^"]+)"\s+([0-9.-]+)\s*}/g, '"$1", "amount": $2}') // Fix missing amount field at end
										.replace(/"([^"]+)"\s+([0-9.-]+)\s*"/g, '"$1", "amount": $2, "date": "$3"'); // Fix missing amount field with date

									const parsedObject = JSON.parse(cleanedObject);

									// Handle nested objects and extract the actual data
									let merchant = parsedObject.merchant;
									let amount = parsedObject.amount;
									let date = parsedObject.date;

									// If merchant is an object, try to extract the actual merchant name
									if (merchant && typeof merchant === 'object') {
										merchant = merchant.merchant || merchant.name || 'Unknown';
									}

									// If amount is an object, try to extract the actual amount
									if (amount && typeof amount === 'object') {
										amount = amount.amount || amount.value || 0;
									}

									// If date is an object, try to extract the actual date
									if (date && typeof date === 'object') {
										date = date.date || date.value || null;
									}

									// Ensure we have valid data
									if (
										merchant &&
										typeof merchant === 'string' &&
										amount !== undefined &&
										amount !== null &&
										typeof amount === 'number'
									) {
										reconstructedCharges.push({
											merchant: merchant,
											amount: parseFloat(amount) || 0,
											date: date
										});
									}
								} catch (objectError) {
									console.warn('Failed to parse individual object:', match);
								}
							}

							if (reconstructedCharges.length > 0) {
								charges = reconstructedCharges;
							} else {
								throw new Error('No valid objects could be extracted');
							}
						} else {
							throw new Error('No JSON objects found in response');
						}
					} catch (fourthParseError) {
						console.error('Fourth JSON parse attempt failed:', fourthParseError);
						throw new Error(`Invalid JSON response from Llama API: ${parseError.message}`);
					}
				}
			}
		}

		console.log('Parsed', charges.length, 'charges from Llama API');

		// Validate that charges is an array
		if (!Array.isArray(charges)) {
			console.error('Llama API returned non-array:', typeof charges, charges);
			throw new Error('Llama API did not return a valid array of charges');
		}

		// Validate and clean the charges
		return charges
			.map((charge, index) => {
				// Validate each charge object
				if (!charge || typeof charge !== 'object') {
					console.warn(`Invalid charge at index ${index}:`, charge);
					return null;
				}

				return {
					merchant: charge.merchant || 'Unknown',
					amount: parseFloat(charge.amount) || 0,
					date: charge.date || null, // Extract the date from Llama response
					allocated_to: 'Both' // Default allocation
				};
			})
			.filter((charge) => {
				// Filter out invalid charges and payment credits
				if (!charge || charge.amount === 0) return false;

				// Exclude payment credits (paying off previous balances)
				const merchant = charge.merchant?.toLowerCase() || '';
				const paymentKeywords = [
					'payment thank you',
					'payment thank you-mobile',
					'online payment',
					'payment received',
					'payment',
					'credit card payment'
				];

				if (paymentKeywords.some((keyword) => merchant.includes(keyword))) {
					return false;
				}

				return true;
			});
	} catch (error) {
		console.error('Llama API parsing failed:', error);
		console.error('Error details:', error.message);
		// Don't fallback to mock - fail clearly
		throw new Error(`Llama API parsing failed: ${error.message}`);
	}
}
