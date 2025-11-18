import { json } from '@sveltejs/kit';
import { normalizeMerchant } from '$lib/utils/merchant-normalizer.js';
import { requireUser } from '$lib/server/require-user.js';

async function getPayments(database, batchSize, offset) {
	const query = `
		SELECT id, merchant, merchant_normalized, merchant_details
		FROM payment
		WHERE merchant IS NOT NULL
		ORDER BY id
		${offset === 0 ? '' : 'LIMIT ? OFFSET ?'}
	`;
	const parameters = offset === 0 ? [] : [batchSize, offset];
	const { results } = await database
		.prepare(query)
		.bind(...parameters)
		.all();
	return results;
}

async function getBudgetMerchants(database, batchSize, offset) {
	const query = `
		SELECT id, merchant, merchant_normalized, budget_id
		FROM budget_merchant
		WHERE merchant IS NOT NULL
		ORDER BY id
		${offset === 0 ? '' : 'LIMIT ?'}
	`;
	const parameters = offset === 0 ? [] : [batchSize];
	const { results } = await database
		.prepare(query)
		.bind(...parameters)
		.all();
	return results;
}

async function normalizePayments(database, payments) {
	let updatedCount = 0;
	const errors = [];
	for (const payment of payments) {
		try {
			const normalized = normalizeMerchant(payment.merchant);
			const currentDetails = payment.merchant_details || '';
			const newDetails = normalized.merchant_details || '';

			if (
				normalized.merchant_normalized !== payment.merchant_normalized ||
				newDetails !== currentDetails
			) {
				await database
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
	return { updatedCount, errors };
}

async function normalizeBudgetMerchants(database, budgetMerchants) {
	let budgetMerchantsUpdated = 0;
	const errors = [];
	for (const mapping of budgetMerchants) {
		try {
			const normalized = normalizeMerchant(mapping.merchant);
			if (normalized.merchant_normalized !== mapping.merchant_normalized) {
				await database
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
	return { budgetMerchantsUpdated, errors };
}

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

	const database = event.platform?.env?.CCBILLING_DB;
	if (!database) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Get batch size from request body or use default
		const body = await event.request.json().catch(() => ({}));
		const batchSize = body.batchSize || 50;
		const offset = body.offset || 0;

		const payments = await getPayments(database, batchSize, offset);
		let { updatedCount, errors: paymentErrors } = await normalizePayments(database, payments);

		const budgetMerchants = await getBudgetMerchants(database, batchSize, offset);
		let { budgetMerchantsUpdated, errors: budgetErrors } = await normalizeBudgetMerchants(
			database,
			budgetMerchants
		);

		const errors = [...paymentErrors, ...budgetErrors];

		if (offset === 0 && updatedCount < 3) {
			const bulkUpdates = await performBulkPatternUpdates(database);
			updatedCount += bulkUpdates.paymentsUpdated;
			budgetMerchantsUpdated += bulkUpdates.budgetMerchantsUpdated;
			errors.push(...(bulkUpdates.errors || []));

			const budgetBulkUpdates = await performBudgetMerchantBulkUpdates(database);
			budgetMerchantsUpdated += budgetBulkUpdates.updated;
			errors.push(...(budgetBulkUpdates.errors || []));
		}

		const consistencyUpdates = await ensurePaymentBudgetConsistency(database);
		budgetMerchantsUpdated += consistencyUpdates.updated;
		errors.push(...(consistencyUpdates.errors || []));

		const assignmentCheck = await checkAssignmentConsistency(database);
		if (assignmentCheck.inconsistencies && assignmentCheck.inconsistencies.length > 0) {
			errors.push({
				type: 'assignment_inconsistency',
				message: `Found ${
					assignmentCheck.inconsistencies.length
				} merchants assigned to budgets but appearing as unassigned`,
				inconsistencies: assignmentCheck.inconsistencies.slice(0, 10) // Limit to first 10 for reporting
			});
		}

		const duplicateCheck = await checkDuplicateMerchantVariations(database);
		if (duplicateCheck.duplicateVariations && duplicateCheck.duplicateVariations.length > 0) {
			errors.push({
				type: 'duplicate_merchant_variations',
				message: `Found ${
					duplicateCheck.duplicateVariations.length
				} merchants with multiple variations having different assignment statuses`,
				duplicateVariations: duplicateCheck.duplicateVariations.slice(0, 10) // Limit to first 10 for reporting
			});
		}

		const { results: countResult } = await database
			.prepare(
				`
				SELECT COUNT(*) as total
				FROM payment
				WHERE merchant IS NOT NULL
			`
			)
			.all();

		const totalRemaining = countResult[0]?.total || 0;

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
const updatePatterns = [
	{
		pattern: "merchant LIKE '%AMAZON%' OR merchant LIKE '%AMZN%'",
		normalized: 'AMAZON',
		details: ''
	},
	{
		pattern: "merchant LIKE 'CAVIAR%'",
		normalized: 'CAVIAR',
		details: 'SUBSTR(merchant, 8)'
	},
	{
		pattern: "merchant LIKE 'DOORDASH%'",
		normalized: 'DOORDASH',
		details: 'SUBSTR(merchant, 10)'
	},
	{
		pattern: "merchant LIKE '%UBER EATS%'",
		normalized: 'UBER EATS',
		details: "REPLACE(merchant, 'UBER EATS', '')"
	},
	{
		pattern: "merchant LIKE 'LYFT%'",
		normalized: 'LYFT',
		details: 'SUBSTR(merchant, 6)'
	},
	{
		pattern: "merchant LIKE 'UBER%' AND merchant NOT LIKE '%UBER EATS%'",
		normalized: 'UBER',
		details: 'SUBSTR(merchant, 6)'
	},
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
	{
		pattern: "merchant LIKE 'BLUEMERCURY%'",
		normalized: 'BLUEMERCURY',
		details: ''
	},
	{
		pattern: "merchant LIKE '%GOOGLE%CLOUD%' OR merchant LIKE '%GOOGLE *CLOUD%'",
		normalized: 'GOOGLE CLOUD',
		details: ''
	},
	{
		pattern: "merchant LIKE '%PLAYSTATION%NETWORK%' OR merchant LIKE '%PLAYSTATION%NETWORK%'",
		normalized: 'PLAYSTATION NETWORK',
		details: ''
	},
	{
		pattern: "merchant LIKE '%APPLE%'",
		normalized: 'APPLE',
		details: 'merchant'
	}
];

async function performBulkPatternUpdates(database) {
	const updates = updatePatterns;
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
		AND merchant IS NOT NULL
	`;

			const result = await database.prepare(sql).bind(update.normalized, update.normalized).run();

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
async function performBudgetMerchantBulkUpdates(database) {
	const updates = updatePatterns;
	let totalUpdated = 0;
	let totalRemoved = 0;
	const errors = [];

	for (const update of updates) {
		try {
			const { results: matchingMerchants } = await database
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
			const budgetGroups = {};
			for (const merchant of matchingMerchants) {
				if (!budgetGroups[merchant.budget_id]) {
					budgetGroups[merchant.budget_id] = [];
				}
				budgetGroups[merchant.budget_id].push(merchant);
			}
			for (const [budgetId, merchants] of Object.entries(budgetGroups)) {
				try {
					const { results: existingNormalized } = await database
						.prepare(
							`
			SELECT id FROM budget_merchant
			WHERE budget_id = ? AND merchant_normalized = ?
		`
						)
						.bind(budgetId, update.normalized)
						.all();

					if (existingNormalized.length > 0) {
						for (const merchant of merchants) {
							await database
								.prepare('DELETE FROM budget_merchant WHERE id = ?')
								.bind(merchant.id)
								.run();
							totalRemoved++;
						}
					} else {
						const [firstMerchant, ...remainingMerchants] = merchants;
						await database
							.prepare('UPDATE budget_merchant SET merchant_normalized = ? WHERE id = ?')
							.bind(update.normalized, firstMerchant.id)
							.run();
						totalUpdated++;
						for (const merchant of remainingMerchants) {
							await database
								.prepare('DELETE FROM budget_merchant WHERE id = ?')
								.bind(merchant.id)
								.run();
							totalRemoved++;
						}
					}
				} catch (budgetError) {
					console.error(
						`Error processing budget ${budgetId} for pattern ${update.pattern}:`,
						budgetError
					);
					errors.push({
						type: 'budget_merchant_budget_error',
						budgetId: Number.parseInt(budgetId),
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
async function ensurePaymentBudgetConsistency(database) {
	try {
		// Get all unique normalized merchant names from payments
		const { results: paymentNormalized } = await database
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
			const { results: budgetMerchants } = await database
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
					if (
						normalized.merchant_normalized === normalizedName &&
						budgetMerchant.merchant_normalized !== normalizedName
					) {
						await database
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
async function checkAssignmentConsistency(database) {
	try {
		// Get all merchants that are assigned to budgets
		const { results: assignedMerchants } = await database
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
			const { results: unassignedCheck } = await database
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
				const { results: assignmentDetails } = await database
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
 * Check for merchants that normalize to the same value but have different assignment statuses
 * This is likely the root cause of the modal bug
 */
async function checkDuplicateMerchantVariations(database) {
	try {
		// Find merchants that normalize to the same value but have different assignment statuses
		const { results: duplicateVariations } = await database
			.prepare(
				`
				WITH normalized_merchants AS (
					SELECT DISTINCT 
						p.merchant,
						p.merchant_normalized,
						'payment' as source,
						CASE 
							WHEN EXISTS (
								SELECT 1 FROM budget_merchant bm 
								WHERE LOWER(bm.merchant_normalized) = LOWER(p.merchant_normalized)
							) THEN 1 
							ELSE 0 
						END as is_assigned
					FROM payment p
					JOIN statement s ON p.statement_id = s.id
					WHERE p.merchant_normalized IS NOT NULL
					
					UNION ALL
					
					SELECT DISTINCT 
						bm.merchant,
						bm.merchant_normalized,
						'budget_merchant' as source,
						1 as is_assigned
					FROM budget_merchant bm
					WHERE bm.merchant_normalized IS NOT NULL
				)
				SELECT 
					merchant_normalized,
					COUNT(DISTINCT merchant) as variation_count,
					COUNT(DISTINCT is_assigned) as assignment_status_count,
					GROUP_CONCAT(DISTINCT merchant, ' | ') as variations,
					GROUP_CONCAT(DISTINCT is_assigned) as assignment_statuses
				FROM normalized_merchants
				GROUP BY merchant_normalized
				HAVING variation_count > 1 AND assignment_status_count > 1
				ORDER BY merchant_normalized
			`
			)
			.all();

		return { duplicateVariations };
	} catch (error) {
		console.error('Duplicate merchant variations check failed:', error);
		return {
			duplicateVariations: [],
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

	const database = event.platform?.env?.CCBILLING_DB;
	if (!database) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	try {
		// Get statistics
		const stats = await database
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

		const budgetStats = await database
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
		const { results: samples } = await database
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
		const { results: unitedInfo } = await database
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
		const { results: pendingMerchants } = await database
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
