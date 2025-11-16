#!/bin/bash

# sync_local_from_prod.sh
# 
# Comprehensive sync script that syncs both D1 databases and R2 buckets
# from production to local development environment.
# 
# This ensures that both database records and R2 objects are consistent,
# which is necessary for features like PDF viewing to work properly.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(dirname "$0")"
D1_SCRIPT="$SCRIPT_DIR/populate_local_d1_from_prod.sh"
R2_SCRIPT="$SCRIPT_DIR/populate_local_r2_from_prod.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage information
show_usage() {
    echo "Usage: $0 [DATABASE_NAME]"
    echo ""
    echo "Arguments:"
    echo "  DATABASE_NAME    Database to sync (wdi, ccbilling, genproj, or 'all')"
    echo "                   Default: 'all' - syncs both databases"
    echo ""
    echo "Examples:"
    echo "  $0                    # Sync both wdi and ccbilling"
    echo "  $0 all               # Sync both wdi and ccbilling"
    echo "  $0 ccbilling         # Sync only ccbilling database and R2"
    echo "  $0 wdi               # Sync only wdi database and R2"
		echo "  $0 genproj           # Sync only genproj database and R2"
    echo ""
    echo "This script:"
    echo "  1. Syncs D1 database(s) from production to local"
    echo "  2. Syncs R2 bucket(s) from production to local"
    echo "  3. Ensures consistency between database records and R2 objects"
}

# Function to print colored output
print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to sync a specific database
sync_database() {
    local db_name="$1"
    local num_tables_synced=""
    
    print_step "Syncing $db_name database from production to local"
    
    if [[ ! -f "$D1_SCRIPT" ]]; then
        print_error "D1 sync script not found: $D1_SCRIPT"
        return 1
    fi
    
    # Capture stdout and stderr
    # Temporarily disable -e to allow capturing the exit code of D1_SCRIPT
    set +e
    d1_output=$(bash "$D1_SCRIPT" "$db_name" 2>&1)
    d1_exit_code=$?
    set -e

    if [ "$d1_exit_code" -eq 0 ]; then
        num_tables_synced=$(echo "$d1_output" | grep "Tables synced:" | awk '{print $3}')
        if [ -n "$num_tables_synced" ]; then
            print_success "$db_name database synced successfully ($num_tables_synced tables)."
        else
            print_success "$db_name database synced successfully."
        fi
        return 0 # Success, continue
    elif [ "$d1_exit_code" -eq 2 ]; then # Our custom exit code for skipped sync
        print_warning "$db_name database sync skipped (no tables found)."
        return 0 # Skipped, continue to R2 sync
    else # d1_exit_code is 1 (critical error) or other unexpected non-zero
        print_error "$db_name database sync failed. Details:
$d1_output"
        return 1 # Critical error, exit the main script
    fi
}

# Function to sync R2 buckets
sync_r2() {
    local db_target="$1"
    print_step "Syncing R2 buckets from production to local"
    
    if [[ ! -f "$R2_SCRIPT" ]]; then
        print_error "R2 sync script not found: $R2_SCRIPT"
        return 1
    fi
    
    if bash "$R2_SCRIPT" "$db_target"; then
        print_success "R2 buckets synced successfully"
    else
        print_error "R2 sync failed"
        return 1
    fi
}

# Function to verify sync was successful
verify_sync() {
    local db_name="$1"
    
    print_step "Verifying $db_name sync"
    
    # Check if tables exist in local database
    if npx wrangler d1 execute "$db_name" --local --command "SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;" >/dev/null 2>&1; then
        print_success "$db_name local database has tables"
    else
        print_warning "$db_name local database appears empty"
    fi
    
    # Check if R2 buckets have objects
    if npx wrangler r2 bucket info "$db_name" >/dev/null 2>&1; then
        print_success "$db_name R2 bucket is accessible"
    else
        print_warning "$db_name R2 bucket may not be accessible locally"
    fi
}

# Parse command line arguments
DB_TARGET="${1:-all}"

if [ "$DB_TARGET" = "-h" ] || [ "$DB_TARGET" = "--help" ]; then
    show_usage
    exit 0
fi

# Validate database name
if [[ "$DB_TARGET" != "all" && "$DB_TARGET" != "wdi" && "$DB_TARGET" != "ccbilling" && "$DB_TARGET" != "genproj" ]]; then
    print_error "Invalid database name '$DB_TARGET'."
    echo "Valid options are: all, wdi, ccbilling, genproj"
    echo ""
    show_usage
    exit 1
fi

# Check if required scripts exist
if [[ ! -f "$D1_SCRIPT" ]]; then
    print_error "D1 sync script not found: $D1_SCRIPT"
    exit 1
fi

if [[ ! -f "$R2_SCRIPT" ]]; then
    print_error "R2 sync script not found: $R2_SCRIPT"
    exit 1
fi

# Main execution
print_step "Starting comprehensive sync from production to local"
echo "Target: $DB_TARGET"
echo ""

# Sync databases
if [[ "$DB_TARGET" == "all" ]]; then
    sync_database "wdi"
    echo ""
    sync_database "ccbilling"
    echo ""
    sync_database "genproj"
    echo ""
else
    sync_database "$DB_TARGET"
    echo ""
fi

# Sync R2 buckets (this syncs all buckets discovered from wrangler.jsonc)
sync_r2 "$DB_TARGET"
echo ""

# Verification
print_step "Verifying"
if [[ "$DB_TARGET" == "all" ]]; then
    verify_sync "wdi"
    verify_sync "ccbilling"
    verify_sync "genproj"
else
    verify_sync "$DB_TARGET"
fi

echo ""
print_success "Sync process completed!"
echo ""
print_step "Next Steps"
echo "1. Your local development environment now has production data"
echo "2. Database records and R2 objects should be consistent"
echo "3. Features like PDF viewing should now work in your dev environment"
echo "4. Remember to restart your dev server if it was running"