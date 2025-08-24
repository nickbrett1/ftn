#!/usr/bin/env node

/**
 * Script to normalize merchant data in production database
 * Run with: node scripts/normalize-production.js
 */

import { execSync } from 'child_process';
import { normalizeMerchant } from '../src/lib/utils/merchant-normalizer.js';

const BATCH_SIZE = 20; // Small batches to avoid issues

console.log('🚀 Production Merchant Normalization');
console.log('=====================================\n');

/**
 * Execute SQL on production database
 */
function executeSQL(sql, isQuery = false) {
	try {
		const command = `npx wrangler d1 execute CCBILLING_DB --remote --command="${sql.replace(/"/g, '\\"')}"`;
		const output = execSync(command, { encoding: 'utf8' });
		
		if (isQuery) {
			// Try to extract the data from the output
			const lines = output.split('\n');
			const dataLine = lines.find(line => line.includes('│') && !line.includes('─'));
			if (dataLine) {
				// Parse the table output
				const parts = dataLine.split('│').map(p => p.trim()).filter(p => p);
				return parts;
			}
		}
		
		return output;
	} catch (error) {
		console.error('SQL Error:', error.message);
		throw error;
	}
}

/**
 * Get normalization statistics
 */
async function getStats() {
	console.log('📊 Getting current statistics...\n');
	
	const totalResult = executeSQL(
		"SELECT COUNT(*) as total FROM payment WHERE merchant IS NOT NULL",
		true
	);
	
	const normalizedResult = executeSQL(
		"SELECT COUNT(*) as total FROM payment WHERE merchant_normalized IS NOT NULL AND merchant_normalized != merchant",
		true
	);
	
	const total = parseInt(totalResult[0]) || 0;
	const normalized = parseInt(normalizedResult[0]) || 0;
	
	console.log(`Total payments: ${total}`);
	console.log(`Already normalized: ${normalized}`);
	console.log(`Need normalization: ${total - normalized}\n`);
	
	return { total, normalized, pending: total - normalized };
}

/**
 * Normalize a batch of merchants
 */
async function normalizeBatch() {
	console.log(`\n🔄 Processing batch of ${BATCH_SIZE} merchants...\n`);
	
	// For production, we'll do simple SQL updates for known patterns
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
		}
	];
	
	let totalUpdated = 0;
	
	for (const update of updates) {
		try {
			const sql = `
				UPDATE payment 
				SET merchant_normalized = '${update.normalized}',
					merchant_details = ${update.details || "''"}
				WHERE (${update.pattern})
				AND (merchant_normalized IS NULL OR merchant_normalized = merchant)
				LIMIT ${BATCH_SIZE}
			`;
			
			console.log(`Normalizing ${update.normalized} merchants...`);
			const result = executeSQL(sql);
			
			// Extract number of rows updated from output
			const match = result.match(/(\d+)\s+rows?\s+written/i);
			const updated = match ? parseInt(match[1]) : 0;
			totalUpdated += updated;
			
			if (updated > 0) {
				console.log(`  ✅ Updated ${updated} ${update.normalized} merchants`);
			}
		} catch (error) {
			console.error(`  ❌ Failed to update ${update.normalized}:`, error.message);
		}
	}
	
	// Also update budget_merchant table
	console.log('\n📦 Updating budget_merchant mappings...');
	
	for (const update of updates.slice(0, 5)) { // Just do main ones for budget_merchant
		try {
			const sql = `
				UPDATE budget_merchant 
				SET merchant_normalized = '${update.normalized}'
				WHERE (${update.pattern.replace(/merchant/g, 'merchant')})
				AND (merchant_normalized IS NULL OR merchant_normalized = '')
			`;
			
			executeSQL(sql);
		} catch (error) {
			// Ignore errors for budget_merchant updates
		}
	}
	
	return totalUpdated;
}

/**
 * Main execution
 */
async function main() {
	try {
		// Get initial stats
		const initialStats = await getStats();
		
		if (initialStats.pending === 0) {
			console.log('✅ All merchants are already normalized!');
			return;
		}
		
		// Process normalization
		console.log('Starting normalization process...');
		console.log('This will update merchants in batches.\n');
		
		const totalUpdated = await normalizeBatch();
		
		// Get final stats
		console.log('\n📊 Final Statistics:');
		console.log('====================');
		const finalStats = await getStats();
		
		console.log(`\n✅ Normalization complete!`);
		console.log(`   Updated ${totalUpdated} merchant records`);
		console.log(`   ${finalStats.pending} merchants may still need manual review`);
		
	} catch (error) {
		console.error('\n❌ Normalization failed:', error);
		process.exit(1);
	}
}

// Run the script
main().catch(error => {
	console.error('Unexpected error:', error);
	process.exit(1);
});
