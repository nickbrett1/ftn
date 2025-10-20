import { json } from '@sveltejs/kit';
import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Admin endpoint to normalize existing merchant data
 * This processes payments and budget merchants in batches to avoid timeouts.
 *
 * The normalization now intelligently updates only records that actually need changes,
 * ensuring consistency between payments and budget merchants while avoiding unnecessary database updates.
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

		// Get payments to normalize (process all since we're always updating)
		const { results: payments } = await db
			.prepare(
				`
				SELECT id, merchant, merchant_normalized, merchant_details
				FROM payment 
				WHERE merchant IS NOT NULL
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

				// Debug logging for PINKBERRY
				if (payment.merchant && payment.merchant.includes('PINKBERRY')) {
					console.log('PINKBERRY Payment:', {
						id: payment.id,
						merchant: payment.merchant,
						current_normalized: payment.merchant_normalized,
						new_normalized: normalized.merchant_normalized,
						will_update: normalized.merchant_normalized !== payment.merchant_normalized
					});
				}

				// Only update if normalization actually changed something
				if (
					normalized.merchant_normalized !== payment.merchant_normalized ||
					normalized.merchant_details !== (payment.merchant_details || '')
				) {
					await db
						.prepare(
							`
							UPDATE payment 
							SET merchant_normalized = ?,
								merchant_details = ?
							WHERE id = ?
						`
						)
						.bind(normalized.merchant_normalized, normalized.merchant_details || '', payment.id)
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

		// Get total count of payments to normalize
		const { results: countResult } = await db
			.prepare(
				`
				SELECT COUNT(*) as total
				FROM payment 
				WHERE merchant IS NOT NULL
			`
			)
			.all();

		const totalRemaining = countResult[0]?.total || 0;

		// Also normalize budget_merchant records - enhanced to handle all cases
		const { results: budgetMerchants } = await db
			.prepare(
				`
				SELECT id, merchant_normalized, budget_id
				FROM budget_merchant 
				WHERE merchant_normalized IS NOT NULL
				ORDER BY id
				LIMIT ?
			`
			)
			.bind(batchSize)
			.all();

		let budgetMerchantsUpdated = 0;
		const processedMappings = new Map(); // Track processed budget_id + normalized_merchant combinations
		
		for (const mapping of budgetMerchants) {
			try {
				const normalized = normalizeMerchant(mapping.merchant_normalized);
				const key = `${mapping.budget_id}-${normalized.merchant_normalized}`;

				// Only update if normalization actually changed something
				if (normalized.merchant_normalized !== mapping.merchant_normalized) {
					// Check if we've already processed this budget_id + normalized_merchant combination
					if (processedMappings.has(key)) {
						// This is a duplicate - remove it
						await db
							.prepare('DELETE FROM budget_merchant WHERE id = ?')
							.bind(mapping.id)
							.run();
						budgetMerchantsUpdated++;
					} else {
						// Update the merchant_normalized field
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
						processedMappings.set(key, true);
						budgetMerchantsUpdated++;
					}
				} else {
					// No normalization change, but still track to detect duplicates
					if (processedMappings.has(key)) {
						// This is a duplicate - remove it
						await db
							.prepare('DELETE FROM budget_merchant WHERE id = ?')
							.bind(mapping.id)
							.run();
						budgetMerchantsUpdated++;
					} else {
						processedMappings.set(key, true);
					}
				}
			} catch (error) {
				errors.push({
					type: 'budget_merchant',
					id: mapping.id,
					merchant: mapping.merchant_normalized,
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

				// Also do bulk updates for budget merchants
				const budgetBulkUpdates = await performBudgetMerchantBulkUpdates(db, batchSize);
				budgetMerchantsUpdated += budgetBulkUpdates.updated;
				if (budgetBulkUpdates.errors && budgetBulkUpdates.errors.length > 0) {
					errors.push(...budgetBulkUpdates.errors);
				}

				// Ensure consistency between payments and budget merchants
				const consistencyUpdates = await ensurePaymentBudgetConsistency(db);
				budgetMerchantsUpdated += consistencyUpdates.updated;
				if (consistencyUpdates.errors && consistencyUpdates.errors.length > 0) {
					errors.push(...consistencyUpdates.errors);
				}

				// Handle store number variations that normalize to the same merchant
				// This ensures that PINKBERRY 15012 NEW YORK and PINKBERRY 15038 NEW YORK
				// don't create duplicate entries in budget_merchant
				const consolidatedUpdates = await consolidateStoreVariations(db);
				budgetMerchantsUpdated += consolidatedUpdates;
			} catch (bulkError) {
				console.error('Bulk pattern updates failed:', bulkError);
				errors.push({
					type: 'bulk_update_failure',
					error: bulkError.message
				});
			}
		}

		// Debug: Check PINKBERRY data
		const { results: pinkberryData } = await db
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

		return json({
			success: true,
			paymentsProcessed: payments.length,
			paymentsUpdated: updatedCount,
			budgetMerchantsUpdated,
			totalRemaining: totalRemaining - updatedCount,
			nextOffset: offset + batchSize,
			errors: errors.length > 0 ? errors : undefined,
			debug: {
				pinkberryData
			},
			message:
				totalRemaining > batchSize
					? `Processed batch. ${totalRemaining - updatedCount} payments remaining.`
					: 'All merchants and budget mappings normalized successfully! Only records that needed updates were modified.'
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
			details: 'SUBSTR(merchant, 8)' // Everything after 'CAVIAR '
		},
		// DoorDash
		{
			pattern: "merchant LIKE 'DOORDASH%'",
			normalized: 'DOORDASH',
			details: 'SUBSTR(merchant, 10)' // Everything after 'DOORDASH '
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
			details: 'SUBSTR(merchant, 6)' // Everything after 'LYFT '
		},
		// Uber (not Uber Eats)
		{
			pattern: "merchant LIKE 'UBER%' AND merchant NOT LIKE '%UBER EATS%'",
			normalized: 'UBER',
			details: 'SUBSTR(merchant, 6)' // Everything after 'UBER '
		},
		// Airlines
		{
			pattern: "merchant LIKE '%UNITED%'",
			normalized: 'UNITED',
			details: 'merchant'
		},
		{
			pattern: "merchant LIKE '%AMERICAN%'",
			normalized: 'AMERICAN',
			details: 'merchant'
		},
		{
			pattern: "merchant LIKE '%DELTA%'",
			normalized: 'DELTA',
			details: 'merchant'
		},
		{
			pattern: "merchant LIKE '%SOUTHWEST%'",
			normalized: 'SOUTHWEST',
			details: 'merchant'
		},
		{
			pattern: "merchant LIKE '%BRITISH%'",
			normalized: 'BRITISH AIRWAYS',
			details: 'merchant'
		},
		// Update existing AIRLINE records to UNKNOWN AIRLINE
		{
			pattern: "merchant_normalized = 'AIRLINE'",
			normalized: 'UNKNOWN AIRLINE',
			details: 'merchant'
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
		},
		// Google Cloud
		{
			pattern: "merchant LIKE '%GOOGLE%CLOUD%' OR merchant LIKE '%GOOGLE *CLOUD%'",
			normalized: 'GOOGLE CLOUD',
			details: ''
		},
		// PlayStation Network
		{
			pattern: "merchant LIKE '%PLAYSTATION%NETWORK%' OR merchant LIKE '%PLAYSTATION%NETWORK%'",
			normalized: 'PLAYSTATION NETWORK',
			details: ''
		},
		// Apple services
		{
			pattern: "merchant LIKE '%APPLE%'",
			normalized: 'APPLE',
			details: 'merchant'
		},
		// Store number variations (e.g., PINKBERRY 15012 NEW YORK)
		// This will be handled by the merchant normalizer function instead of SQL patterns
		// since SQLite doesn't have good regex support
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
			AND (merchant_normalized != ? OR merchant_normalized IS NULL)
		`;

			const result = await db.prepare(sql).bind(update.normalized, update.normalized).run();

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
 * Perform bulk pattern-based updates for budget merchants
 * This ensures budget merchant mappings stay in sync with payment normalization
 * 
 * Handles UNIQUE constraint violations by:
 * 1. Grouping merchants by budget_id
 * 2. If budget already has the normalized merchant, remove all matching merchants
 * 3. If budget doesn't have the normalized merchant, update the first one and remove duplicates
 * 
 * This prevents the UNIQUE constraint error: budget_merchant.budget_id, budget_merchant.merchant_normalized
 */
async function performBudgetMerchantBulkUpdates(db, batchSize) {
	const updates = [
		// Amazon variations
		{
			pattern: "merchant LIKE '%AMAZON%' OR merchant LIKE '%AMZN%'",
			normalized: 'AMAZON'
		},
		// Caviar
		{
			pattern: "merchant LIKE 'CAVIAR%'",
			normalized: 'CAVIAR'
		},
		// DoorDash
		{
			pattern: "merchant LIKE 'DOORDASH%'",
			normalized: 'DOORDASH'
		},
		// Uber Eats
		{
			pattern: "merchant LIKE '%UBER EATS%'",
			normalized: 'UBER EATS'
		},
		// Lyft
		{
			pattern: "merchant LIKE 'LYFT%'",
			normalized: 'LYFT'
		},
		// Uber (not Uber Eats)
		{
			pattern: "merchant LIKE 'UBER%' AND merchant NOT LIKE '%UBER EATS%'",
			normalized: 'UBER'
		},
		// Airlines
		{
			pattern: "merchant LIKE '%UNITED%'",
			normalized: 'UNITED'
		},
		{
			pattern: "merchant LIKE '%AMERICAN%'",
			normalized: 'AMERICAN'
		},
		{
			pattern: "merchant LIKE '%DELTA%'",
			normalized: 'DELTA'
		},
		{
			pattern: "merchant LIKE '%SOUTHWEST%'",
			normalized: 'SOUTHWEST'
		},
		{
			pattern: "merchant LIKE '%BRITISH%'",
			normalized: 'BRITISH AIRWAYS'
		},
		// Update existing AIRLINE records to UNKNOWN AIRLINE
		{
			pattern: "merchant_normalized = 'AIRLINE'",
			normalized: 'UNKNOWN AIRLINE'
		},
		// Gas stations
		{
			pattern: "merchant LIKE '%SHELL%'",
			normalized: 'SHELL'
		},
		{
			pattern: "merchant LIKE '%EXXON%'",
			normalized: 'EXXON'
		},
		{
			pattern: "merchant LIKE '%CHEVRON%'",
			normalized: 'CHEVRON'
		},
		// Bluemercury
		{
			pattern: "merchant LIKE 'BLUEMERCURY%'",
			normalized: 'BLUEMERCURY'
		},
		// Google Cloud
		{
			pattern: "merchant LIKE '%GOOGLE%CLOUD%' OR merchant LIKE '%GOOGLE *CLOUD%'",
			normalized: 'GOOGLE CLOUD'
		},
		// PlayStation Network
		{
			pattern: "merchant LIKE '%PLAYSTATION%NETWORK%' OR merchant LIKE '%PLAYSTATION%NETWORK%'",
			normalized: 'PLAYSTATION NETWORK'
		},
		// Apple services
		{
			pattern: "merchant LIKE '%APPLE%'",
			normalized: 'APPLE'
		}
	];

	let totalUpdated = 0;
	let totalRemoved = 0;
	const errors = [];

	for (const update of updates) {
		try {
			// First, find all budget merchants that match this pattern and would be normalized
			const { results: matchingMerchants } = await db
				.prepare(
					`
					SELECT id, budget_id, merchant, merchant_normalized
					FROM budget_merchant 
					WHERE (${update.pattern})
					AND (merchant_normalized != ? OR merchant_normalized IS NULL)
					ORDER BY budget_id, id
				`
				)
				.bind(update.normalized)
				.all();

			// Group by budget_id to handle duplicates
			const budgetGroups = {};
			for (const merchant of matchingMerchants) {
				if (!budgetGroups[merchant.budget_id]) {
					budgetGroups[merchant.budget_id] = [];
				}
				budgetGroups[merchant.budget_id].push(merchant);
			}

			// Process each budget group
			for (const [budgetId, merchants] of Object.entries(budgetGroups)) {
				try {
					// Check if this budget already has the normalized merchant
					const { results: existingNormalized } = await db
						.prepare(
							`
							SELECT id FROM budget_merchant 
							WHERE budget_id = ? AND merchant_normalized = ?
						`
						)
						.bind(budgetId, update.normalized)
						.all();

					if (existingNormalized.length > 0) {
						// Budget already has the normalized merchant, remove all matching merchants
						for (const merchant of merchants) {
							await db
								.prepare('DELETE FROM budget_merchant WHERE id = ?')
								.bind(merchant.id)
								.run();
							totalRemoved++;
						}
					} else {
						// Update the first merchant to the normalized form, remove the rest
						const [firstMerchant, ...remainingMerchants] = merchants;
						
						// Update the first one
						await db
							.prepare(
								'UPDATE budget_merchant SET merchant_normalized = ? WHERE id = ?'
							)
							.bind(update.normalized, firstMerchant.id)
							.run();
						totalUpdated++;

						// Remove the rest
						for (const merchant of remainingMerchants) {
							await db
								.prepare('DELETE FROM budget_merchant WHERE id = ?')
								.bind(merchant.id)
								.run();
							totalRemoved++;
						}
					}
				} catch (budgetError) {
					// Log the specific budget error but continue with other budgets
					console.error(`Error processing budget ${budgetId} for pattern ${update.pattern}:`, budgetError);
					errors.push({
						type: 'budget_merchant_budget_error',
						budgetId: parseInt(budgetId),
						pattern: update.pattern,
						normalized: update.normalized,
						error: budgetError.message
					});
				}
			}
		} catch (error) {
			errors.push({
				type: 'budget_merchant_bulk_update',
				pattern: update.pattern,
				normalized: update.normalized,
				error: error.message
			});
		}
	}

	return {
		updated: totalUpdated,
		removed: totalRemoved,
		errors
	};
}

/**
 * Ensure consistency between payments and budget merchants
 * This updates budget merchant mappings to match the normalized values from payments
 */
async function ensurePaymentBudgetConsistency(db) {
	try {
		// Find budget merchants that have inconsistent normalization with payments
		const { results: inconsistentMappings } = await db
			.prepare(
				`
				SELECT DISTINCT bm.id, bm.merchant, bm.merchant_normalized, p.merchant_normalized as payment_normalized
				FROM budget_merchant bm
				JOIN payment p ON bm.merchant = p.merchant
				WHERE bm.merchant_normalized != p.merchant_normalized
				  AND p.merchant_normalized IS NOT NULL
				LIMIT 100
			`
			)
			.all();

		let updated = 0;
		const errors = [];

		for (const mapping of inconsistentMappings) {
			try {
				// Update budget merchant to match payment normalization
				await db
					.prepare(
						`
						UPDATE budget_merchant 
						SET merchant_normalized = ?
						WHERE id = ?
					`
					)
					.bind(mapping.payment_normalized, mapping.id)
					.run();

				updated++;
			} catch (error) {
				errors.push({
					type: 'consistency_update',
					id: mapping.id,
					merchant: mapping.merchant,
					oldNormalized: mapping.merchant_normalized,
					newNormalized: mapping.payment_normalized,
					error: error.message
				});
			}
		}

		return { updated, errors };
	} catch (error) {
		console.error('Payment-budget consistency check failed:', error);
		return {
			updated: 0,
			errors: [
				{
					type: 'consistency_check_failure',
					error: error.message
				}
			]
		};
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

		// Get UNITED airlines specific information
		const { results: unitedInfo } = await db
			.prepare(
				`
				SELECT 
					merchant_normalized,
					COUNT(*) as count
				FROM payment
				WHERE merchant LIKE '%UNITED%'
				GROUP BY merchant_normalized
				ORDER BY count DESC
			`
			)
			.all();

		// Get merchants that still need normalization
		const { results: pendingMerchants } = await db
			.prepare(
				`
				SELECT 
					merchant,
					COUNT(*) as count
				FROM payment
				WHERE merchant_normalized IS NULL OR merchant_normalized = merchant
				GROUP BY merchant
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
			unitedInfo,
			pendingMerchants,
			message:
				stats.processed_payments === stats.total_payments
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

/**
 * Consolidate merchant variations that normalize to the same merchant name
 * This handles cases like:
 * - Store number patterns: PINKBERRY 15012 NEW YORK and PINKBERRY 15038 NEW YORK
 * - Address patterns: TST* DIG INN- 100 W 67 NEW YORK and TST* DIG INN- 100 W 67TH NEW YORK
 * - Any other variations that normalize to the same merchant name
 */
async function consolidateStoreVariations(db) {
	let consolidatedCount = 0;
	
	try {
		// First, find all exact duplicates (same budget_id and merchant_normalized)
		const { results: exactDuplicates } = await db
			.prepare(
				`
				SELECT bm1.budget_id, bm1.merchant_normalized, bm1.id as id1, bm2.id as id2
				FROM budget_merchant bm1
				JOIN budget_merchant bm2 ON bm1.budget_id = bm2.budget_id 
					AND bm1.merchant_normalized = bm2.merchant_normalized
					AND bm1.id < bm2.id
				`
			)
			.all();

		// Remove the duplicate entries
		for (const duplicate of exactDuplicates) {
			await db
				.prepare('DELETE FROM budget_merchant WHERE id = ?')
				.bind(duplicate.id2)
				.run();
			consolidatedCount++;
		}

		// Now handle cases where we have variations that should normalize to the same merchant
		// but might not have been properly normalized yet
		// Get all unique merchant_normalized values for each budget
		const { results: budgetMerchants } = await db
			.prepare(
				`
				SELECT budget_id, merchant_normalized, COUNT(*) as count
				FROM budget_merchant 
				GROUP BY budget_id, merchant_normalized
				ORDER BY budget_id, merchant_normalized
				`
			)
			.all();

		// Group by budget_id and check for variations that normalize to the same merchant
		const budgetGroups = new Map();
		for (const bm of budgetMerchants) {
			if (!budgetGroups.has(bm.budget_id)) {
				budgetGroups.set(bm.budget_id, []);
			}
			budgetGroups.get(bm.budget_id).push(bm.merchant_normalized);
		}

		// For each budget, check if any merchants normalize to the same name
		for (const [budgetId, merchants] of budgetGroups) {
			const normalizedGroups = new Map();
			
			// Group merchants by their normalized form
			for (const merchant of merchants) {
				const normalized = normalizeMerchant(merchant);
				if (!normalizedGroups.has(normalized.merchant_normalized)) {
					normalizedGroups.set(normalized.merchant_normalized, []);
				}
				normalizedGroups.get(normalized.merchant_normalized).push(merchant);
			}
			
			// For each normalized group, consolidate if there are multiple variations
			for (const [normalizedName, variations] of normalizedGroups) {
				if (variations.length > 1) {
					// Get all IDs for these variations
					const { results: variationIds } = await db
						.prepare(
							`
							SELECT id FROM budget_merchant 
							WHERE budget_id = ? AND merchant_normalized IN (${variations.map(() => '?').join(',')})
							ORDER BY id
							`
						)
						.bind(budgetId, ...variations)
						.all();
					
					if (variationIds.length > 1) {
						// Keep the first entry, delete the rest
						const [keepId, ...deleteIds] = variationIds.map(r => r.id);
						
						// Update the first entry to the normalized name
						await db
							.prepare('UPDATE budget_merchant SET merchant_normalized = ? WHERE id = ?')
							.bind(normalizedName, keepId)
							.run();
						
						// Delete all other entries
						for (const deleteId of deleteIds) {
							await db
								.prepare('DELETE FROM budget_merchant WHERE id = ?')
								.bind(deleteId)
								.run();
							consolidatedCount++;
						}
					}
				}
			}
		}

		// After normalization, remove any new duplicates that were created
		const { results: newDuplicates } = await db
			.prepare(
				`
				SELECT bm1.budget_id, bm1.merchant_normalized, bm1.id as id1, bm2.id as id2
				FROM budget_merchant bm1
				JOIN budget_merchant bm2 ON bm1.budget_id = bm2.budget_id 
					AND bm1.merchant_normalized = bm2.merchant_normalized
					AND bm1.id < bm2.id
				`
			)
			.all();

		// Remove the duplicate entries
		for (const duplicate of newDuplicates) {
			await db
				.prepare('DELETE FROM budget_merchant WHERE id = ?')
				.bind(duplicate.id2)
				.run();
			consolidatedCount++;
		}

	} catch (error) {
		console.error('Error consolidating merchant variations:', error);
		throw error;
	}

	return consolidatedCount;
}
