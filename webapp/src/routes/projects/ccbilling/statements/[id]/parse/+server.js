import { json } from '@sveltejs/kit';
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement,
	listCreditCards,
	updateStatementCreditCard,
	updateStatementDate,
	getBillingCycle,
	getBudgetByMerchant
} from '$lib/server/ccbilling-db.js';
import { RouteUtils } from '$lib/server/route-utils.js';
import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';

/** @type {import('./$types').RequestHandler} */
export const GET = RouteUtils.createRouteHandler(
	async (event) => {
		const { params } = event;
		const statement_id = Number.parseInt(params.id, 10);

		// Get the statement details
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return RouteUtils.createErrorResponse('Statement not found', { status: 404 });
		}

		console.log('📄 Statement found:', statement.filename);

		return json({
			success: true,
			statement: {
				id: statement.id,
				filename: statement.filename,
				r2_key: statement.r2_key
			},
			message: 'Statement details retrieved successfully'
		});
	},
	{
		requiredParams: ['id'],
		validators: {
			id: (value) => {
				const parsed = RouteUtils.parseInteger(value, 'statement ID', { min: 1 });
				return typeof parsed === 'number' ? true : 'Invalid statement ID';
			}
		}
	}
);

/**
 * Validate and prepare statement data
 * @param {Object} event - Request event
 * @returns {Promise<Object>} Object with statement and billingCycleInfo or error
 */
async function validateStatementData(event, statement_id) {
	const statement = await getStatement(event, statement_id);
	if (!statement) {
		return { error: RouteUtils.createErrorResponse('Statement not found', { status: 404 }) };
	}

	const billingCycleInfo = await getBillingCycle(event, statement.billing_cycle_id);
	if (!billingCycleInfo) {
		return { error: RouteUtils.createErrorResponse('Billing cycle not found', { status: 404 }) };
	}

	return { statement, billingCycleInfo };
}

/**
 * Process a single charge and create payment record
 * @param {Object} event - Request event
 * @param {Object} charge - Charge data
 * @param {number} statement_id - Statement ID
 * @param {Object} billingCycleInfo - Billing cycle information
 * @returns {Promise<void>}
 */
async function processCharge(event, charge, statement_id, billingCycleInfo) {
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
	const isAmazon =
		charge.merchant &&
		(charge.merchant.toUpperCase().includes('AMAZON') ||
			charge.merchant.toUpperCase().includes('AMZN'));

	// For Amazon charges, try to get the full statement text from the parsed data
	let fullStatementText = null;
	if (isAmazon && charge.full_statement_text) {
		fullStatementText = charge.full_statement_text;
	} else if (isAmazon && charge.merchant_details) {
		// Fallback: use merchant_details if available
		fullStatementText = charge.merchant_details;
	}

	await createPayment(event, {
		statement_id,
		merchant: charge.merchant,
		amount: charge.amount,
		allocated_to: allocatedTo,
		transaction_date: transactionDate,
		is_foreign_currency: charge.is_foreign_currency || false,
		foreign_currency_amount: charge.foreign_currency_amount || null,
		foreign_currency_type: charge.foreign_currency_type || null,
		flight_details: charge.flight_details || null,
		full_statement_text: fullStatementText
	});
}

export const POST = RouteUtils.createRouteHandler(
	async (event, parsedBody) => {
		const { params } = event;
		const statement_id = Number.parseInt(params.id, 10);

		console.log('🔍 Starting parse for statement ID:', statement_id);

		// Validate statement data
		const validationResult = await validateStatementData(event, statement_id);
		if (validationResult.error) {
			return validationResult.error;
		}

		const { statement, billingCycleInfo } = validationResult;
		console.log('📄 Statement found:', statement.filename);
		console.log('📅 Billing cycle:', billingCycleInfo.start_date, 'to', billingCycleInfo.end_date);

		// Get the parsed data from the request body (already validated by RouteUtils)
		const parsedData = parsedBody.parsedData;
		if (!parsedData) {
			return RouteUtils.createErrorResponse('No parsed data provided', { status: 400 });
		}

		console.log('📄 Received parsed data from client');

		// Delete existing payments for this statement (in case of re-parsing)
		try {
			await deletePaymentsForStatement(event, statement_id);
		} catch (error) {
			return json(
				{
					success: false,
					error: `Failed to process parsed data: ${error.message}`
				},
				{ status: 500 }
			);
		}

		// Get all available credit cards for identification
		const availableCreditCards = await listCreditCards(event);
		console.log('💳 Available credit cards for identification:', availableCreditCards.length);

		// Identify credit card from the parsed data
		const identifiedCreditCard = identifyCreditCardFromParsedData(
			parsedData.last4,
			availableCreditCards
		);

		if (!identifiedCreditCard) {
			console.warn('⚠️ Could not identify credit card from statement');

			let errorMessage;
			if (!parsedData.last4 || parsedData.last4.trim() === '') {
				errorMessage =
					'No credit card information found in the statement. Please ensure the statement contains valid credit card details.';
			} else {
				errorMessage = `No matching credit card found for last4: ${parsedData.last4}. Please add a credit card with last4: ${parsedData.last4} before uploading this statement.`;
			}

			return json(
				{
					success: false,
					error: errorMessage
				},
				{ status: 400 }
			);
		}

		console.log(
			'💳 Identified credit card:',
			identifiedCreditCard
				? `${identifiedCreditCard.name} (****${identifiedCreditCard.last4})`
				: 'None'
		);

		// Update statement with identified credit card if not already set
		if (!statement.credit_card_id && identifiedCreditCard) {
			console.log('💳 Updating statement with identified credit card:', identifiedCreditCard.id);
			await updateStatementCreditCard(event, statement_id, identifiedCreditCard.id);
		}

		// Update statement with parsed statement date if available
		if (parsedData.statement_date && !statement.statement_date) {
			console.log('📅 Updating statement with parsed date:', parsedData.statement_date);
			await updateStatementDate(event, statement_id, parsedData.statement_date);
		}

		// Create payment records from parsed charges
		const charges = parsedData.charges || [];
		console.log('💳 Parsed charges:', charges.length, 'charges found');

		for (const charge of charges) {
			console.log('💰 Creating charge:', charge.merchant, '$' + charge.amount);
			await processCharge(event, charge, statement_id, billingCycleInfo);
		}

		// Extract basic billing cycle and card info from the charges
		const extractedBillingCycle = extractBillingCycleFromCharges(charges);
		const cardInfo = extractCardInfoFromCharges(charges);

		return json({
			success: true,
			charges_found: charges.length,
			billing_cycle: extractedBillingCycle,
			card_info: cardInfo,
			message: 'Statement parsed successfully using client-side PDF parsing'
		});
	},
	{
		requiredParams: ['id'],
		requiredBody: ['parsedData'],
		validators: {
			id: (value) => {
				const parsed = RouteUtils.parseInteger(value, 'statement ID', { min: 1 });
				return typeof parsed === 'number' ? true : 'Invalid statement ID';
			}
		}
	}
);

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
 * Extract billing cycle information from charges
 * @param {Array} charges
 * @returns {Object}
 */
function extractBillingCycleFromCharges(charges) {
	if (!charges || charges.length === 0) {
		return { start_date: null, end_date: null };
	}

	// Find the earliest and latest dates
	const dates = charges
		.map((charge) => charge.date)
		.filter(Boolean)
		.sort((a, b) => new Date(a) - new Date(b));

	if (dates.length === 0) {
		return { start_date: null, end_date: null };
	}

	return {
		start_date: dates[0],
		end_date: dates[dates.length - 1]
	};
}

/**
 * Extract card information from charges
 * @param {Array} charges
 * @returns {Object}
 */
function extractCardInfoFromCharges(charges) {
	if (!charges || charges.length === 0) {
		return { card_type: null, last_four: null };
	}

	// For now, return basic info - this could be enhanced later
	return {
		card_type: 'Credit Card',
		last_four: null
	};
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

	const month = Number.parseInt(mmddMatch[1], 10);
	const day = Number.parseInt(mmddMatch[2], 10);

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
