import { json } from '@sveltejs/kit';
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import { StatementParserManager } from '$lib/server/ccbilling-parsers/parser-manager.js';
import { LlamaService } from '$lib/server/ccbilling-llama-service.js';

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

		// Parse the statement using the new parser architecture
		const parseResult = await parsePDFWithParsers(statement, event);
		const charges = parseResult.charges;

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
			message: `Statement parsed successfully using ${parseResult.parser.name} parser`,
			parser_info: parseResult.parser,
			billing_cycle: parseResult.billingCycle,
			card_info: parseResult.cardInfo
		});
	} catch (error) {
		console.error('Error parsing statement:', error);
		return json({ error: `Failed to parse statement: ${error.message}` }, { status: 500 });
	}
}

/**
 * Parse PDF statement using the new parser architecture
 * @param {Object} statement
 * @param {Object} event
 * @returns {Promise<Object>}
 */
async function parsePDFWithParsers(statement, event) {
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

	// Parse using the parser manager
	const parserManager = new StatementParserManager();
	const parseResult = parserManager.parseStatement(pdfText);

	// Optionally enhance with LLAMA classification (non-blocking)
	try {
		const llamaService = new LlamaService();
		const uniqueMerchants = [...new Set(parseResult.charges.map((charge) => charge.merchant))];
		const classifications = await llamaService.classifyMerchants(uniqueMerchants);

		// Add classification data to charges
		const merchantClassifications = {};
		classifications.forEach((classification) => {
			merchantClassifications[classification.merchant] = classification;
		});

		parseResult.charges = parseResult.charges.map((charge) => ({
			...charge,
			classification: merchantClassifications[charge.merchant] || null
		}));

		parseResult.merchantClassifications = merchantClassifications;
	} catch (error) {
		console.warn('LLAMA classification failed, continuing without classification:', error);
		// Continue without classification - it's not critical for core functionality
	}

	return parseResult;
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
