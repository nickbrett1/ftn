import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Debug endpoint to provide detailed information about normalization state
 * This helps diagnose issues with merchant normalization
 */
export async function GET(event) {
	// Require authentication
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const debugInfo = {};

		// 1. Check UNITED airlines transactions specifically
		const { results: unitedMerchants } = await db
			.prepare(
				`
				SELECT 
					merchant,
					merchant_normalized,
					merchant_details,
					amount,
					transaction_date
				FROM payment 
				WHERE merchant LIKE '%UNITED%'
				ORDER BY transaction_date DESC
				LIMIT 20
			`
			)
			.all();
		
		debugInfo.unitedMerchants = unitedMerchants || [];

		// 2. Check what merchants would appear in the merchant picker
		const { results: recentMerchants } = await db
			.prepare(
				`
				SELECT DISTINCT p.merchant_normalized
				FROM payment p
				JOIN statement s ON p.statement_id = s.id
				WHERE p.merchant_normalized IS NOT NULL
				  AND s.uploaded_at >= datetime('now', '-30 days')
				  AND NOT EXISTS (
					SELECT 1 FROM budget_merchant bm 
					WHERE bm.merchant_normalized = p.merchant_normalized
				  )
				ORDER BY s.uploaded_at DESC
				LIMIT 20
			`
			)
			.all();
		
		debugInfo.recentMerchants = recentMerchants?.map(row => row.merchant_normalized) || [];

		// 3. Check database schema
		try {
			// Check if payment table has merchant_normalized column
			const { results: paymentColumns } = await db
				.prepare("PRAGMA table_info(payment)")
				.all();
			
			debugInfo.schemaCheck = {
				paymentHasMerchantNormalized: paymentColumns?.some(col => col.name === 'merchant_normalized') || false,
				paymentColumns: paymentColumns?.map(col => col.name) || []
			};

			// Check if budget_merchant table has merchant_normalized column
			const { results: budgetMerchantColumns } = await db
				.prepare("PRAGMA table_info(budget_merchant)")
				.all();
			
			debugInfo.schemaCheck.budgetMerchantHasMerchantNormalized = budgetMerchantColumns?.some(col => col.name === 'merchant_normalized') || false;
			debugInfo.schemaCheck.budgetMerchantColumns = budgetMerchantColumns?.map(col => col.name) || [];

		} catch (schemaError) {
			console.error('Schema check failed:', schemaError);
			debugInfo.schemaCheck = { error: schemaError.message };
		}

		// 4. Check normalization statistics for UNITED specifically
		const { results: unitedStats } = await db
			.prepare(
				`
				SELECT 
					COUNT(*) as total_united,
					COUNT(CASE WHEN merchant_normalized = 'UNITED' THEN 1 END) as normalized_to_united,
					COUNT(CASE WHEN merchant_normalized != 'UNITED' AND merchant LIKE '%UNITED%' THEN 1 END) as not_normalized_to_united,
					COUNT(CASE WHEN merchant_normalized IS NULL AND merchant LIKE '%UNITED%' THEN 1 END) as missing_normalization
				FROM payment 
				WHERE merchant LIKE '%UNITED%'
			`
			)
			.all();
		
		debugInfo.unitedStats = unitedStats?.[0] || {};

		// 5. Check for any normalization errors
		const { results: normalizationErrors } = await db
			.prepare(
				`
				SELECT 
					merchant,
					merchant_normalized,
					merchant_details,
					COUNT(*) as count
				FROM payment 
				WHERE merchant LIKE '%UNITED%'
				  AND (merchant_normalized IS NULL OR merchant_normalized = '')
				GROUP BY merchant
				ORDER BY count DESC
				LIMIT 10
			`
			)
			.all();
		
		debugInfo.normalizationErrors = normalizationErrors || [];

		// 6. Check bulk pattern update status
		const { results: bulkUpdateStatus } = await db
			.prepare(
				`
				SELECT 
					merchant_normalized,
					COUNT(*) as count
				FROM payment 
				WHERE merchant_normalized IS NOT NULL
				  AND merchant_normalized != merchant
				GROUP BY merchant_normalized
				ORDER BY count DESC
				LIMIT 10
			`
			)
			.all();
		
		debugInfo.bulkUpdateStatus = bulkUpdateStatus || [];

		return json(debugInfo);

	} catch (error) {
		console.error('Debug endpoint failed:', error);
		return json(
			{ 
				error: 'Failed to get debug information',
				details: error.message 
			},
			{ status: 500 }
		);
	}
}