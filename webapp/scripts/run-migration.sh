#!/bin/bash

# Script to run database migrations for both local and production environments
# Usage: ./scripts/run-migration.sh [local|prod|both]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to local if no argument provided
ENVIRONMENT=${1:-local}

echo -e "${GREEN}Credit Card Billing - Database Migration Script${NC}"
echo "================================================"

# Function to run SQL migration
run_sql_migration() {
    local env=$1
    local db_name=$2
    
    echo -e "\n${YELLOW}Running SQL migration on $env database: $db_name${NC}"
    
    if [ "$env" = "local" ]; then
        # For local D1 database
        npx wrangler d1 execute $db_name --local --file=./migrations/001_add_merchant_normalization.sql
    else
        # For production D1 database
        npx wrangler d1 execute $db_name --file=./migrations/001_add_merchant_normalization.sql
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SQL migration completed successfully${NC}"
    else
        echo -e "${RED}✗ SQL migration failed${NC}"
        exit 1
    fi
}

# Function to run JavaScript migration
run_js_migration() {
    local env=$1
    
    echo -e "\n${YELLOW}Running JavaScript merchant normalization on $env${NC}"
    
    if [ "$env" = "local" ]; then
        # For local environment
        node --experimental-modules migrations/run-normalization-local.js
    else
        # For production environment
        echo -e "${YELLOW}Note: JavaScript migration for production should be run via a Cloudflare Worker or admin endpoint${NC}"
        echo "Please deploy and run the normalization worker separately"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ JavaScript migration completed successfully${NC}"
    else
        echo -e "${RED}✗ JavaScript migration failed${NC}"
        exit 1
    fi
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI is not installed${NC}"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

# Get database name from wrangler.toml or environment
DB_NAME="CCBILLING_DB"
if [ -f "wrangler.toml" ]; then
    # Try to extract database binding name from wrangler.toml
    DB_BINDING=$(grep -E "^\[\[d1_databases\]\]" -A 2 wrangler.toml | grep "binding" | cut -d'"' -f2 | head -1)
    if [ ! -z "$DB_BINDING" ]; then
        DB_NAME=$DB_BINDING
    fi
fi

echo "Database binding: $DB_NAME"

# Run migrations based on environment
case $ENVIRONMENT in
    local)
        echo -e "\n${GREEN}Running LOCAL migrations${NC}"
        run_sql_migration "local" "$DB_NAME"
        # Uncomment when JavaScript migration is ready
        # run_js_migration "local"
        ;;
    
    prod|production)
        echo -e "\n${GREEN}Running PRODUCTION migrations${NC}"
        echo -e "${RED}⚠️  WARNING: You are about to modify the production database!${NC}"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        
        if [ "$confirm" != "yes" ]; then
            echo "Migration cancelled"
            exit 0
        fi
        
        # Create backup first
        echo -e "\n${YELLOW}Creating database backup...${NC}"
        timestamp=$(date +%Y%m%d_%H%M%S)
        npx wrangler d1 export $DB_NAME --output=backups/backup_${timestamp}.sql
        echo -e "${GREEN}✓ Backup created: backups/backup_${timestamp}.sql${NC}"
        
        run_sql_migration "prod" "$DB_NAME"
        # run_js_migration "prod"
        ;;
    
    both)
        echo -e "\n${GREEN}Running migrations on BOTH local and production${NC}"
        
        # Run local first
        run_sql_migration "local" "$DB_NAME"
        # run_js_migration "local"
        
        # Then production with confirmation
        echo -e "\n${RED}⚠️  WARNING: About to modify the production database!${NC}"
        read -p "Continue with production migration? (yes/no): " confirm
        
        if [ "$confirm" = "yes" ]; then
            # Create backup
            echo -e "\n${YELLOW}Creating database backup...${NC}"
            timestamp=$(date +%Y%m%d_%H%M%S)
            npx wrangler d1 export $DB_NAME --output=backups/backup_${timestamp}.sql
            echo -e "${GREEN}✓ Backup created: backups/backup_${timestamp}.sql${NC}"
            
            run_sql_migration "prod" "$DB_NAME"
            # run_js_migration "prod"
        else
            echo "Production migration skipped"
        fi
        ;;
    
    *)
        echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
        echo "Usage: $0 [local|prod|production|both]"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Migration process completed!${NC}"
echo "================================================"

# Provide next steps
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Test the application to ensure everything works correctly"
echo "2. Run the merchant normalization script to update existing data"
echo "3. Monitor for any issues in the application logs"

if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ] || [ "$ENVIRONMENT" = "both" ]; then
    echo -e "\n${YELLOW}Production checklist:${NC}"
    echo "□ Verify the migration was successful"
    echo "□ Test key functionality (merchant picker, budget assignments)"
    echo "□ Check that existing data is intact"
    echo "□ Run the normalization worker to update merchant data"
fi
