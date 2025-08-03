#!/bin/bash

# Migration runner for ccbilling database
# This script applies the migration to allow NULL values for statement_date

set -e

echo "🚀 Starting ccbilling database migration..."

# Check if we're in the right directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: wrangler.toml not found. Please run this script from the webapp directory."
    exit 1
fi

# Check if migration file exists
if [ ! -f "migrations/001_allow_null_statement_date.sql" ]; then
    echo "❌ Error: Migration file not found: migrations/001_allow_null_statement_date.sql"
    exit 1
fi

echo "📋 Migration file found: migrations/001_allow_null_statement_date.sql"

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI not found. Please install it first."
    echo "   npm install -g wrangler"
    exit 1
fi

echo "🔧 Running migration..."

# Apply the migration
wrangler d1 execute CCBILLING_DB --file=./migrations/001_allow_null_statement_date.sql

echo "✅ Migration completed successfully!"
echo ""
echo "📝 Summary of changes:"
echo "   - Modified statement table to allow NULL values for statement_date"
echo "   - Converted placeholder dates (1900-01-01, 2024-01-01) to NULL"
echo "   - Added index for efficient statement date lookups"
echo ""
echo "🎉 The database is now ready to handle NULL statement dates!"