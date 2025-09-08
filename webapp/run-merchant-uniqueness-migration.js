#!/usr/bin/env node

/**
 * Script to run the merchant uniqueness migration
 * This adds a unique constraint on merchant_normalized in the budget_merchant table
 * to prevent duplicate merchant names from being assigned to budgets
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION_FILE = 'migrations/003_add_unique_merchant_constraint.sql';

function runCommand(command) {
    console.log(`Running: ${command}`);
    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        console.error(`Command failed: ${command}`);
        console.error(error.message);
        return false;
    }
}

function checkWranglerInstalled() {
    try {
        execSync('npx wrangler --version', { stdio: 'pipe' });
        return true;
    } catch (error) {
        console.error('Error: wrangler CLI is not installed');
        console.error('Please install it with: npm install -g wrangler');
        return false;
    }
}

function getDatabaseName() {
    // Try to get database name from environment or use default
    return process.env.CCBILLING_DB_NAME || 'CCBILLING_DB';
}

function main() {
    console.log('🔧 Merchant Uniqueness Migration');
    console.log('================================');
    
    // Check if wrangler is installed
    if (!checkWranglerInstalled()) {
        process.exit(1);
    }
    
    // Check if migration file exists
    try {
        readFileSync(MIGRATION_FILE, 'utf8');
    } catch (error) {
        console.error(`Migration file not found: ${MIGRATION_FILE}`);
        process.exit(1);
    }
    
    const dbName = getDatabaseName();
    console.log(`Database: ${dbName}`);
    
    // Get environment from command line argument
    const environment = process.argv[2] || 'local';
    
    if (environment === 'local') {
        console.log('\n🏠 Running LOCAL migration...');
        
        // Run migration on local database
        const success = runCommand(`npx wrangler d1 execute ${dbName} --local --file=${MIGRATION_FILE}`);
        
        if (success) {
            console.log('\n✅ Local migration completed successfully!');
            console.log('\nNext steps:');
            console.log('1. Test the application to ensure merchant picker works correctly');
            console.log('2. Try assigning merchants to budgets to verify no duplicates');
            console.log('3. Run the same migration on production when ready');
        } else {
            console.log('\n❌ Local migration failed');
            process.exit(1);
        }
        
    } else if (environment === 'prod' || environment === 'production') {
        console.log('\n🚀 Running PRODUCTION migration...');
        console.log('⚠️  WARNING: You are about to modify the production database!');
        
        // Create backup first
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = `backups/backup_${timestamp}.sql`;
        
        console.log(`\n📦 Creating backup: ${backupFile}`);
        const backupSuccess = runCommand(`npx wrangler d1 export ${dbName} --output=${backupFile}`);
        
        if (!backupSuccess) {
            console.log('❌ Backup failed, aborting migration');
            process.exit(1);
        }
        
        console.log('✅ Backup created successfully');
        
        // Run migration on production database
        const success = runCommand(`npx wrangler d1 execute ${dbName} --file=${MIGRATION_FILE}`);
        
        if (success) {
            console.log('\n✅ Production migration completed successfully!');
            console.log('\nNext steps:');
            console.log('1. Test the application thoroughly');
            console.log('2. Verify merchant picker no longer has duplicate issues');
            console.log('3. Monitor application logs for any issues');
        } else {
            console.log('\n❌ Production migration failed');
            console.log('You can restore from backup if needed');
            process.exit(1);
        }
        
    } else {
        console.log('Usage: node run-merchant-uniqueness-migration.js [local|prod]');
        console.log('Default: local');
        process.exit(1);
    }
}

main();