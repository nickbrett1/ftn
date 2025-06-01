#!/bin/bash
set -euo pipefail

# Configuration
PROD_BUCKET_NAME="wdi"
LOCAL_BUCKET_NAME="wdi" # This must match a bucket_name in wrangler.jsonc r2_buckets for --local to work as expected
OBJECT_KEY="docs/static_index.html"

# Create a temporary file for the download/upload operation
TEMP_FILE_PATH=$(mktemp)

# Ensure the temporary file is cleaned up on script exit (success or failure)
trap 'rm -f "$TEMP_FILE_PATH"' EXIT

# Ensure wrangler is available
if ! command -v npx wrangler &> /dev/null; then
    echo "Error: wrangler (via npx) could not be found. Please ensure it's installed and in your PATH." >&2
    exit 1
fi

echo "--- Syncing '$OBJECT_KEY' from production R2 bucket '$PROD_BUCKET_NAME' to local R2 simulation for bucket '$LOCAL_BUCKET_NAME' ---"
echo ""

# Download the file from the production R2 bucket
echo "Downloading '$OBJECT_KEY' from production R2 bucket '$PROD_BUCKET_NAME' to '$TEMP_FILE_PATH'..."
if npx wrangler r2 object get "$PROD_BUCKET_NAME/$OBJECT_KEY" --file="$TEMP_FILE_PATH" --remote; then
    echo "File '$OBJECT_KEY' downloaded successfully."
else
    echo "Error: Failed to download '$OBJECT_KEY' from production R2 bucket '$PROD_BUCKET_NAME'." >&2
    exit 1
fi
echo ""

# Upload the file to the local R2 bucket simulation
# This will overwrite if the object already exists in the local simulation.
# The local bucket is implicitly available based on wrangler.jsonc configuration when --local is used.
echo "Uploading '$OBJECT_KEY' from '$TEMP_FILE_PATH' to local R2 simulation for bucket '$LOCAL_BUCKET_NAME'..."
if npx wrangler r2 object put "$LOCAL_BUCKET_NAME/$OBJECT_KEY" --file="$TEMP_FILE_PATH" --local; then
    echo "File '$OBJECT_KEY' uploaded successfully to local R2 simulation for bucket '$LOCAL_BUCKET_NAME'."
else
    echo "Error: Failed to upload '$OBJECT_KEY' to local R2 simulation for bucket '$LOCAL_BUCKET_NAME'." >&2
    exit 1
fi
echo ""

echo "--- Script finished successfully ---"