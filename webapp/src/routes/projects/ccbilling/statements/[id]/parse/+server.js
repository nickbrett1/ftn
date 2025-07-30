import { json } from '@sveltejs/kit';
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import { LLAMA_API_KEY } from '$env/static/private';

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
				charge.allocated_to || 'Both' // Default allocation
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
	const LLAMA_API_URL = 'https://api.llama.com/v1/chat/completions';

	// Try both methods of accessing the environment variable
	const apiKey = LLAMA_API_KEY || process.env.LLAMA_API_KEY;

	if (!apiKey) {
		throw new Error(
			'LLAMA_API_KEY not found in environment variables. Please check Doppler configuration.'
		);
	}

	console.log('Parsing with Llama API, text length:', text.length);

	const prompt = `Parse the following credit card statement text and extract all charges. 
Return the results as a JSON array with each charge having:
- merchant: the merchant name
- amount: the charge amount as a number
- date: the transaction date (YYYY-MM-DD format if available)

Statement text:
${text}

Return only valid JSON array, no other text.`;

	try {
		const response = await event.fetch(LLAMA_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
				messages: [
					{
						role: 'user',
						content: prompt
					},
					{
						role: 'system',
						content:
							'You are a helpful assistant that parses credit card statements and extracts charges. You will be given a statement text and you will need to extract the charges from the statement.'
					}
				],
				temperature: 0.1,
				max_tokens: 1000
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Llama API error:', response.status, errorText);
			throw new Error(`Llama API error: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data = await response.json();

		// Extract content from Llama API response structure
		const content = data.completion_message?.content?.text;

		if (!content) {
			console.error('No content received from Llama API, available keys:', Object.keys(data));
			throw new Error('No content received from Llama API');
		}

		// Clean up the content (remove markdown code blocks if present)
		let cleanContent = content.trim();
		if (cleanContent.startsWith('```json') && cleanContent.endsWith('```')) {
			cleanContent = cleanContent.slice(7, -3).trim(); // Remove ```json and ```
		} else if (cleanContent.startsWith('```') && cleanContent.endsWith('```')) {
			cleanContent = cleanContent.slice(3, -3).trim(); // Remove ``` and ```
		}

		// Remove control characters that can break JSON parsing
		cleanContent = cleanContent
			.replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
			.replace(/\n/g, '\\n') // Escape newlines
			.replace(/\r/g, '\\r') // Escape carriage returns
			.replace(/\t/g, '\\t'); // Escape tabs

		// Parse the JSON response
		let charges;
		try {
			charges = JSON.parse(cleanContent);
		} catch (parseError) {
			console.error('JSON parsing failed, attempting to extract JSON array');
			// Try to find JSON array in the content
			const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
			if (jsonMatch) {
				charges = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error(`Failed to parse JSON response: ${parseError.message}`);
			}
		}

		console.log('Parsed', charges.length, 'charges from Llama API');

		// Validate and clean the charges
		return charges
			.map((charge) => ({
				merchant: charge.merchant || 'Unknown',
				amount: parseFloat(charge.amount) || 0,
				allocated_to: 'Both' // Default allocation
			}))
			.filter((charge) => charge.amount > 0);
	} catch (error) {
		console.error('Llama API parsing failed:', error);
		console.error('Error details:', error.message);
		// Don't fallback to mock - fail clearly
		throw new Error(`Llama API parsing failed: ${error.message}`);
	}
}
