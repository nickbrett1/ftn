#!/bin/bash

# Configuration
DB_NAME="wdi"
# Output migration file (D1 migration naming convention: XXXX_description.sql)
MIGRATION_DIR="migrations"
MIGRATION_FILE="$MIGRATION_DIR/0000_bootstrap_schema_and_sample_data.sql"
SAMPLE_SIZE=5 # Number of sample rows to fetch per table

# --- Script Start ---

set -e # Exit immediately if a command exits with a non-zero status.

# Ensure migrations directory exists
mkdir -p "$MIGRATION_DIR"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq could not be found. Please install jq to run this script."
    exit 1
fi

echo "-- Migration generated on $(date) for D1 database: $DB_NAME" > "$MIGRATION_FILE"
echo "-- Fetches schema and $SAMPLE_SIZE sample rows from each table." >> "$MIGRATION_FILE"
echo "" >> "$MIGRATION_FILE"

echo "Fetching table list from remote D1 database: $DB_NAME..."
# Get table names, excluding sqlite system tables and Cloudflare internal tables
# Output is JSON: [{"results":[{"name":"table1"},{"name":"table2"}]}]
TABLE_NAMES_JSON=$(npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%';" --json)

if [ -z "$TABLE_NAMES_JSON" ] || [ "$(echo "$TABLE_NAMES_JSON" | jq 'length')" == "0" ] || [ "$(echo "$TABLE_NAMES_JSON" | jq '.[0].results | length')" == "0" ]; then
    echo "Error: Could not fetch table names or no user tables found in the database '$DB_NAME'."
    exit 1
fi

TABLE_NAMES=$(echo "$TABLE_NAMES_JSON" | jq -r '.[0].results[].name')

if [ -z "$TABLE_NAMES" ] && [ "$(echo "$TABLE_NAMES_JSON" | jq -r '.[0].results | length')" == "0" ]; then # Double check if TABLE_NAMES is empty string after jq
    echo "No user tables found in the database '$DB_NAME'."
    exit 0
fi

echo "Found tables:"
echo "$TABLE_NAMES"
echo ""

# Add DROP TABLE statements first
echo "-- Drop existing tables (if they exist)" >> "$MIGRATION_FILE"
for TABLE_NAME_TO_DROP in $TABLE_NAMES; do
    echo "DROP TABLE IF EXISTS \"$TABLE_NAME_TO_DROP\";" >> "$MIGRATION_FILE"
done
echo "" >> "$MIGRATION_FILE"

for TABLE_NAME in $TABLE_NAMES; do
    echo "Processing table: $TABLE_NAME"

    # 1. Get CREATE TABLE statement
    echo "-- Schema for table: $TABLE_NAME" >> "$MIGRATION_FILE"
    # Output is JSON: [{"results":[{"sql":"CREATE TABLE..."}]}]
    CREATE_TABLE_SQL=$(npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT sql FROM sqlite_master WHERE type='table' AND name='$TABLE_NAME';" --json | jq -r '.[0].results[0].sql')
    if [ "$CREATE_TABLE_SQL" == "null" ] || [ -z "$CREATE_TABLE_SQL" ]; then
        echo "Warning: Could not fetch schema for table $TABLE_NAME. Skipping."
        echo "" >> "$MIGRATION_FILE"
        continue
    fi
    echo "$CREATE_TABLE_SQL;" >> "$MIGRATION_FILE"
    echo "" >> "$MIGRATION_FILE"

    # 2. Get column names for constructing INSERT statements
    # Output is JSON: [{"results":[{"name":"col1", "type":"TEXT", ...}, ...]}]
    COLUMNS_INFO_JSON=$(npx wrangler d1 execute "$DB_NAME" --remote --command "PRAGMA table_info('$TABLE_NAME');" --json)
    COLUMN_NAMES_ARRAY=($(echo "$COLUMNS_INFO_JSON" | jq -r '.[0].results[].name')) # Bash array
    COLUMN_NAMES_SQL_LIST=$(echo "$COLUMNS_INFO_JSON" | jq -r '.[0].results | map("\"" + .name + "\"") | join(",")')


    if [ ${#COLUMN_NAMES_ARRAY[@]} -eq 0 ]; then
        echo "Warning: Could not retrieve column names for table $TABLE_NAME. Skipping sample data."
        echo "" >> "$MIGRATION_FILE"
        continue
    fi

    # 3. Get sample data
    echo "-- Sample data for table: $TABLE_NAME (limit $SAMPLE_SIZE)" >> "$MIGRATION_FILE"
    # Output is JSON: [{"results":[{"col1":"val1", "col2":123}, ...]}]
    SAMPLE_DATA_JSON=$(npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT * FROM \"$TABLE_NAME\" LIMIT $SAMPLE_SIZE;" --json)

    if [ -z "$SAMPLE_DATA_JSON" ] || [ "$(echo "$SAMPLE_DATA_JSON" | jq 'length')" == "0" ] || [ "$(echo "$SAMPLE_DATA_JSON" | jq '.[0].results | length')" == "0" ]; then
        echo "No sample data found for table $TABLE_NAME or table is empty."
        echo "" >> "$MIGRATION_FILE"
        continue
    fi

    # Iterate over each row in results (each row is a JSON object)
    echo "$SAMPLE_DATA_JSON" | jq -c '.[0].results[]' | while IFS= read -r ROW_JSON; do
        VALUES_SQL_LIST=""
        FIRST_COL=true
        for COL_NAME in "${COLUMN_NAMES_ARRAY[@]}"; do
            VALUE_RAW=$(echo "$ROW_JSON" | jq --arg COL_NAME "$COL_NAME" '.[$COL_NAME]') # Keep as JSON value

            VALUE_FORMATTED=""
            if [[ "$VALUE_RAW" == "null" ]]; then
                VALUE_FORMATTED="NULL"
            elif [[ "$VALUE_RAW" =~ ^[0-9]+(\.[0-9]+)?$ ]] || [[ "$VALUE_RAW" =~ ^\"[0-9]+(\.[0-9]+)?\"$ ]]; then # Numeric (raw or string-quoted)
                 # Remove quotes if they exist for numbers that jq might stringify
                VALUE_UNQUOTED=$(echo "$VALUE_RAW" | sed 's/^"//;s/"$//')
                VALUE_FORMATTED="$VALUE_UNQUOTED"
            else # String or other type that needs to be quoted
                # Remove surrounding quotes added by jq, then escape internal single quotes
                VALUE_UNQUOTED=$(echo "$VALUE_RAW" | jq -r '.')
                VALUE_ESCAPED=$(echo "$VALUE_UNQUOTED" | sed "s/'/''/g")
                VALUE_FORMATTED="'$VALUE_ESCAPED'"
            fi

            if [ "$FIRST_COL" = true ]; then
                VALUES_SQL_LIST="$VALUE_FORMATTED"
                FIRST_COL=false
            else
                VALUES_SQL_LIST="$VALUES_SQL_LIST, $VALUE_FORMATTED"
            fi
        done
        echo "INSERT INTO \"$TABLE_NAME\" ($COLUMN_NAMES_SQL_LIST) VALUES ($VALUES_SQL_LIST);" >> "$MIGRATION_FILE"
    done
    echo "" >> "$MIGRATION_FILE"
done

echo "Migration file generated successfully: $MIGRATION_FILE"
echo "Applying migration to local D1 database: $DB_NAME..."

npx wrangler d1 migrations apply "$DB_NAME" --local

echo "Local D1 database '$DB_NAME' populated successfully from remote schema and sample data."
