import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Check current state
		const { results: beforeData } = await db
			.prepare(
				`
				SELECT merchant_normalized, budget_id, COUNT(*) as count
				FROM budget_merchant 
				WHERE merchant_normalized LIKE '%PINKBERRY%'
				GROUP BY merchant_normalized, budget_id
				`
			)
			.all();

		// Check what picker would show before deletion
		const { results: pickerBefore } = await db
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

		// Simulate deletion
		await db
			.prepare('DELETE FROM budget_merchant WHERE merchant_normalized = ? AND budget_id = ?')
			.bind('PINKBERRY', 1)
			.run();

		// Check state after deletion
		const { results: afterData } = await db
			.prepare(
				`
				SELECT merchant_normalized, budget_id, COUNT(*) as count
				FROM budget_merchant 
				WHERE merchant_normalized LIKE '%PINKBERRY%'
				GROUP BY merchant_normalized, budget_id
				`
			)
			.all();

		// Check what picker would show after deletion
		const { results: pickerAfter } = await db
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

		// Restore the entry
		await db
			.prepare('INSERT INTO budget_merchant (budget_id, merchant_normalized) VALUES (?, ?)')
			.bind(1, 'PINKBERRY')
			.run();

		return json({
			before: {
				budgetMerchants: beforeData,
				pickerData: pickerBefore.map(row => row.merchant_normalized)
			},
			after: {
				budgetMerchants: afterData,
				pickerData: pickerAfter.map(row => row.merchant_normalized)
			},
			message: 'PINKBERRY deletion test completed and entry restored'
		});
	} catch (error) {
		console.error('Failed to test PINKBERRY deletion:', error);
		return json(
			{
				error: 'Failed to test deletion',
				details: error.message
			},
			{ status: 500 }
		);
	}
}