import { json } from '@sveltejs/kit';
import {
	getStatement,
	createPayment,
	deletePaymentsForStatement,
	listCreditCards,
	updateStatementCreditCard
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params } = event;
	const statement_id = parseInt(params.id);

	if (isNaN(statement_id)) {
		return json({ error: 'Invalid statement ID' }, { status: 400 });
	}

	try {
		console.log('🔍 Debug: Getting statement details for ID:', statement_id);

		// Get the statement details
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return json({ error: 'Statement not found' }, { status: 404 });
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
	} catch (error) {
		console.error('❌ Error in debug endpoint:', error);
		return json({ error: `Debug failed: ${error.message}` }, { status: 500 });
	}
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params } = event;
	const statement_id = parseInt(params.id);

	if (isNaN(statement_id)) {
		return json({ error: 'Invalid statement ID' }, { status: 400 });
	}

	try {
		console.log('🔍 Starting parse for statement ID:', statement_id);

		// Get the statement details
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return json({ error: 'Statement not found' }, { status: 404 });
		}

		console.log('📄 Statement found:', statement.filename);

		// Get the parsed data from the request body
		const body = await event.request.json();
		const parsedData = body.parsedData;

		if (!parsedData) {
			return json({ error: 'No parsed data provided' }, { status: 400 });
		}

		console.log('📄 Received parsed data from client');

		// Delete existing payments for this statement (in case of re-parsing)
		await deletePaymentsForStatement(event, statement_id);

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

		// Create payment records from parsed charges
		const charges = parsedData.charges || [];
		console.log('💳 Parsed charges:', charges.length, 'charges found');

		for (const charge of charges) {
			console.log('💰 Creating charge:', charge.merchant, '$' + charge.amount);
			await createPayment(
				event,
				statement_id,
				charge.merchant,
				charge.amount,
				charge.allocated_to || 'Both', // Default allocation
				charge.date, // Pass the transaction date from parser
				charge.is_foreign_currency || false,
				charge.foreign_currency_amount || null,
				charge.foreign_currency_type || null
			);
		}

		// Extract basic billing cycle and card info from the charges
		const billingCycle = extractBillingCycleFromCharges(charges);
		const cardInfo = extractCardInfoFromCharges(charges);

		return json({
			success: true,
			charges_found: charges.length,
			message: `Statement parsed successfully using client-side PDF parsing`,
			billing_cycle: billingCycle,
			card_info: cardInfo
		});
	} catch (error) {
		console.error('❌ Error processing parsed data:', error);
		return json({ error: `Failed to process parsed data: ${error.message}` }, { status: 500 });
	}
}

/**
 * Identify credit card from parsed data
 * @param {string} last4 - Last 4 digits from parsed data
 * @param {Array} availableCreditCards - Available credit cards
 * @returns {Object|null} - Identified credit card or null
 */
function identifyCreditCardFromParsedData(last4, availableCreditCards) {
	if (!last4) {
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
		.filter((date) => date)
		.sort();

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
