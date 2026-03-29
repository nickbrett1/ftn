import { json } from '@sveltejs/kit';
import { RouteUtils } from '$lib/server/route-utils.js';
import { getStatement, getPaymentsForStatement, updatePaymentMerchantFields } from '$lib/server/ccbilling-db.js';

export const PATCH = RouteUtils.createRouteHandler(
	async (event, parsedBody) => {
		const { params } = event;
		const statement_id = Number.parseInt(params.id);

		console.log('🔍 Starting re-parse comparison for statement ID:', statement_id);

		// Get the statement details
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return RouteUtils.createErrorResponse('Statement not found', { status: 404 });
		}

		// Get the parsed data from the request body (already validated by RouteUtils)
		const parsedData = parsedBody.parsedData;
		if (!parsedData?.charges) {
			return RouteUtils.createErrorResponse('No parsed charges provided', { status: 400 });
		}

		const newCharges = parsedData.charges;
		console.log(`📄 Received ${newCharges.length} re-parsed charges from client`);

		// Get the existing charges for this statement from the database
		const existingPayments = await getPaymentsForStatement(event, statement_id);
		console.log(`💾 Found ${existingPayments.length} existing payments in the database`);

		// We need to match new charges to existing payments based on date and amount.
		// If there are structural changes (different count, or unable to match), we reject the reparse.
		if (newCharges.length !== existingPayments.length) {
			return json(
				{
					success: false,
					error: `Structural changes detected: Parser found ${newCharges.length} charges, but database has ${existingPayments.length}. Please delete and re-upload the statement to apply these changes.`,
					details: {
						parserCount: newCharges.length,
						dbCount: existingPayments.length
					}
				},
				{ status: 400 }
			);
		}

		// Create a mutable copy of new charges to track matches
		const unmatchedNewCharges = [...newCharges];
		const matchedPairs = []; // Array of { paymentId, newCharge }
		const missingCharges = [];

		// Try to match each existing payment
		for (const payment of existingPayments) {
			// Find a matching new charge by amount
			// We skip date matching because dates from the parser might lack year context before processing,
			// or might be slightly different. Amount matching within the same statement is usually sufficient.
			const matchIndex = unmatchedNewCharges.findIndex(
				(nc) => Math.abs(nc.amount - payment.amount) < 0.01
			);

			if (matchIndex >= 0) {
				const matchedCharge = unmatchedNewCharges[matchIndex];
				matchedPairs.push({
					paymentId: payment.id,
					existingPayment: payment,
					newCharge: matchedCharge
				});
				// Remove from unmatched
				unmatchedNewCharges.splice(matchIndex, 1);
			} else {
				missingCharges.push(payment);
			}
		}

		// If there are unmatched charges, the structure changed
		if (missingCharges.length > 0 || unmatchedNewCharges.length > 0) {
			return json(
				{
					success: false,
					error: 'Structural changes detected: Could not match parsed charges to existing database records by amount. Please delete and re-upload the statement to apply these changes.',
					details: {
						missing_charges: missingCharges.map((c) => ({
							merchant: c.merchant,
							amount: c.amount,
							date: c.transaction_date
						})),
						extra_charges: unmatchedNewCharges.map((c) => ({
							merchant: c.merchant,
							amount: c.amount,
							date: c.date
						}))
					}
				},
				{ status: 400 }
			);
		}

		// All charges matched. Now let's compare merchant details and apply updates
		const changes = [];
		let updateCount = 0;

		for (const pair of matchedPairs) {
			const { paymentId, existingPayment, newCharge } = pair;

			// Compare merchant name
			const existingMerchant = existingPayment.merchant || '';
			const newMerchant = newCharge.merchant || '';

			if (existingMerchant !== newMerchant) {
				changes.push({
					oldMerchant: existingMerchant,
					newMerchant: newMerchant,
					amount: existingPayment.amount,
					date: existingPayment.transaction_date
				});

				// Update the payment record in the database
				// We update all merchant-related fields based on the new parsing
				await updatePaymentMerchantFields(event, paymentId, {
					merchant: newMerchant,
					merchant_normalized: newCharge.merchant_normalized || null,
					is_foreign_currency: newCharge.is_foreign_currency || false,
					foreign_currency_amount: newCharge.foreign_currency_amount || null,
					foreign_currency_type: newCharge.foreign_currency_type || null,
					flight_details: newCharge.flight_details ? JSON.stringify(newCharge.flight_details) : null,
					amazon_order_id: newCharge.amazon_order_id || null
				});
				updateCount++;
			}
		}

		console.log(`✅ Reparse complete. Updated ${updateCount} payments.`);

		return json({
			success: true,
			message: updateCount > 0
				? `Reparsed successfully. Updated ${updateCount} merchant name(s).`
				: 'Reparsed successfully, but no merchant names were changed.',
			changes: changes,
			updateCount: updateCount
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
