import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Admin endpoint to deduplicate merchants that only differ in case
 * This identifies merchants that are identical when compared case-insensitively
 * and merges them to use a consistent canonical form.
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
		const body = await event.request.json();
		const dryRun = body.dryRun !== false; // Default to dry run unless explicitly disabled

		// Find all duplicate merchants that only differ in case
		const duplicates = await findCaseDuplicates(database);

		if (dryRun) {
			return json({
				success: true,
				dryRun: true,
				duplicatesFound: duplicates.length,
				duplicates: duplicates,
				message: `Found ${duplicates.length} groups of case-only duplicate merchants. Set dryRun: false to perform the deduplication.`
			});
		}

		// Perform the actual deduplication
		const results = await deduplicateMerchants(database, duplicates);

		return json({
			success: true,
			dryRun: false,
			duplicatesProcessed: duplicates.length,
			paymentsUpdated: results.paymentsUpdated,
			budgetMerchantsUpdated: results.budgetMerchantsUpdated,
			budgetMerchantsRemoved: results.budgetMerchantsRemoved,
			errors: results.errors.length > 0 ? results.errors : undefined,
			message: `Successfully deduplicated ${duplicates.length} merchant groups.`
		});
	} catch (error) {
		console.error('Merchant deduplication failed:', error);
		return json(
			{
				error: 'Failed to deduplicate merchants',
				details: error.message
			},
			{ status: 500 }
		);
	}
}

/**
 * Find merchants that are duplicates when compared case-insensitively
 */
async function findCaseDuplicates(database) {
	// Find all unique merchant_normalized values that have case variations
	const { results: potentialDuplicates } = await database
		.prepare(
			`
			SELECT 
				UPPER(merchant_normalized) as canonical_form,
				GROUP_CONCAT(DISTINCT merchant_normalized) as variants,
				COUNT(DISTINCT merchant_normalized) as variant_count
			FROM (
				-- Get all merchant_normalized values from payments
				SELECT DISTINCT merchant_normalized
				FROM payment 
				WHERE merchant_normalized IS NOT NULL
				UNION
				-- Get all merchant_normalized values from budget_merchant
				SELECT DISTINCT merchant_normalized
				FROM budget_merchant 
				WHERE merchant_normalized IS NOT NULL
			)
			GROUP BY UPPER(merchant_normalized)
			HAVING variant_count > 1
			ORDER BY variant_count DESC, canonical_form
		`
		)
		.all();

	// Process each group of duplicates
	const duplicates = [];
	for (const group of potentialDuplicates) {
		const variants = group.variants.split(',');

		// Choose the canonical form (prefer uppercase, then alphabetical)
		const canonical = variants.sort((a, b) => {
			// Prefer uppercase versions
			const aIsUpper = a === a.toUpperCase();
			const bIsUpper = b === b.toUpperCase();
			if (aIsUpper && !bIsUpper) return -1;
			if (!aIsUpper && bIsUpper) return 1;
			// If both are same case, sort alphabetically
			return a.localeCompare(b);
		})[0];

		// Get usage counts for each variant
		const variantDetails = [];
		for (const variant of variants) {
			const paymentCount = await database
				.prepare('SELECT COUNT(*) as count FROM payment WHERE merchant_normalized = ?')
				.bind(variant)
				.first();

			const budgetCount = await database
				.prepare('SELECT COUNT(*) as count FROM budget_merchant WHERE merchant_normalized = ?')
				.bind(variant)
				.first();

			variantDetails.push({
				variant,
				paymentCount: paymentCount.count,
				budgetCount: budgetCount.count,
				isCanonical: variant === canonical
			});
		}

		duplicates.push({
			canonicalForm: group.canonical_form,
			canonical,
			variants: variantDetails,
			totalVariants: variants.length
		});
	}

	return duplicates;
}

/**
 * Perform the actual deduplication by updating all records to use canonical forms
 */
async function deduplicateMerchants(database, duplicates) {
	let paymentsUpdated = 0;
	let budgetMerchantsUpdated = 0;
	let budgetMerchantsRemoved = 0;
	const errors = [];

	for (const duplicateGroup of duplicates) {
		const canonical = duplicateGroup.canonical;
		const nonCanonicalVariants = duplicateGroup.variants
			.filter((v) => !v.isCanonical)
			.map((v) => v.variant);

		try {
			// Update payments to use canonical form
			for (const variant of nonCanonicalVariants) {
				const result = await database
					.prepare('UPDATE payment SET merchant_normalized = ? WHERE merchant_normalized = ?')
					.bind(canonical, variant)
					.run();
				paymentsUpdated += result.changes || 0;
			}

			// Handle budget_merchant duplicates more carefully
			// First, get all budget assignments for the canonical form
			const { results: existingBudgets } = await database
				.prepare('SELECT DISTINCT budget_id FROM budget_merchant WHERE merchant_normalized = ?')
				.bind(canonical)
				.all();

			const existingBudgetIds = new Set(existingBudgets.map((b) => b.budget_id));

			// For each non-canonical variant
			for (const variant of nonCanonicalVariants) {
				// Get budget assignments for this variant
				const { results: variantBudgets } = await database
					.prepare('SELECT budget_id FROM budget_merchant WHERE merchant_normalized = ?')
					.bind(variant)
					.all();

				for (const budget of variantBudgets) {
					if (existingBudgetIds.has(budget.budget_id)) {
						// Budget already has canonical form, just remove the variant
						await database
							.prepare(
								'DELETE FROM budget_merchant WHERE merchant_normalized = ? AND budget_id = ?'
							)
							.bind(variant, budget.budget_id)
							.run();
						budgetMerchantsRemoved++;
					} else {
						// Update the variant to canonical form
						await database
							.prepare(
								'UPDATE budget_merchant SET merchant_normalized = ? WHERE merchant_normalized = ? AND budget_id = ?'
							)
							.bind(canonical, variant, budget.budget_id)
							.run();
						budgetMerchantsUpdated++;
						existingBudgetIds.add(budget.budget_id);
					}
				}
			}
		} catch (error) {
			errors.push({
				canonicalForm: duplicateGroup.canonicalForm,
				canonical,
				variants: nonCanonicalVariants,
				error: error.message
			});
		}
	}

	return {
		paymentsUpdated,
		budgetMerchantsUpdated,
		budgetMerchantsRemoved,
		errors
	};
}

/**
 * Get deduplication status and preview
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
		// Find case duplicates for preview
		const duplicates = await findCaseDuplicates(database);

		// Get summary statistics
		const totalVariants = duplicates.reduce((sum, group) => sum + group.totalVariants, 0);
		const totalGroups = duplicates.length;
		const totalPaymentsAffected = duplicates.reduce(
			(sum, group) =>
				sum + group.variants.reduce((variantSum, variant) => variantSum + variant.paymentCount, 0),
			0
		);
		const totalBudgetMerchantsAffected = duplicates.reduce(
			(sum, group) =>
				sum + group.variants.reduce((variantSum, variant) => variantSum + variant.budgetCount, 0),
			0
		);

		return json({
			duplicatesFound: totalGroups,
			totalVariants,
			totalPaymentsAffected,
			totalBudgetMerchantsAffected,
			duplicates: duplicates.slice(0, 10), // Show first 10 for preview
			message:
				totalGroups === 0
					? 'No case-only duplicate merchants found!'
					: `Found ${totalGroups} groups of merchants with case-only differences affecting ${totalPaymentsAffected} payments and ${totalBudgetMerchantsAffected} budget assignments.`
		});
	} catch (error) {
		console.error('Failed to get deduplication status:', error);
		return json(
			{
				error: 'Failed to get deduplication status',
				details: error.message
			},
			{ status: 500 }
		);
	}
}
