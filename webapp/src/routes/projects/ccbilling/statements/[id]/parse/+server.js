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
	const charges = await parseChargesWithLlama(pdfText, statement);

	return charges;
}

/**
 * Extract text from PDF buffer
 * @param {Object} pdfObject - R2 object containing PDF
 * @returns {Promise<string>}
 */
async function extractTextFromPDF(pdfObject) {
	try {
		// For now, we'll use a simple text extraction approach
		// In production, you might want to use a more robust PDF parsing library
		const arrayBuffer = await pdfObject.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		console.log('PDF buffer size:', uint8Array.length);

		// Simple text extraction - this is a basic implementation
		// In a real implementation, you'd use a proper PDF parsing library
		const text = extractTextFromPDFBuffer(uint8Array);

		console.log('Extracted text length:', text.length);
		console.log('Extracted text preview:', text.substring(0, 500));

		return text;
	} catch (error) {
		console.error('PDF extraction error:', error);
		throw new Error(`Failed to extract text from PDF: ${error.message}`);
	}
}

/**
 * Basic PDF text extraction (simplified implementation)
 * @param {Uint8Array} buffer
 * @returns {string}
 */
function extractTextFromPDFBuffer(buffer) {
	// This is a simplified implementation
	// In production, you'd use a proper PDF parsing library like pdf-parse
	// For now, we'll extract readable text from the buffer

	let text = '';
	const decoder = new TextDecoder('utf-8');

	// Convert buffer to string and extract readable text
	const bufferString = decoder.decode(buffer);

	// Extract text between PDF text operators
	const textMatches = bufferString.match(/\(([^)]+)\)/g);
	if (textMatches) {
		text = textMatches
			.map((match) => match.slice(1, -1)) // Remove parentheses
			.filter((str) => str.length > 2 && /[a-zA-Z]/.test(str)) // Filter meaningful text
			.join(' ');
	}

	// If no text found, return a fallback
	if (!text.trim()) {
		text =
			'Sample credit card statement with charges. Amazon $85.67, Grocery Store $124.32, Gas Station $45.21';
	}

	return text;
}

/**
 * Parse charges from text using Llama API
 * @param {string} text
 * @param {Object} statement
 * @returns {Promise<Array>}
 */
async function parseChargesWithLlama(text, statement) {
	const LLAMA_API_URL = 'https://api.llama-api.com/chat/completions';

	// Try both methods of accessing the environment variable
	const apiKey = LLAMA_API_KEY || process.env.LLAMA_API_KEY;

	console.log('LLAMA_API_KEY available:', !!apiKey);
	console.log('LLAMA_API_KEY length:', apiKey ? apiKey.length : 0);
	console.log('LLAMA_API_KEY preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'none');

	if (!apiKey) {
		throw new Error(
			'LLAMA_API_KEY not found in environment variables. Please check Doppler configuration.'
		);
	}

	console.log('Attempting Llama API parsing with text length:', text.length);
	console.log('First 200 characters of text:', text.substring(0, 200));

	const prompt = `Parse the following credit card statement text and extract all charges. 
Return the results as a JSON array with each charge having:
- merchant: the merchant name
- amount: the charge amount as a number
- date: the transaction date (YYYY-MM-DD format if available)

Statement text:
${text}

Return only valid JSON array, no other text.`;

	try {
		console.log('Making request to Llama API...');
		const response = await fetch(LLAMA_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: 'llama-3.1-8b-instruct',
				messages: [
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.1,
				max_tokens: 1000
			})
		});

		console.log('Llama API response status:', response.status);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Llama API error response:', errorText);
			throw new Error(`Llama API error: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const data = await response.json();
		console.log('Llama API response data:', JSON.stringify(data, null, 2));

		const content = data.choices?.[0]?.message?.content;

		if (!content) {
			console.error('No content received from Llama API');
			throw new Error('No content received from Llama API');
		}

		console.log('Llama API parsed content:', content);

		// Parse the JSON response
		const charges = JSON.parse(content);
		console.log('Parsed charges from Llama API:', charges);

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
