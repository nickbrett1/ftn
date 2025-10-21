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
		// If offset is 0, process all records; otherwise process in batches
		let payments;
		if (offset === 0) {
			// Process all records at once for the first run
			const { results: allPayments } = await db
				.prepare(
					`
					SELECT id, merchant, merchant_normalized, merchant_details
					FROM payment 
					WHERE merchant IS NOT NULL
					ORDER BY id
				`
				)
				.all();
			payments = allPayments;
		} else {
			// Process in batches for subsequent runs
			const { results: batchPayments } = await db
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
			payments = batchPayments;
		}

		let updatedCount = 0;
		const errors = [];

		// Process each payment
		for (const payment of payments) {
			try {
				const normalized = normalizeMerchant(payment.merchant);

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
		// If offset is 0, process all records; otherwise process in batches
		let budgetMerchants;
		if (offset === 0) {
			// Process all budget merchant records at once for the first run
			const { results: allBudgetMerchants } = await db
				.prepare(
					`
					SELECT id, merchant, merchant_normalized, budget_id
					FROM budget_merchant 
					WHERE merchant IS NOT NULL
					ORDER BY id
				`
				)
				.all();
			budgetMerchants = allBudgetMerchants;
		} else {
			// Process in batches for subsequent runs
			const { results: batchBudgetMerchants } = await db
				.prepare(
					`
					SELECT id, merchant, merchant_normalized, budget_id
					FROM budget_merchant 
					WHERE merchant IS NOT NULL
					ORDER BY id
					LIMIT ?
				`
				)
				.bind(batchSize)
				.all();
			budgetMerchants = batchBudgetMerchants;
		}

		let budgetMerchantsUpdated = 0;
		for (const mapping of budgetMerchants) {
			try {
				const normalized = normalizeMerchant(mapping.merchant);

				// Only update if normalization actually changed something
				if (normalized.merchant_normalized !== mapping.merchant_normalized) {
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
				}
			} catch (error) {
				errors.push({
					type: 'budget_merchant',
					id: mapping.id,
					merchant: mapping.merchant,
					error: error.message
				});
			}
		}

		// If this is the first run (offset = 0), also do bulk pattern-based updates
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

		// Check for merchants that are assigned to budgets but still appear as unassigned
		const assignmentCheck = await checkAssignmentConsistency(db);
		if (assignmentCheck.inconsistencies && assignmentCheck.inconsistencies.length > 0) {
			errors.push({
				type: 'assignment_inconsistency',
				message: `Found ${assignmentCheck.inconsistencies.length} merchants assigned to budgets but appearing as unassigned`,
				inconsistencies: assignmentCheck.inconsistencies.slice(0, 10) // Limit to first 10 for reporting
			});
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
			totalRemaining: offset === 0 ? 0 : totalRemaining - updatedCount,
			nextOffset: offset === 0 ? 0 : offset + batchSize,
			errors: errors.length > 0 ? errors : undefined,
			message:
				offset === 0
					? 'All merchants and budget mappings normalized successfully! Only records that needed updates were modified.'
					: totalRemaining > batchSize
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
		
		// Address format variations (e.g., TST* DIG INN- 100 W 67 NEW YORK)
		// These will be handled by the merchant normalizer function instead of SQL patterns
		// since SQLite doesn't have good regex support for complex address patterns
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
 * 
 * The key improvement: instead of matching on exact merchant names, we now:
 * 1. Get all unique normalized merchant names from payments
 * 2. For each normalized name, find all budget merchants that should normalize to the same value
 * 3. Update budget merchants to use the canonical normalized form from payments
 */
async function ensurePaymentBudgetConsistency(db) {
	try {
		// Get all unique normalized merchant names from payments
		const { results: paymentNormalized } = await db
			.prepare(
				`
				SELECT DISTINCT merchant_normalized
				FROM payment 
				WHERE merchant_normalized IS NOT NULL
				ORDER BY merchant_normalized
			`
			)
			.all();

		let updated = 0;
		const errors = [];

		// For each normalized merchant name from payments, check budget merchants
		for (const paymentMerchant of paymentNormalized) {
			const normalizedName = paymentMerchant.merchant_normalized;
			
			// Find all budget merchants that should normalize to this name
			const { results: budgetMerchants } = await db
				.prepare(
					`
					SELECT id, merchant, merchant_normalized
					FROM budget_merchant 
					WHERE merchant IS NOT NULL
					ORDER BY id
				`
				)
				.all();

			// Check each budget merchant to see if it should normalize to this payment merchant
			for (const budgetMerchant of budgetMerchants) {
				try {
					const normalized = normalizeMerchant(budgetMerchant.merchant);
					
					// If this budget merchant should normalize to the same value as the payment merchant
					// but currently has a different normalized value, update it
					if (normalized.merchant_normalized === normalizedName && 
						budgetMerchant.merchant_normalized !== normalizedName) {
						
						await db
							.prepare(
								`
								UPDATE budget_merchant 
								SET merchant_normalized = ?
								WHERE id = ?
							`
							)
							.bind(normalizedName, budgetMerchant.id)
							.run();

						updated++;
					}
				} catch (error) {
					errors.push({
						type: 'consistency_update',
						id: budgetMerchant.id,
						merchant: budgetMerchant.merchant,
						oldNormalized: budgetMerchant.merchant_normalized,
						newNormalized: normalizedName,
						error: error.message
					});
				}
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
 * Check for merchants that are assigned to budgets but still appear as unassigned
 * This helps identify normalization inconsistencies that cause the modal bug
 */
async function checkAssignmentConsistency(db) {
	try {
		// Get all merchants that are assigned to budgets
		const { results: assignedMerchants } = await db
			.prepare(
				`
				SELECT DISTINCT merchant_normalized
				FROM budget_merchant 
				WHERE merchant_normalized IS NOT NULL
				ORDER BY merchant_normalized
			`
			)
			.all();

		const inconsistencies = [];

		// For each assigned merchant, check if it appears in the unassigned query
		for (const assigned of assignedMerchants) {
			const normalizedName = assigned.merchant_normalized;
			
			// Check if this merchant appears in the unassigned merchants query
			const { results: unassignedCheck } = await db
				.prepare(
					`
					SELECT DISTINCT p.merchant_normalized
					FROM payment p
					JOIN statement s ON p.statement_id = s.id
					WHERE p.merchant_normalized = ?
					  AND NOT EXISTS (
						SELECT 1 FROM budget_merchant bm 
						WHERE LOWER(bm.merchant_normalized) = LOWER(p.merchant_normalized)
					  )
					LIMIT 1
				`
				)
				.bind(normalizedName)
				.all();

			if (unassignedCheck.length > 0) {
				// This merchant is assigned but still appears as unassigned
				// Get more details about the assignment
				const { results: assignmentDetails } = await db
					.prepare(
						`
						SELECT bm.id, bm.merchant, bm.merchant_normalized, bm.budget_id
						FROM budget_merchant bm
						WHERE bm.merchant_normalized = ?
						LIMIT 5
					`
					)
					.bind(normalizedName)
					.all();

				inconsistencies.push({
					merchant_normalized: normalizedName,
					assignments: assignmentDetails
				});
			}
		}

		return { inconsistencies };
	} catch (error) {
		console.error('Assignment consistency check failed:', error);
		return {
			inconsistencies: [],
			error: error.message
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
 * Debug endpoint to check specific merchant assignments
 */
export async function PUT(event) {
	// Require authentication
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const db = event.platform?.env?.CCBILLING_DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		const body = await event.request.json();
		const merchantName = body.merchant;

		if (!merchantName) {
			return json({ error: 'Merchant name required' }, { status: 400 });
		}

		// Normalize the merchant name
		const normalized = normalizeMerchant(merchantName);

		// Check if this merchant is assigned to any budget
		const { results: assignments } = await db
			.prepare(
				`
				SELECT bm.id, bm.merchant, bm.merchant_normalized, bm.budget_id
				FROM budget_merchant bm
				WHERE LOWER(bm.merchant_normalized) = LOWER(?)
				ORDER BY bm.budget_id
			`
			)
			.bind(normalized.merchant_normalized)
			.all();

		// Check if this merchant appears in the unassigned query
		const { results: unassignedCheck } = await db
			.prepare(
				`
				SELECT DISTINCT p.merchant_normalized, p.merchant
				FROM payment p
				JOIN statement s ON p.statement_id = s.id
				WHERE LOWER(p.merchant_normalized) = LOWER(?)
				  AND NOT EXISTS (
					SELECT 1 FROM budget_merchant bm 
					WHERE LOWER(bm.merchant_normalized) = LOWER(p.merchant_normalized)
				  )
				LIMIT 5
			`
			)
			.bind(normalized.merchant_normalized)
			.all();

		// Get all variations of this merchant in the database
		const { results: allVariations } = await db
			.prepare(
				`
				SELECT DISTINCT p.merchant, p.merchant_normalized, 'payment' as source
				FROM payment p
				WHERE LOWER(p.merchant_normalized) = LOWER(?)
				UNION ALL
				SELECT DISTINCT bm.merchant, bm.merchant_normalized, 'budget_merchant' as source
				FROM budget_merchant bm
				WHERE LOWER(bm.merchant_normalized) = LOWER(?)
				ORDER BY source, merchant
			`
			)
			.bind(normalized.merchant_normalized, normalized.merchant_normalized)
			.all();

		return json({
			merchant: merchantName,
			normalized: normalized.merchant_normalized,
			assignments: assignments,
			appearsAsUnassigned: unassignedCheck.length > 0,
			unassignedVariations: unassignedCheck,
			allVariations: allVariations,
			isInconsistent: assignments.length > 0 && unassignedCheck.length > 0
		});
	} catch (error) {
		console.error('Debug check failed:', error);
		return json(
			{
				error: 'Debug check failed',
				details: error.message
			},
			{ status: 500 }
		);
	}
}
