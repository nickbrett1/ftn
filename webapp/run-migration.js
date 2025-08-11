#!/usr/bin/env node

/**
 * Simple migration runner for local development
 * Run with: node run-migration.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Database Migration Tool');
console.log('==========================\n');

// Check if migrations directory exists
const migrationsDir = path.join(__dirname, 'migrations');
if (!fs.existsSync(migrationsDir)) {
	console.error('❌ Migrations directory not found');
	process.exit(1);
}

// Function to run SQL migration
function runSQLMigration(isLocal = true) {
	const migrationFile = path.join(migrationsDir, '001_add_merchant_normalization.sql');

	if (!fs.existsSync(migrationFile)) {
		console.error('❌ Migration file not found:', migrationFile);
		return false;
	}

	console.log(`📄 Running SQL migration (${isLocal ? 'local' : 'production'})...`);

	try {
		const command = isLocal
			? `npx wrangler d1 execute CCBILLING_DB --local --file=${migrationFile}`
			: `npx wrangler d1 execute CCBILLING_DB --file=${migrationFile}`;

		execSync(command, { stdio: 'inherit' });
		console.log('✅ SQL migration completed successfully\n');
		return true;
	} catch (error) {
		console.error('❌ SQL migration failed:', error.message);
		return false;
	}
}

// Main execution
async function main() {
	// Check for command line arguments
	const args = process.argv.slice(2);
	const isProduction = args.includes('--prod') || args.includes('--production');

	if (isProduction) {
		console.log('⚠️  WARNING: Running migration on PRODUCTION database!');
		console.log('This will modify your production data.\n');

		// Simple confirmation using readline from Node.js
		const readline = await import('readline');
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question('Type "yes" to continue: ', (answer) => {
			if (answer.toLowerCase() === 'yes') {
				if (runSQLMigration(false)) {
					console.log('🎉 Production migration completed!');
				}
			} else {
				console.log('Migration cancelled.');
			}
			rl.close();
			process.exit(0);
		});
	} else {
		// Run local migration
		console.log('Running migration on LOCAL database...\n');

		if (runSQLMigration(true)) {
			console.log('🎉 Local migration completed!');
			console.log('\nNext steps:');
			console.log('1. Test the application locally');
			console.log('2. Run merchant normalization: node migrations/run-normalization-local.js');
			console.log('3. When ready for production: node run-migration.js --prod');
		}
	}
}

// Run the migration
main().catch((error) => {
	console.error('Unexpected error:', error);
	process.exit(1);
});
