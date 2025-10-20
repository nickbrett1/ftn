import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/require-user.js';

/**
 * Admin endpoint to consolidate similar merchant records
 * This identifies merchants that represent the same business but have variations
 * in naming, store numbers, phone numbers, etc.
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
		const body = await event.request.json().catch(() => ({}));
		const dryRun = body.dryRun !== false; // Default to dry run unless explicitly disabled

		// Find all similar merchants that should be consolidated
		const similarGroups = await findSimilarMerchants(db);

		if (dryRun) {
			return json({
				success: true,
				dryRun: true,
				groupsFound: similarGroups.length,
				groups: similarGroups,
				message: `Found ${similarGroups.length} groups of similar merchants. Set dryRun: false to perform the consolidation.`
			});
		}

		// Perform the actual consolidation
		const results = await consolidateMerchants(db, similarGroups);

		return json({
			success: true,
			dryRun: false,
			groupsProcessed: similarGroups.length,
			paymentsUpdated: results.paymentsUpdated,
			budgetMerchantsUpdated: results.budgetMerchantsUpdated,
			budgetMerchantsRemoved: results.budgetMerchantsRemoved,
			errors: results.errors.length > 0 ? results.errors : undefined,
			message: `Successfully consolidated ${similarGroups.length} merchant groups.`
		});
	} catch (error) {
		console.error('Merchant consolidation failed:', error);
		return json(
			{
				error: 'Failed to consolidate merchants',
				details: error.message
			},
			{ status: 500 }
		);
	}
}

/**
 * Find merchants that are similar and should be consolidated
 */
async function findSimilarMerchants(db) {
	// Get all unique merchants with their usage counts
	const { results: merchants } = await db
		.prepare(
			`
			SELECT 
				merchant_normalized,
				COUNT(*) as count
			FROM (
				-- Get all merchant_normalized values from payments
				SELECT DISTINCT merchant_normalized
				FROM payment 
				WHERE merchant_normalized IS NOT NULL
				UNION ALL
				-- Get all merchant_normalized values from budget_merchant
				SELECT DISTINCT merchant_normalized
				FROM budget_merchant 
				WHERE merchant_normalized IS NOT NULL
			)
			GROUP BY merchant_normalized
			ORDER BY count DESC, merchant_normalized
		`
		)
		.all();

	// Find similar groups using pattern matching
	const similarGroups = [];
	const processed = new Set();

	for (let i = 0; i < merchants.length; i++) {
		const merchant1 = merchants[i];
		if (processed.has(merchant1.merchant_normalized)) continue;

		const group = {
			canonical: merchant1.merchant_normalized,
			variants: [merchant1],
			confidence: 1.0,
			pattern: 'exact'
		};

		// Find similar merchants using specific patterns
		for (let j = i + 1; j < merchants.length; j++) {
			const merchant2 = merchants[j];
			if (processed.has(merchant2.merchant_normalized)) continue;

			const similarity = calculateSimilarity(merchant1.merchant_normalized, merchant2.merchant_normalized);
			
			if (similarity.confidence >= 0.8) {
				group.variants.push(merchant2);
				group.confidence = Math.min(group.confidence, similarity.confidence);
				group.pattern = similarity.pattern;
				processed.add(merchant2.merchant_normalized);
			}
		}

		// Only include groups with multiple variants
		if (group.variants.length > 1) {
			// Choose the best canonical form
			group.canonical = chooseCanonicalForm(group.variants);
			similarGroups.push(group);
			processed.add(merchant1.merchant_normalized);
		}
	}

	return similarGroups;
}

/**
 * Calculate similarity between two merchant names
 */
function calculateSimilarity(merchant1, merchant2) {
	const m1 = merchant1.toUpperCase().trim();
	const m2 = merchant2.toUpperCase().trim();

	// Exact match
	if (m1 === m2) return { confidence: 1.0, pattern: 'exact' };

	// Check for specific patterns
	const patterns = [
		// Store number variations (e.g., "PINKBERRY 15012 NEW YORK" vs "PINKBERRY 15038 NEW YORK")
		() => checkStoreNumberVariation(m1, m2),
		
		// Spacing variations (e.g., "PLANT SHED" vs "PLANTSHED")
		() => checkSpacingVariation(m1, m2),
		
		// Phone number variations (e.g., "PLANT SHED 87 CORP NEW YORK" vs "PLANTSHED 8007539595")
		() => checkPhoneNumberVariation(m1, m2),
		
		// Address variations (e.g., "100 W 67" vs "100 W 67TH")
		() => checkAddressVariation(m1, m2),
		
		// Generic business name variations
		() => checkGenericBusinessVariation(m1, m2)
	];

	for (const pattern of patterns) {
		const result = pattern();
		if (result !== null) return result;
	}

	// Fallback to Levenshtein distance
	const levenshteinScore = calculateLevenshteinSimilarity(m1, m2);
	return { confidence: levenshteinScore, pattern: 'levenshtein' };
}

/**
 * Check if merchants differ only by store numbers
 */
function checkStoreNumberVariation(m1, m2) {
	// Extract base name and store number from both merchants
	const extractStoreInfo = (merchant) => {
		// Pattern: MERCHANT_NAME [STORE_NUMBER] [LOCATION]
		const match = merchant.match(/^(.+?)\s+(\d{4,})\s+(.+)$/);
		if (match) {
			return {
				baseName: match[1].trim(),
				storeNumber: match[2],
				location: match[3].trim()
			};
		}
		return null;
	};

	const info1 = extractStoreInfo(m1);
	const info2 = extractStoreInfo(m2);

	if (info1 && info2) {
		// Check if base names and locations match
		if (info1.baseName === info2.baseName && info1.location === info2.location) {
			return { confidence: 0.95, pattern: 'store_number' };
		}
	}

	return null;
}

/**
 * Check if merchants differ only by spacing
 */
function checkSpacingVariation(m1, m2) {
	// Remove all spaces and compare
	const normalized1 = m1.replace(/\s+/g, '');
	const normalized2 = m2.replace(/\s+/g, '');

	if (normalized1 === normalized2) {
		return { confidence: 0.9, pattern: 'spacing' };
	}

	// Also check if they match after normalizing business names
	const norm1 = normalizeBusinessName(m1);
	const norm2 = normalizeBusinessName(m2);

	if (norm1 === norm2 && norm1.length > 3) { // Ensure we have meaningful content
		return { confidence: 0.85, pattern: 'spacing' };
	}

	// Check if they match after removing all numbers and normalizing
	const norm1NoNumbers = norm1.replace(/\d+/g, '').replace(/\s+/g, '').trim();
	const norm2NoNumbers = norm2.replace(/\d+/g, '').replace(/\s+/g, '').trim();

	if (norm1NoNumbers === norm2NoNumbers && norm1NoNumbers.length > 3) {
		return { confidence: 0.8, pattern: 'spacing' };
	}

	return null;
}

/**
 * Check if merchants differ by phone numbers vs other details
 */
function checkPhoneNumberVariation(m1, m2) {
	// Extract phone numbers (10+ digits)
	const phoneRegex = /\d{10,}/g;
	const phones1 = m1.match(phoneRegex) || [];
	const phones2 = m2.match(phoneRegex) || [];

	// If one has phone numbers and the other doesn't, check base names
	if (phones1.length > 0 && phones2.length === 0) {
		const base1 = m1.replace(phoneRegex, '').replace(/\s+/g, ' ').trim();
		const base2 = m2.replace(/\s+/g, ' ').trim();
		
		// Check if base names match when normalized (remove spaces and common suffixes)
		const norm1 = normalizeBusinessName(base1);
		const norm2 = normalizeBusinessName(base2);
		
		if (norm1 === norm2) {
			return { confidence: 0.9, pattern: 'phone_number' };
		}
	}

	if (phones2.length > 0 && phones1.length === 0) {
		const base2 = m2.replace(phoneRegex, '').replace(/\s+/g, ' ').trim();
		const base1 = m1.replace(/\s+/g, ' ').trim();
		
		// Check if base names match when normalized (remove spaces and common suffixes)
		const norm1 = normalizeBusinessName(base1);
		const norm2 = normalizeBusinessName(base2);
		
		if (norm1 === norm2) {
			return { confidence: 0.9, pattern: 'phone_number' };
		}
	}

	return null;
}

/**
 * Normalize business name by removing common suffixes and spaces
 */
function normalizeBusinessName(name) {
	const suffixes = ['LLC', 'INC', 'CORP', 'CO', 'LTD', 'NEW YORK', 'NY'];
	
	let normalized = name;
	for (const suffix of suffixes) {
		normalized = normalized.replace(new RegExp(`\\s+${suffix}\\b`, 'gi'), '');
	}
	
	// Remove extra spaces and convert to uppercase
	return normalized.replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Check if merchants differ by address format variations
 */
function checkAddressVariation(m1, m2) {
	// Check for address patterns like "100 W 67" vs "100 W 67TH"
	const addressPattern = /^(.+?)\s+(\d+)\s+([A-Z]+)\s+(\d+)(?:TH|ST|ND|RD)?\s+(.+)$/;
	
	const match1 = m1.match(addressPattern);
	const match2 = m2.match(addressPattern);

	if (match1 && match2) {
		const [, prefix1, num1, street1, suffix1, location1] = match1;
		const [, prefix2, num2, street2, suffix2, location2] = match2;

		// Check if everything matches except the suffix format
		if (prefix1 === prefix2 && num1 === num2 && street1 === street2 && location1 === location2) {
			return { confidence: 0.95, pattern: 'address_format' };
		}
	}

	return null;
}

/**
 * Check for generic business name variations
 */
function checkGenericBusinessVariation(m1, m2) {
	// Remove common suffixes and compare
	const suffixes = ['LLC', 'INC', 'CORP', 'CO', 'LTD', 'NEW YORK', 'NY'];
	
	const normalize = (merchant) => {
		let normalized = merchant;
		for (const suffix of suffixes) {
			normalized = normalized.replace(new RegExp(`\\s+${suffix}\\b`, 'gi'), '');
		}
		return normalized.replace(/\s+/g, ' ').trim();
	};

	const norm1 = normalize(m1);
	const norm2 = normalize(m2);

	if (norm1 === norm2) {
		return { confidence: 0.85, pattern: 'generic_business' };
	}

	return null;
}

/**
 * Calculate Levenshtein similarity
 */
function calculateLevenshteinSimilarity(s1, s2) {
	const longer = s1.length > s2.length ? s1 : s2;
	const shorter = s1.length > s2.length ? s2 : s1;

	if (longer.length === 0) return 1.0;

	const distance = levenshteinDistance(longer, shorter);
	return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
	const matrix = [];

	for (let i = 0; i <= s2.length; i++) {
		matrix[i] = [i];
	}

	for (let j = 0; j <= s1.length; j++) {
		matrix[0][j] = j;
	}

	for (let i = 1; i <= s2.length; i++) {
		for (let j = 1; j <= s1.length; j++) {
			if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(
					matrix[i - 1][j - 1] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j] + 1
				);
			}
		}
	}

	return matrix[s2.length][s1.length];
}

/**
 * Choose the best canonical form from a group of similar merchants
 */
function chooseCanonicalForm(variants) {
	// Sort by count (most frequent first), then by length (shorter first), then alphabetically
	return variants
		.sort((a, b) => {
			// First by count (descending)
			if (b.count !== a.count) return b.count - a.count;
			
			// Then by length (ascending - prefer shorter names)
			if (a.merchant_normalized.length !== b.merchant_normalized.length) {
				return a.merchant_normalized.length - b.merchant_normalized.length;
			}
			
			// Finally alphabetically
			return a.merchant_normalized.localeCompare(b.merchant_normalized);
		})[0].merchant_normalized;
}

/**
 * Perform the actual consolidation by updating all records to use canonical forms
 */
async function consolidateMerchants(db, similarGroups) {
	let paymentsUpdated = 0;
	let budgetMerchantsUpdated = 0;
	let budgetMerchantsRemoved = 0;
	const errors = [];

	for (const group of similarGroups) {
		const canonical = group.canonical;
		const nonCanonicalVariants = group.variants
			.filter((v) => v.merchant_normalized !== canonical)
			.map((v) => v.merchant_normalized);

		try {
			// Update payments to use canonical form
			for (const variant of nonCanonicalVariants) {
				const result = await db
					.prepare('UPDATE payment SET merchant_normalized = ? WHERE merchant_normalized = ?')
					.bind(canonical, variant)
					.run();
				paymentsUpdated += result.changes || 0;
			}

			// Handle budget_merchant duplicates more carefully
			// First, get all budget assignments for the canonical form
			const { results: existingBudgets } = await db
				.prepare('SELECT DISTINCT budget_id FROM budget_merchant WHERE merchant_normalized = ?')
				.bind(canonical)
				.all();

			const existingBudgetIds = new Set(existingBudgets.map((b) => b.budget_id));

			// For each non-canonical variant
			for (const variant of nonCanonicalVariants) {
				// Get budget assignments for this variant
				const { results: variantBudgets } = await db
					.prepare('SELECT budget_id FROM budget_merchant WHERE merchant_normalized = ?')
					.bind(variant)
					.all();

				for (const budget of variantBudgets) {
					if (existingBudgetIds.has(budget.budget_id)) {
						// Budget already has canonical form, just remove the variant
						await db
							.prepare(
								'DELETE FROM budget_merchant WHERE merchant_normalized = ? AND budget_id = ?'
							)
							.bind(variant, budget.budget_id)
							.run();
						budgetMerchantsRemoved++;
					} else {
						// Update the variant to canonical form
						await db
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
				canonical,
				variants: nonCanonicalVariants,
				pattern: group.pattern,
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
 * Get consolidation status and preview
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
		// Find similar merchants for preview
		const similarGroups = await findSimilarMerchants(db);

		// Get summary statistics
		const totalVariants = similarGroups.reduce((sum, group) => sum + group.variants.length, 0);
		const totalGroups = similarGroups.length;
		const totalPaymentsAffected = similarGroups.reduce(
			(sum, group) =>
				sum + group.variants.reduce((variantSum, variant) => variantSum + variant.count, 0),
			0
		);

		return json({
			groupsFound: totalGroups,
			totalVariants,
			totalPaymentsAffected,
			groups: similarGroups.slice(0, 10), // Show first 10 for preview
			message:
				totalGroups === 0
					? 'No similar merchants found for consolidation!'
					: `Found ${totalGroups} groups of similar merchants affecting ${totalPaymentsAffected} total records.`
		});
	} catch (error) {
		console.error('Failed to get consolidation status:', error);
		return json(
			{
				error: 'Failed to get consolidation status',
				details: error.message
			},
			{ status: 500 }
		);
	}
}
