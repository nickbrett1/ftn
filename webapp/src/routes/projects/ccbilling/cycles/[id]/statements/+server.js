import { 
	listStatements, 
	createStatement, 
	createPayment,
	deletePaymentsForStatement,
	listCreditCards,
	updateStatementCreditCard,
	updateStatementDate,
	getBillingCycle,
	getBudgetByMerchant
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import { json } from '@sveltejs/kit';
import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';
import { ParserFactory } from '$lib/utils/ccbilling-parsers/parser-factory.js';
import { ServerPDFUtils } from '$lib/server/pdf-utils.js';

/**
 * Generate a cryptographically secure random hex string for file keys
 * @param {number} byteLength - Number of random bytes to generate
 * @returns {string} Hex string of the specified length
 */
function generateSecureRandomHex(byteLength = 6) {
	const randomBytes = crypto.getRandomValues(new Uint8Array(byteLength));
	return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const cycleId = Number(event.params.id);
	if (!cycleId) {
		return json({ error: 'Missing or invalid billing cycle id' }, { status: 400 });
	}

	try {
		const statements = await listStatements(event, cycleId);
		return json(statements);
	} catch (error) {
		console.error('Error listing statements:', error);
		return json({ error: 'Failed to list statements' }, { status: 500 });
	}
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const cycleId = Number(event.params.id);
	if (!cycleId) {
		return json({ error: 'Missing or invalid billing cycle id' }, { status: 400 });
	}

	try {
		// Parse multipart form data for file upload
		const formData = await event.request.formData();
		const file = formData.get('file');

		// Validate required fields
		if (!file) {
			console.error('❌ No file provided');
			return json(
				{
					error: 'Missing required field: file'
				},
				{ status: 400 }
			);
		}

		// Validate file type (PDF only)
		if (file.type !== 'application/pdf') {
			console.error('❌ Invalid file type:', file.type);
			return json(
				{
					error: 'Invalid file type. Only PDF files are allowed.'
				},
				{ status: 400 }
			);
		}

		// Validate file size (10MB limit)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			console.error('❌ File too large:', file.size);
			return json(
				{
					error: 'File size too large. Maximum size is 10MB.'
				},
				{ status: 400 }
			);
		}

		// Generate unique R2 key with cryptographically secure randomness
		const timestamp = Date.now();
		const randomSuffix = generateSecureRandomHex(6);
		const r2_key = `statements/${cycleId}/${timestamp}-${randomSuffix}-${file.name}`;

		// Upload to R2
		const bucket = event.platform?.env?.R2_CCBILLING;
		if (!bucket) {
			console.error('❌ R2 bucket not configured');
			return json({ error: 'R2 ccbilling bucket not configured' }, { status: 500 });
		}

		// Convert file to ArrayBuffer for R2 upload
		const fileBuffer = await file.arrayBuffer();

		// Upload PDF to R2
		await bucket.put(r2_key, fileBuffer, {
			customMetadata: {
				originalName: file.name,
				uploadedAt: new Date().toISOString(),
				cycleId: cycleId.toString(),
				contentType: file.type
			}
		});

		// Save statement metadata to database (credit card will be identified during parsing)
		let statementId;
		try {
			statementId = await createStatement(
				event,
				cycleId,
				null, // Credit card will be identified during parsing
				file.name,
				r2_key,
				null // Statement date will be set after parsing
			);
			console.log('✅ Statement created in database with ID:', statementId);
		} catch (dbError) {
			console.error('❌ Database error creating statement:', dbError);
			// Clean up R2 file if database creation fails
			try {
				await bucket.delete(r2_key);
				console.log('🗑️ Cleaned up R2 file after database error');
			} catch (cleanupError) {
				console.error('❌ Failed to cleanup R2 file:', cleanupError);
			}
			throw new Error(`Failed to create statement in database: ${dbError.message}`);
		}

		// Now parse the statement automatically
		let parseResult = null;
		try {
			console.log('🔍 Starting automatic parsing for statement ID:', statementId);
			
			// Get the billing cycle information for year context
			const billingCycleInfo = await getBillingCycle(event, cycleId);
			if (!billingCycleInfo) {
				console.warn('⚠️ Billing cycle not found, skipping parsing');
			} else {
				console.log('📅 Billing cycle:', billingCycleInfo.start_date, 'to', billingCycleInfo.end_date);

				// Parse the PDF using the parser factory
				const parserFactory = new ParserFactory();
				const parsedData = await ServerPDFUtils.parseStatement(file, parserFactory, {
					preserveLineBreaks: true
				});

				console.log('📄 PDF parsed successfully, parsed data:', parsedData);

				// Get all available credit cards for identification
				const availableCreditCards = await listCreditCards(event);
				console.log('💳 Available credit cards for identification:', availableCreditCards.length);

				// Identify credit card from the parsed data
				const identifiedCreditCard = identifyCreditCardFromParsedData(
					parsedData.last4,
					availableCreditCards
				);

				if (identifiedCreditCard) {
					console.log('💳 Identified credit card:', `${identifiedCreditCard.name} (****${identifiedCreditCard.last4})`);
					
					// Update statement with identified credit card
					await updateStatementCreditCard(event, statementId, identifiedCreditCard.id);
					
					// Update statement with parsed statement date if available
					if (parsedData.statement_date) {
						console.log('📅 Updating statement with parsed date:', parsedData.statement_date);
						await updateStatementDate(event, statementId, parsedData.statement_date);
					}

					// Create payment records from parsed charges
					const charges = parsedData.charges || [];
					console.log('💳 Parsed charges:', charges.length, 'charges found');

					for (const charge of charges) {
						console.log('💰 Creating charge:', charge.merchant, '$' + charge.amount);

						// Determine the correct year for the transaction date
						const transactionDate = determineTransactionDateWithYear(charge.date, billingCycleInfo);

						// Determine auto-allocation based on current merchant → budget mapping
						let allocatedTo = charge.allocated_to || null;
						try {
							if (charge.merchant) {
								const normalized = normalizeMerchant(charge.merchant);
								const budget = await getBudgetByMerchant(event, normalized.merchant_normalized);
								if (budget) {
									allocatedTo = budget.name;
								}
							}
						} catch (e) {
							console.warn('Auto-association lookup failed for merchant', charge.merchant, e?.message);
						}

						// Check if this is an Amazon charge and capture full statement text
						const isAmazon = charge.merchant && (
							charge.merchant.toUpperCase().includes('AMAZON') || 
							charge.merchant.toUpperCase().includes('AMZN')
						);
						
						// For Amazon charges, try to get the full statement text from the parsed data
						let fullStatementText = null;
						if (isAmazon && charge.full_statement_text) {
							fullStatementText = charge.full_statement_text;
						} else if (isAmazon && charge.merchant_details) {
							// Fallback: use merchant_details if available
							fullStatementText = charge.merchant_details;
						}

						await createPayment(
							event,
							statementId,
							charge.merchant,
							charge.amount,
							allocatedTo,
							transactionDate, // Use the corrected transaction date
							charge.is_foreign_currency || false,
							charge.foreign_currency_amount || null,
							charge.foreign_currency_type || null,
							charge.flight_details || null,
							fullStatementText
						);
					}

					parseResult = {
						success: true,
						charges_found: charges.length,
						message: 'Statement uploaded and parsed successfully'
					};
				} else {
					console.warn('⚠️ Could not identify credit card from statement');
					parseResult = {
						success: false,
						error: parsedData.last4 
							? `No matching credit card found for last4: ${parsedData.last4}. Please add a credit card with last4: ${parsedData.last4} before uploading this statement.`
							: 'No credit card information found in the statement. Please ensure the statement contains valid credit card details.'
					};
				}
			}
		} catch (parseError) {
			console.error('❌ Error parsing statement:', parseError);
			parseResult = {
				success: false,
				error: `Failed to parse statement: ${parseError.message}`
			};
		}

		const response = {
			success: true,
			filename: file.name,
			r2_key: r2_key,
			size: file.size,
			statement_id: statementId,
			parse_result: parseResult
		};

		return json(response);
	} catch (error) {
		console.error('❌ Error uploading statement:', error);
		return json({ error: 'Failed to upload statement' }, { status: 500 });
	}
}

/**
 * Identify credit card from parsed data
 * @param {string} last4 - Last 4 digits from parsed data
 * @param {Array} availableCreditCards - Available credit cards
 * @returns {Object|null} - Identified credit card or null
 */
function identifyCreditCardFromParsedData(last4, availableCreditCards) {
	if (!last4 || last4.trim() === '') {
		console.warn('⚠️ No last4 digits found in parsed data');
		return null;
	}

	const matchingCard = availableCreditCards.find((card) => card.last4 === last4);

	if (matchingCard) {
		console.log('✅ Credit card identified successfully');
		return matchingCard;
	} else {
		console.warn(`⚠️ No matching card found for last4: ${last4}`);
		return null;
	}
}

/**
 * Determine the correct year for a transaction date based on billing cycle context
 * @param {string} transactionDate - Transaction date (may be MM/DD format)
 * @param {Object} billingCycle - Billing cycle object with start_date and end_date
 * @returns {string} - Transaction date with correct year in YYYY-MM-DD format
 */
function determineTransactionDateWithYear(transactionDate, billingCycle) {
	if (!transactionDate) return null;

	// If the date already has a year (YYYY-MM-DD format), return as is
	if (transactionDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
		return transactionDate;
	}

	// If it's in MM/DD format, we need to determine the year
	const mmddMatch = transactionDate.match(/^(\d{1,2})\/(\d{1,2})$/);
	if (!mmddMatch) {
		// If it's not MM/DD format, try to parse it as is
		return transactionDate;
	}

	const month = parseInt(mmddMatch[1], 10);
	const day = parseInt(mmddMatch[2], 10);

	// Extract year from billing cycle end date (closing date)
	const billingCycleYear = new Date(billingCycle.end_date).getFullYear();

	// Create a date with the billing cycle year
	let transactionYear = billingCycleYear;
	const transactionDateWithYear = new Date(transactionYear, month - 1, day);

	// Check if this date falls within the billing cycle
	const billingCycleStart = new Date(billingCycle.start_date);
	const billingCycleEnd = new Date(billingCycle.end_date);

	// If the date with the billing cycle year is after the billing cycle end,
	// it might be from the previous year
	if (transactionDateWithYear > billingCycleEnd) {
		transactionYear = billingCycleYear - 1;
	}
	// If the date with the billing cycle year is before the billing cycle start,
	// it might be from the next year
	else if (transactionDateWithYear < billingCycleStart) {
		transactionYear = billingCycleYear + 1;
	}

	// Format the final date
	return `${transactionYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
