#!/bin/bash

# Configuration
# Output migration file (D1 migration naming convention: XXXX_description.sql)
BOOTSTRAP_SQL_DIR="migrations" # Keeping the directory name as 'migrations' for now, as D1 might expect it.
SAMPLE_SIZE=500 # Number of sample rows to fetch per table

# Function to display usage information
show_usage() {
    echo "Usage: $0 DATABASE_NAME"
    echo ""
    echo "Arguments:"
    echo "  DATABASE_NAME    Database to populate from production (wdi or ccbilling)"
    echo "                   Required: Must specify either 'wdi' or 'ccbilling'"
    echo ""
    echo "Examples:"
    echo "  $0 ccbilling          # Populate ccbilling database"
    echo "  $0 wdi                # Populate wdi database"
    echo ""
    echo "This script fetches schema and sample data from the remote D1 database"
    echo "and applies it to the local D1 database."
}

# Parse command line arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

# Check if database name argument is provided
if [ -z "$1" ]; then
    echo "Error: Database name is required."
    echo ""
    show_usage
    exit 1
fi

# Set database name from argument
DB_NAME="$1"

# Validate database name
if [ "$DB_NAME" != "wdi" ] && [ "$DB_NAME" != "ccbilling" ]; then
    echo "Error: Invalid database name '$DB_NAME'."
    echo "Valid options are: wdi, ccbilling"
    echo ""
    show_usage
    exit 1
fi

# Set database-specific bootstrap SQL file
BOOTSTRAP_SQL_FILE="$BOOTSTRAP_SQL_DIR/0000_bootstrap_schema_and_sample_data_${DB_NAME}.sql"

# --- Script Start ---

set -e # Exit immediately if a command exits with a non-zero status.

# Ensure migrations directory exists
mkdir -p "$BOOTSTRAP_SQL_DIR"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq could not be found. Please install jq to run this script."
    exit 1
fi
echo "-- Bootstrap SQL generated on $(date) for D1 database: $DB_NAME" > "$BOOTSTRAP_SQL_FILE"
echo "-- Fetches schema and $SAMPLE_SIZE sample rows from each table from production." >> "$BOOTSTRAP_SQL_FILE"
echo "" >> "$BOOTSTRAP_SQL_FILE"

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
echo "-- Drop existing tables (if they exist)" >> "$BOOTSTRAP_SQL_FILE"
for TABLE_NAME_TO_DROP in $TABLE_NAMES; do
    echo "DROP TABLE IF EXISTS \"$TABLE_NAME_TO_DROP\";" >> "$BOOTSTRAP_SQL_FILE"
done
echo "" >> "$BOOTSTRAP_SQL_FILE"

for TABLE_NAME in $TABLE_NAMES; do
    echo "Processing table: $TABLE_NAME"

    # 1. Get CREATE TABLE statement
    echo "-- Schema for table: $TABLE_NAME" >> "$BOOTSTRAP_SQL_FILE"
    # Output is JSON: [{"results":[{"sql":"CREATE TABLE..."}]}]
    CREATE_TABLE_SQL=$(npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT sql FROM sqlite_master WHERE type='table' AND name='$TABLE_NAME';" --json | jq -r '.[0].results[0].sql')
    if [ "$CREATE_TABLE_SQL" == "null" ] || [ -z "$CREATE_TABLE_SQL" ]; then
        echo "Warning: Could not fetch schema for table $TABLE_NAME. Skipping."
        echo "" >> "$BOOTSTRAP_SQL_FILE"
        continue
    fi
    echo "$CREATE_TABLE_SQL;" >> "$BOOTSTRAP_SQL_FILE"
    echo "" >> "$BOOTSTRAP_SQL_FILE"

    # 2. Get column names for constructing INSERT statements
    # Output is JSON: [{"results":[{"name":"col1", "type":"TEXT", ...}, ...]}]
    COLUMNS_INFO_JSON=$(npx wrangler d1 execute "$DB_NAME" --remote --command "PRAGMA table_info('$TABLE_NAME');" --json)
    COLUMN_NAMES_ARRAY=($(echo "$COLUMNS_INFO_JSON" | jq -r '.[0].results[].name')) # Bash array
    COLUMN_NAMES_SQL_LIST=$(echo "$COLUMNS_INFO_JSON" | jq -r '.[0].results | map("\"" + .name + "\"") | join(",")')


    if [ ${#COLUMN_NAMES_ARRAY[@]} -eq 0 ]; then
        echo "Warning: Could not retrieve column names for table $TABLE_NAME. Skipping sample data."
        echo "" >> "$BOOTSTRAP_SQL_FILE"
        continue
    fi

    # 3. Get sample data
    echo "-- Sample data for table: $TABLE_NAME (limit $SAMPLE_SIZE)" >> "$BOOTSTRAP_SQL_FILE"
    # Output is JSON: [{"results":[{"col1":"val1", "col2":123}, ...]}]
    SAMPLE_DATA_JSON=$(npx wrangler d1 execute "$DB_NAME" --remote --command "SELECT * FROM \"$TABLE_NAME\" LIMIT $SAMPLE_SIZE;" --json)

    if [ -z "$SAMPLE_DATA_JSON" ] || [ "$(echo "$SAMPLE_DATA_JSON" | jq 'length')" == "0" ] || [ "$(echo "$SAMPLE_DATA_JSON" | jq '.[0].results | length')" == "0" ]; then
        echo "No sample data found for table $TABLE_NAME or table is empty."
        echo "" >> "$BOOTSTRAP_SQL_FILE"
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
        echo "INSERT INTO \"$TABLE_NAME\" ($COLUMN_NAMES_SQL_LIST) VALUES ($VALUES_SQL_LIST);" >> "$BOOTSTRAP_SQL_FILE"
    done
    echo "" >> "$BOOTSTRAP_SQL_FILE"
done

echo "Bootstrap SQL file generated successfully: $BOOTSTRAP_SQL_FILE"

echo "Attempting to clean all existing user tables from local D1 database: $DB_NAME before applying bootstrap SQL..."
# Attempt to fetch local table names. Suppress stderr for cases like DB not existing or other wrangler errors.
LOCAL_TABLE_NAMES_JSON_CLEANUP=$(npx wrangler d1 execute "$DB_NAME" --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%';" --json 2>/dev/null)

if [ -z "$LOCAL_TABLE_NAMES_JSON_CLEANUP" ]; then
    echo "Info: Could not fetch local table list (e.g., database '$DB_NAME' might not exist locally, is empty, or the command failed). Skipping pre-migration cleanup of existing tables."
else
    # Check if .[0].results is an array and contains items, then extract names.
    # jq -e exits with 0 if the last output is not null or false.
    if echo "$LOCAL_TABLE_NAMES_JSON_CLEANUP" | jq -e '.[0].results | if type == "array" then map(.name) | length > 0 else false end' > /dev/null 2>&1; then
        LOCAL_TABLE_NAMES_CLEANUP=$(echo "$LOCAL_TABLE_NAMES_JSON_CLEANUP" | jq -r '.[0].results[].name')
        
        echo "Found existing local user tables to drop:"
        # Print names for clarity, handling potential multi-line output from jq
        echo "$LOCAL_TABLE_NAMES_CLEANUP" | sed 's/^/  - /'
        
        echo "Dropping all local tables in a single transaction..."
        
        # Build a single SQL command with all DROP TABLE statements
        DROP_SQL="PRAGMA foreign_keys=OFF;"
        echo "$LOCAL_TABLE_NAMES_CLEANUP" | while IFS= read -r LOCAL_TABLE_NAME_TO_DROP; do
            if [ -n "$LOCAL_TABLE_NAME_TO_DROP" ]; then # Ensure name is not empty
                echo "Adding DROP TABLE for: \"$LOCAL_TABLE_NAME_TO_DROP\""
                DROP_SQL="$DROP_SQL DROP TABLE IF EXISTS \"$LOCAL_TABLE_NAME_TO_DROP\";"
            fi
        done
        DROP_SQL="$DROP_SQL PRAGMA foreign_keys=ON;"
        
        # Execute all DROP TABLE statements in a single command
        if ! npx wrangler d1 execute "$DB_NAME" --local --command "$DROP_SQL" --yes; then
            echo "Warning: Failed to drop some local tables. Attempting individual drops..."
            # Fallback: try dropping tables individually without foreign key constraints
            echo "$LOCAL_TABLE_NAMES_CLEANUP" | while IFS= read -r LOCAL_TABLE_NAME_TO_DROP; do
                if [ -n "$LOCAL_TABLE_NAME_TO_DROP" ]; then
                    echo "Fallback: Dropping local table: \"$LOCAL_TABLE_NAME_TO_DROP\"..."
                    npx wrangler d1 execute "$DB_NAME" --local --command "PRAGMA foreign_keys=OFF; DROP TABLE IF EXISTS \"$LOCAL_TABLE_NAME_TO_DROP\"; PRAGMA foreign_keys=ON;" --yes || echo "Warning: Failed to drop table \"$LOCAL_TABLE_NAME_TO_DROP\""
                fi
            done
        fi
        echo "Local table cleanup complete."
    elif echo "$LOCAL_TABLE_NAMES_JSON_CLEANUP" | jq -e '.[0].results' > /dev/null 2>&1; then
        echo "No user tables found in local database '$DB_NAME' to clean up (results array was present but empty)."
    else
        echo "Warning: Received unexpected JSON structure or error when fetching local tables for cleanup. Skipping pre-migration cleanup."
        # For debugging, you could uncomment the next line:
        # echo "Received JSON: $LOCAL_TABLE_NAMES_JSON_CLEANUP"
    fi
fi
echo "" # Add a newline for better log readability


echo "Applying remote data to local D1 database: $DB_NAME..."
# The --yes flag is to auto-confirm any prompts, similar to how migrations apply might behave.
npx wrangler d1 execute "$DB_NAME" --local --file="$BOOTSTRAP_SQL_FILE" --yes

echo "Local D1 database '$DB_NAME' populated successfully from remote schema and sample data."
