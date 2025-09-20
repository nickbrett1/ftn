#!/bin/bash
#
# create_ccbilling_d1.sh
#
# This script creates the 'ccbilling' D1 database (if it doesn't exist)
# and applies the schema from ccbilling_schema.sql if not already present.
#
# Usage:
#   # First, ensure wrangler config is set up:
#   doppler run -- ./scripts/setup-wrangler-config.sh
#   # Then run this script:
#   bash create_ccbilling_d1.sh
#
# Requirements:
#   - Cloudflare Wrangler CLI (npx wrangler)
#   - Doppler CLI with proper configuration
#   - ccbilling_schema.sql in the same directory as this script
#
# This script is idempotent: it will not overwrite an existing database or schema.

set -e

DB_NAME="ccbilling"
SCHEMA_FILE="$(dirname "$0")/ccbilling_schema.sql"
LOCAL_DB_PATH=".wrangler/state/v3/d1/databases/$DB_NAME/db.sqlite"

if ! command -v npx &> /dev/null; then
  echo "ERROR: npx is not installed. Please install Node.js and npm."
  exit 1
fi

if ! npx wrangler --version &> /dev/null; then
  echo "ERROR: Cloudflare Wrangler CLI is not installed. Run 'npm install -g wrangler' or use npx."
  exit 1
fi

# Check if wrangler.jsonc exists
if [ ! -f "wrangler.jsonc" ]; then
  echo "ERROR: wrangler.jsonc not found. Please run 'doppler run -- ./scripts/setup-wrangler-config.sh' first."
  exit 1
fi

echo_and_run() {
  echo "+ $@"
  "$@"
}

create_and_apply_schema() {
  local ENV=$1
  local ENV_ARG=""
  local ENV_LABEL="dev"
  if [ "$ENV" = "prod" ]; then
    ENV_ARG="--remote"
    ENV_LABEL="prod"
    # Check if the database already exists in prod
    if npx wrangler d1 list | grep -q "^$DB_NAME\b"; then
      echo "INFO: D1 database '$DB_NAME' already exists in $ENV_LABEL environment."
    else
      echo "INFO: Creating D1 database '$DB_NAME' in $ENV_LABEL environment..."
      if ! npx wrangler d1 create "$DB_NAME" $ENV_ARG 2>&1 | tee /tmp/wrangler_create.log | grep -q "already exists"; then
        echo "INFO: Created D1 database '$DB_NAME' in $ENV_LABEL environment."
      else
        echo "INFO: D1 database '$DB_NAME' already exists in $ENV_LABEL environment (create command)."
      fi
    fi
  else
    ENV_ARG="--local"
    ENV_LABEL="dev"
    # Check for local SQLite file
    if [ -f "$LOCAL_DB_PATH" ]; then
      echo "INFO: Local D1 database '$DB_NAME' exists at $LOCAL_DB_PATH."
    else
      echo "INFO: Local D1 database '$DB_NAME' does not exist. Creating..."
      if ! npx wrangler d1 create "$DB_NAME" $ENV_ARG 2>&1 | tee /tmp/wrangler_create.log | grep -q "already exists"; then
        echo "INFO: Created local D1 database '$DB_NAME'."
      else
        echo "INFO: Local D1 database '$DB_NAME' already exists (create command)."
      fi
    fi
  fi

  # Check if any user tables exist (ignore sqlite metadata tables and _cf_KV)
  TABLE_COUNT=$(npx wrangler d1 execute "$DB_NAME" $ENV_ARG --command \
    "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_cf_KV';" --json \
    | jq '.[0].results[0]["count(*)"]')

  if [ "$TABLE_COUNT" = "0" ]; then
    echo "INFO: No user tables found in '$DB_NAME' ($ENV_LABEL). Applying schema..."
    npx wrangler d1 execute "$DB_NAME" $ENV_ARG --file="$SCHEMA_FILE"
    echo "SUCCESS: Schema applied to '$DB_NAME' in $ENV_LABEL."
  else
    echo "INFO: Schema already present in '$DB_NAME' ($ENV_LABEL)."
  fi
}

echo "--- DEV ENVIRONMENT ---"
create_and_apply_schema "dev"

echo "--- PRODUCTION ENVIRONMENT ---"
create_and_apply_schema "prod"

echo "SUCCESS: '$DB_NAME' D1 database is ready with the schema applied in both dev and prod." 