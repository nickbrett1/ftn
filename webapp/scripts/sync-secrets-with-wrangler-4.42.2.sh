#!/bin/bash
set -e

# Sync secrets using wrangler 4.42.2 to work around API compatibility issues
# This script should be used after deployment with wrangler 4.43.0

echo "🔄 Syncing secrets using wrangler 4.42.2 to work around API compatibility issues..."

# Check if doppler CLI is available
if ! command -v doppler &> /dev/null; then
    echo "❌ Error: Doppler CLI is not installed or not in PATH"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed. Installing jq..."
    sudo apt-get update && sudo apt-get install -y jq
fi

# Install wrangler 4.42.2 temporarily for secret syncing
echo "📦 Installing wrangler 4.42.2 for secret syncing..."
npm install wrangler@4.42.2 --no-save

# Set environment variables for Doppler
export DOPPLER_PROJECT="webapp"
export DOPPLER_CONFIG="stg"

echo "🔍 Fetching secrets from Doppler..."
if doppler secrets --json | jq -c 'with_entries(.value = .value.computed)' | npx wrangler@4.42.2 secret bulk --env production; then
    echo "✅ Secrets successfully synced to Cloudflare production using wrangler 4.42.2"
else
    echo "❌ Error: Failed to sync secrets to Cloudflare production with wrangler 4.42.2"
    echo "This might be due to:"
    echo "  1. Missing CLOUDFLARE_API_TOKEN"
    echo "  2. Worker not properly deployed"
    echo "  3. Network connectivity issues"
    exit 1
fi

echo "🎉 Secret syncing completed successfully!"
