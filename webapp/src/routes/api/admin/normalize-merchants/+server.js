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
				pending: stats.total_payments - stats.normalized_payments,
				uniqueMerchants: stats.unique_merchants,
				uniqueNormalized: stats.unique_normalized_merchants
			},
			budgetMerchants: {
				total: budgetStats.total_mappings,
				normalized: budgetStats.normalized_mappings
			},
			samples,
			message: stats.normalized_payments === stats.total_payments 
				? 'All merchants are normalized!' 
				: `${stats.total_payments - stats.normalized_payments} payments need normalization`
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
