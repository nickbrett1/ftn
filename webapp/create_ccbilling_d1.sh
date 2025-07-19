#!/bin/bash
#
# create_ccbilling_d1.sh
#
# This script creates the 'ccbilling' D1 database (if it doesn't exist)
# and applies the schema from ccbilling_schema.sql.
#
# Usage:
#   bash create_ccbilling_d1.sh
#
# Requirements:
#   - Cloudflare Wrangler CLI (npx wrangler)
#   - ccbilling_schema.sql in the same directory as this script
#
# This script is idempotent: it will not overwrite an existing database.

set -e

DB_NAME="ccbilling"
SCHEMA_FILE="$(dirname "$0")/ccbilling_schema.sql"

if ! command -v npx &> /dev/null; then
  echo "ERROR: npx is not installed. Please install Node.js and npm."
  exit 1
fi

if ! npx wrangler --version &> /dev/null; then
  echo "ERROR: Cloudflare Wrangler CLI is not installed. Run 'npm install -g wrangler' or use npx."
  exit 1
fi

# Check if the database already exists
if npx wrangler d1 list | grep -q "^$DB_NAME\b"; then
  echo "INFO: D1 database '$DB_NAME' already exists."
else
  echo "INFO: Creating D1 database '$DB_NAME'..."
  npx wrangler d1 create "$DB_NAME"
fi

echo "INFO: Applying schema from $SCHEMA_FILE to '$DB_NAME'..."
npx wrangler d1 execute "$DB_NAME" --file="$SCHEMA_FILE"

echo "SUCCESS: '$DB_NAME' D1 database is ready with the schema applied." 