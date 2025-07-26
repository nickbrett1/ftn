#!/bin/bash
set -euo pipefail

# Configuration
WRANGLER_CONFIG="$(dirname "$0")/wrangler.jsonc"
TEMP_DIR=$(mktemp -d)

# Ensure the temporary directory is cleaned up on script exit (success or failure)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Ensure wrangler is available
if ! command -v npx wrangler &> /dev/null; then
    echo "Error: wrangler (via npx) could not be found. Please ensure it's installed and in your PATH." >&2
    exit 1
fi

# Ensure jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "Error: jq could not be found. Please install jq for JSON parsing." >&2
    exit 1
fi

# Function to discover R2 buckets from wrangler.jsonc
discover_buckets() {
    local config_file="$1"
    
    if [[ ! -f "$config_file" ]]; then
        echo "Error: wrangler.jsonc not found at $config_file" >&2
        return 1
    fi
    
    echo "Discovering R2 buckets from $config_file..."
    
    # Extract bucket names from both root level and production environment
    # Using jq to parse JSONC (which jq handles fine despite comments)
    local bucket_names
    bucket_names=$(jq -r '
        [
            (.r2_buckets[]?.bucket_name // empty),
            (.env.production.r2_buckets[]?.bucket_name // empty)
        ] | unique | .[]
    ' "$config_file" 2>/dev/null)
    
    if [[ -z "$bucket_names" ]]; then
        echo "Warning: No R2 buckets found in $config_file" >&2
        return 1
    fi
    
    echo "$bucket_names"
}

# Function to sync a bucket
sync_bucket() {
    local bucket_name="$1"
    echo "--- Syncing R2 bucket '$bucket_name' from production to local simulation ---"
    echo ""
    
    # Create bucket-specific temp directory
    local bucket_temp_dir="$TEMP_DIR/$bucket_name"
    mkdir -p "$bucket_temp_dir"
    
    # List all objects in the production bucket
    echo "Listing objects in production R2 bucket '$bucket_name'..."
    local objects_list="$bucket_temp_dir/objects.txt"
    
    if npx wrangler r2 object list "$bucket_name" --remote > "$objects_list" 2>/dev/null; then
        local object_count=$(wc -l < "$objects_list" 2>/dev/null || echo "0")
        echo "Found $object_count objects in production bucket '$bucket_name'."
        
        if [ "$object_count" -eq 0 ]; then
            echo "No objects found in production bucket '$bucket_name'. Skipping sync."
            echo ""
            return 0
        fi
    else
        echo "Warning: Could not list objects in production bucket '$bucket_name' or bucket is empty. Skipping sync."
        echo ""
        return 0
    fi
    
    # Process each object
    local success_count=0
    local error_count=0
    
    while IFS= read -r line; do
        # Skip empty lines and header lines
        if [[ -z "$line" || "$line" == *"Key"* || "$line" == *"---"* ]]; then
            continue
        fi
        
        # Extract object key (first column, properly handling spaces in filenames)
        # Use tab or multiple spaces as delimiter, take everything up to the first delimiter
        local object_key=$(echo "$line" | sed 's/[[:space:]]\{2,\}.*//' | sed 's/\t.*//')
        
        if [[ -z "$object_key" ]]; then
            continue
        fi
        
        echo "Syncing object: $object_key"
        
        # Create local path for the object
        local temp_file="$bucket_temp_dir/$(basename "$object_key")"
        
        # Download the object from production
        if npx wrangler r2 object get "$bucket_name/$object_key" --file="$temp_file" --remote 2>/dev/null; then
            # Upload to local simulation
            if npx wrangler r2 object put "$bucket_name/$object_key" --file="$temp_file" --local 2>/dev/null; then
                echo "  ✓ Successfully synced: $object_key"
                ((success_count++))
            else
                echo "  ✗ Failed to upload to local: $object_key"
                ((error_count++))
            fi
        else
            echo "  ✗ Failed to download from production: $object_key"
            ((error_count++))
        fi
        
        # Clean up temp file
        rm -f "$temp_file"
        
    done < "$objects_list"
    
    echo ""
    echo "Bucket '$bucket_name' sync completed: $success_count successful, $error_count errors"
    echo ""
}

# Main execution
echo "=== Starting R2 bucket synchronization from production to local ==="
echo ""

# Discover buckets from wrangler.jsonc
bucket_names=$(discover_buckets "$WRANGLER_CONFIG")
if [[ $? -ne 0 || -z "$bucket_names" ]]; then
    echo "Error: Could not discover R2 buckets from configuration. Exiting." >&2
    exit 1
fi

# Convert bucket names to array
readarray -t BUCKETS <<< "$bucket_names"

echo "Discovered ${#BUCKETS[@]} R2 bucket(s): ${BUCKETS[*]}"
echo ""

total_success=0
total_errors=0

for bucket in "${BUCKETS[@]}"; do
    sync_bucket "$bucket"
done

echo "=== All bucket synchronization completed ==="
echo "Total buckets processed: ${#BUCKETS[@]}"
echo "Buckets: ${BUCKETS[*]}"
echo ""
echo "--- Script finished successfully ---"