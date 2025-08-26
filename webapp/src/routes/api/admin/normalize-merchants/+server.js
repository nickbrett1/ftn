import { json } from '@sveltejs/kit';
import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Admin endpoint to normalize existing merchant data
 * This processes payments in batches to avoid timeouts
 */
export async function POST(event) {
	// Require authentication
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Get batch size from request body or use default
		const body = await event.request.json().catch(() => ({}));
		const batchSize = body.batchSize || 50;
		const offset = body.offset || 0;

		// Get payments that need normalization
		const { results: payments } = await db
			.prepare(
				`
				SELECT id, merchant 
				FROM payment 
				WHERE merchant IS NOT NULL
				AND (merchant_normalized IS NULL OR merchant_normalized = merchant)
				ORDER BY id
				LIMIT ? OFFSET ?
			`
			)
			.bind(batchSize, offset)
			.all();

		let updatedCount = 0;
		const errors = [];

		// Process each payment
		for (const payment of payments) {
			try {
				const normalized = normalizeMerchant(payment.merchant);
				
				// Only update if normalization actually changed something
				if (normalized.merchant_normalized !== payment.merchant) {
					await db
						.prepare(
							`
							UPDATE payment 
							SET merchant_normalized = ?,
								merchant_details = ?
							WHERE id = ?
						`
						)
						.bind(
							normalized.merchant_normalized,
							normalized.merchant_details || '',
							payment.id
						)
						.run();
					
					updatedCount++;
				}
			} catch (error) {
				errors.push({
					id: payment.id,
					merchant: payment.merchant,
					error: error.message
				});
			}
		}

		// Get total count of payments needing normalization
		const { results: countResult } = await db
			.prepare(
				`
				SELECT COUNT(*) as total
				FROM payment 
				WHERE merchant IS NOT NULL
				AND (merchant_normalized IS NULL OR merchant_normalized = merchant)
			`
			)
			.all();

		const totalRemaining = countResult[0]?.total || 0;

		// Also normalize budget_merchant records
		const { results: budgetMerchants } = await db
			.prepare(
				`
				SELECT id, merchant, budget_id
				FROM budget_merchant 
				WHERE merchant IS NOT NULL
				AND (merchant_normalized IS NULL OR merchant_normalized = '')
				LIMIT ?
			`
			)
			.bind(batchSize)
			.all();

		let budgetMerchantsUpdated = 0;
		for (const mapping of budgetMerchants) {
			try {
				const normalized = normalizeMerchant(mapping.merchant);
				
				await db
					.prepare(
						`
						UPDATE budget_merchant 
						SET merchant_normalized = ?
						WHERE id = ?
					`
					)
					.bind(normalized.merchant_normalized, mapping.id)
					.run();
				
				budgetMerchantsUpdated++;
			} catch (error) {
				errors.push({
					type: 'budget_merchant',
					id: mapping.id,
					merchant: mapping.merchant,
					error: error.message
				});
			}
		}

		// If this is the first batch (offset = 0), also do bulk pattern-based updates
		// This is more efficient for known merchant patterns
		if (offset === 0) {
			try {
				const bulkUpdates = await performBulkPatternUpdates(db, batchSize);
				updatedCount += bulkUpdates.paymentsUpdated;
				budgetMerchantsUpdated += bulkUpdates.budgetMerchantsUpdated;
				
				// Add any bulk update errors
				if (bulkUpdates.errors && bulkUpdates.errors.length > 0) {
					errors.push(...bulkUpdates.errors);
				}
			} catch (bulkError) {
				console.error('Bulk pattern updates failed:', bulkError);
				errors.push({
					type: 'bulk_update_failure',
					error: bulkError.message
				});
			}
		}

		return json({
			success: true,
			paymentsProcessed: payments.length,
			paymentsUpdated: updatedCount,
			budgetMerchantsUpdated,
			totalRemaining: totalRemaining - updatedCount,
			nextOffset: offset + batchSize,
			errors: errors.length > 0 ? errors : undefined,
			message: totalRemaining > batchSize 
				? `Processed batch. ${totalRemaining - updatedCount} payments remaining.`
				: 'All merchants normalized successfully!'
		});

	} catch (error) {
		console.error('Merchant normalization failed:', error);
		return json(
			{ 
				error: 'Failed to normalize merchants',
				details: error.message 
			},
			{ status: 500 }
		);
	}
}

/**
 * Perform bulk pattern-based updates for known merchant patterns
 * This is more efficient than processing each payment individually
 */
async function performBulkPatternUpdates(db, batchSize) {
	const updates = [
		// Amazon variations
		{
			pattern: "merchant LIKE '%AMAZON%' OR merchant LIKE '%AMZN%'",
			normalized: 'AMAZON',
			details: ''
		},
		// Caviar
		{
			pattern: "merchant LIKE 'CAVIAR%'",
			normalized: 'CAVIAR',
			details: "SUBSTR(merchant, 8)" // Everything after 'CAVIAR '
		},
		// DoorDash
		{
			pattern: "merchant LIKE 'DOORDASH%'",
			normalized: 'DOORDASH',
			details: "SUBSTR(merchant, 10)" // Everything after 'DOORDASH '
		},
		// Uber Eats
		{
			pattern: "merchant LIKE '%UBER EATS%'",
			normalized: 'UBER EATS',
			details: "REPLACE(merchant, 'UBER EATS', '')"
		},
		// Lyft
		{
			pattern: "merchant LIKE 'LYFT%'",
			normalized: 'LYFT',
			details: "SUBSTR(merchant, 6)" // Everything after 'LYFT '
		},
		// Uber (not Uber Eats)
		{
			pattern: "merchant LIKE 'UBER%' AND merchant NOT LIKE '%UBER EATS%'",
			normalized: 'UBER',
			details: "SUBSTR(merchant, 6)" // Everything after 'UBER '
		},
		// Airlines
		{
			pattern: "merchant LIKE '%UNITED%'",
			normalized: 'UNITED',
			details: "merchant"
		},
		{
			pattern: "merchant LIKE '%AMERICAN%'",
			normalized: 'AMERICAN',
			details: "merchant"
		},
		{
			pattern: "merchant LIKE '%DELTA%'",
			normalized: 'DELTA',
			details: "merchant"
		},
		{
			pattern: "merchant LIKE '%SOUTHWEST%'",
			normalized: 'SOUTHWEST',
			details: "merchant"
		},
		// Gas stations
		{
			pattern: "merchant LIKE '%SHELL%'",
			normalized: 'SHELL',
			details: ''
		},
		{
			pattern: "merchant LIKE '%EXXON%'",
			normalized: 'EXXON',
			details: ''
		},
		{
			pattern: "merchant LIKE '%CHEVRON%'",
			normalized: 'CHEVRON',
			details: ''
		},
		// Bluemercury
		{
			pattern: "merchant LIKE 'BLUEMERCURY%'",
			normalized: 'BLUEMERCURY',
			details: ''
		}
	];

	let totalUpdated = 0;
	const errors = [];

	for (const update of updates) {
		try {
			// Update payments
			let detailsField;
			if (update.details === 'merchant') {
				detailsField = 'merchant';
			} else if (update.details && update.details.startsWith('SUBSTR')) {
				detailsField = update.details;
			} else if (update.details && update.details.startsWith('REPLACE')) {
				detailsField = update.details;
			} else {
				detailsField = "''";
			}
			
			const sql = `
				UPDATE payment 
				SET merchant_normalized = ?,
					merchant_details = ${detailsField}
				WHERE (${update.pattern})
				AND merchant_normalized IS NULL
				LIMIT ?
			`;
			
			const result = await db
				.prepare(sql)
				.bind(update.normalized, batchSize)
				.run();
			
			const updated = result.changes || 0;
			totalUpdated += updated;


			
		} catch (error) {
			errors.push({
				type: 'bulk_update',
				pattern: update.pattern,
				normalized: update.normalized,
				error: error.message
			});
		}
	}

	return {
		paymentsUpdated: totalUpdated,
		errors
	};
}

/**
 * Get normalization status
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
		// Get statistics
		const stats = await db
			.prepare(
				`
				SELECT 
					COUNT(*) as total_payments,
					COUNT(CASE WHEN merchant_normalized IS NOT NULL AND merchant_normalized != merchant THEN 1 END) as normalized_payments,
					COUNT(CASE WHEN merchant_normalized IS NOT NULL THEN 1 END) as processed_payments,
					COUNT(DISTINCT merchant) as unique_merchants,
					COUNT(DISTINCT merchant_normalized) as unique_normalized_merchants
				FROM payment
				WHERE merchant IS NOT NULL
			`
			)
			.first();

		const budgetStats = await db
			.prepare(
				`
				SELECT 
					COUNT(*) as total_mappings,
					COUNT(merchant_normalized) as normalized_mappings
				FROM budget_merchant
			`
			)
			.first();

		// Get sample normalizations
		const { results: samples } = await db
			.prepare(
				`
				SELECT 
					merchant,
					merchant_normalized,
					merchant_details,
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

		return json({
			payments: {
				total: stats.total_payments,
				normalized: stats.normalized_payments,
				pending: stats.total_payments - stats.processed_payments,
				uniqueMerchants: stats.unique_merchants,
				uniqueNormalized: stats.unique_normalized_merchants
			},
			budgetMerchants: {
				total: budgetStats.total_mappings,
				normalized: budgetStats.normalized_mappings
			},
			samples,
			message: stats.processed_payments === stats.total_payments 
				? 'All merchants have been processed!' 
				: `${stats.total_payments - stats.processed_payments} payments still need processing`
		});

	} catch (error) {
		console.error('Failed to get normalization status:', error);
		return json(
			{ 
				error: 'Failed to get status',
				details: error.message 
			},
			{ status: 500 }
		);
	}
}
