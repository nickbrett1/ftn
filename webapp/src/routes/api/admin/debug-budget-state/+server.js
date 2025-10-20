import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';
import { getBudgetMerchants, getBudgetByMerchant } from '$lib/server/ccbilling-db.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const budgetId = event.url.searchParams.get('budgetId');
	if (!budgetId) {
		return json({ error: 'Missing budgetId parameter' }, { status: 400 });
	}

	try {
		// Get budget merchants
		const merchants = await getBudgetMerchants(event, parseInt(budgetId));
		
		// Check if PINKBERRY is assigned to any budget
		const pinkberryBudget = await getBudgetByMerchant(event, 'PINKBERRY');
		
		// Check what the picker would show
		const db = event.platform?.env?.CCBILLING_DB;
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
			budgetId: parseInt(budgetId),
			merchants: merchants.map(m => ({
				merchant: m.merchant,
				merchant_normalized: m.merchant_normalized
			})),
			pinkberryAssignedTo: pinkberryBudget,
			pickerData: pickerData.map(row => row.merchant_normalized),
			message: 'Budget state debug data retrieved successfully'
		});
	} catch (error) {
		console.error('Failed to get budget state debug data:', error);
		return json(
			{
				error: 'Failed to get debug data',
				details: error.message
			},
			{ status: 500 }
		);
	}
}