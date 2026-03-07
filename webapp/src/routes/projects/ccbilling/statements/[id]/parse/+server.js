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
		const statement_id = Number.parseInt(params.id);

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

async function processCharges(event, statement_id, charges, billingCycleInfo) {
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
		} catch (error) {
			console.warn('Auto-association lookup failed for merchant', charge.merchant, error?.message);
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
			transaction_date: transactionDate, // Use the corrected transaction date
			is_foreign_currency: charge.is_foreign_currency || false,
			foreign_currency_amount: charge.foreign_currency_amount || null,
			foreign_currency_type: charge.foreign_currency_type || null,
			flight_details: charge.flight_details || null,
			full_statement_text: fullStatementText
		});
	}
}

export const POST = RouteUtils.createRouteHandler(
	async (event, parsedBody) => {
		const { params } = event;
		const statement_id = Number.parseInt(params.id);

		console.log('🔍 Starting parse for statement ID:', statement_id);

		// Get the statement details
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return RouteUtils.createErrorResponse('Statement not found', { status: 404 });
		}

		console.log('📄 Statement found:', statement.filename);

		// Get the billing cycle information for year context
		const billingCycleInfo = await getBillingCycle(event, statement.billing_cycle_id);
		if (!billingCycleInfo) {
			return RouteUtils.createErrorResponse('Billing cycle not found', { status: 404 });
		}

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
			parsedData.card_name,
			availableCreditCards
		);

		if (!identifiedCreditCard) {
			console.warn('⚠️ Could not identify credit card from statement');

			let errorMessage;
			if (!parsedData.last4 && !parsedData.card_name) {
				errorMessage =
					'No credit card information found in the statement. Please ensure the statement contains valid credit card details.';
			} else if (parsedData.last4 && parsedData.last4 !== '0000') {
				errorMessage = `No matching credit card found for last4: ${parsedData.last4}. Please add a credit card with last4: ${parsedData.last4} before uploading this statement.`;
			} else if (parsedData.card_name) {
				errorMessage = `No matching credit card found with name: "${parsedData.card_name}". Please add a credit card with a similar name before uploading this statement.`;
			} else {
				errorMessage = 'Could not identify the credit card for this statement.';
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

		await processCharges(event, statement_id, charges, billingCycleInfo);

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
 * @param {string} cardName - Card name from parsed data
 * @param {Array} availableCreditCards - Available credit cards
 * @returns {Object|null} - Identified credit card or null
 */
function identifyCreditCardFromParsedData(last4, cardName, availableCreditCards) {
	// 1. Try to match by last4 (most precise)
	if (last4 && last4.trim() !== '' && last4 !== '0000') {
		const matchingByLast4 = availableCreditCards.find((card) => card.last4 === last4);
		if (matchingByLast4) {
			console.log('✅ Credit card identified successfully by last4');
			return matchingByLast4;
		}
	}

	// 2. Fallback to matching by card name
	if (cardName && cardName.trim() !== '') {
		const normalizedSearchName = cardName.toLowerCase().replace('palladium', 'paladium');

		const matchingByName = availableCreditCards.find((card) => {
			const dbCardName = card.name.toLowerCase();
			const normalizedDbName = dbCardName.replace('palladium', 'paladium');

			// Exact match
			if (dbCardName === cardName.toLowerCase()) return true;

			// Normalized exact match (handles palladium/paladium)
			if (normalizedDbName === normalizedSearchName) return true;

			// Substring match - either the DB card name contains the statement card name or vice versa
			if (dbCardName.includes(cardName.toLowerCase()) || cardName.toLowerCase().includes(dbCardName))
				return true;

			// Special case for Bilt
			if (cardName.toLowerCase().includes('bilt') && dbCardName.includes('bilt')) {
				if (cardName.toLowerCase().includes('palladium') && dbCardName.includes('paladium'))
					return true;
				if (cardName.toLowerCase().includes('paladium') && dbCardName.includes('palladium'))
					return true;
			}

			return false;
		});

		if (matchingByName) {
			console.log('✅ Credit card identified successfully by card name');
			return matchingByName;
		}
	}

	console.warn(`⚠️ No matching card found for last4: ${last4} or name: ${cardName}`);
	return null;
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
		end_date: dates.at(-1)
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
	if (/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
		return transactionDate;
	}

	// If it's in MM/DD format, we need to determine the year
	const mmddMatch = /^(\d{1,2})\/(\d{1,2})$/.exec(transactionDate);
	if (!mmddMatch) {
		// If it's not MM/DD format, try to parse it as is
		return transactionDate;
	}

	const month = Number.parseInt(mmddMatch[1], 10);
	const day = Number.parseInt(mmddMatch[2], 10);

	// Parse billing cycle dates safely
	const parseISODate = (isoStr) => {
		const [y, m, d] = isoStr.split('-').map(Number);
		return { y, m, d };
	};

	const billingCycleStart = parseISODate(billingCycle.start_date);
	const billingCycleEnd = parseISODate(billingCycle.end_date);

	// Default to the billing cycle end year
	let transactionYear = billingCycleEnd.y;

	// Create numeric representation for comparison (YYYYMMDD)
	const toNumeric = (y, m, d) => y * 10000 + m * 100 + d;

	const currentNumeric = toNumeric(transactionYear, month, day);
	const startNumeric = toNumeric(billingCycleStart.y, billingCycleStart.m, billingCycleStart.d);
	const endNumeric = toNumeric(billingCycleEnd.y, billingCycleEnd.m, billingCycleEnd.d);

	// If the date with the closing year is after the billing cycle end,
	// it must be from the previous year (e.g., Dec charge in Jan closing cycle)
	if (currentNumeric > endNumeric) {
		transactionYear--;
	}
	// If the date with the closing year is before the billing cycle start,
	// it might be from the next year (rare but possible)
	else if (currentNumeric < startNumeric) {
		// Only increment if the billing cycle spans across years and this date fits the start of the next year
		if (billingCycleStart.y < billingCycleEnd.y) {
			// Already handled by default (transactionYear = billingCycleEnd.y)
		} else {
			transactionYear++;
		}
	}

	// Format the final date
	return `${transactionYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
