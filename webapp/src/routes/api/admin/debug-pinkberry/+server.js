import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Check PINKBERRY data in payment table
		const { results: paymentData } = await db
			.prepare(
				`
				SELECT merchant, merchant_normalized, COUNT(*) as count
				FROM payment 
				WHERE merchant LIKE '%PINKBERRY%' OR merchant_normalized LIKE '%PINKBERRY%'
				GROUP BY merchant, merchant_normalized
				ORDER BY merchant
				`
			)
			.all();

		// Check PINKBERRY data in budget_merchant table
		const { results: budgetMerchantData } = await db
			.prepare(
				`
				SELECT merchant_normalized, budget_id, COUNT(*) as count
				FROM budget_merchant 
				WHERE merchant_normalized LIKE '%PINKBERRY%'
				GROUP BY merchant_normalized, budget_id
				ORDER BY merchant_normalized
				`
			)
			.all();

		// Check what the merchant picker would see
		const { results: pickerData } = await db
			.prepare(
				`
				SELECT DISTINCT p.merchant_normalized
				FROM payment p
				JOIN statement s ON p.statement_id = s.id
				WHERE p.merchant_normalized IS NOT NULL
				  AND s.uploaded_at >= datetime('now', '-30 days')
				  AND (p.merchant_normalized LIKE '%PINKBERRY%' OR p.merchant LIKE '%PINKBERRY%')
				ORDER BY p.merchant_normalized
				`
			)
			.all();

		return json({
			paymentData,
			budgetMerchantData,
			pickerData: pickerData.map(row => row.merchant_normalized),
			message: 'PINKBERRY debug data retrieved successfully'
		});
	} catch (error) {
		console.error('Failed to get PINKBERRY debug data:', error);
		return json(
			{
				error: 'Failed to get debug data',
				details: error.message
			},
			{ status: 500 }
		);
	}
}