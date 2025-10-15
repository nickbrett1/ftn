#!/bin/bash
set -e

# Test script for the dual wrangler approach
# This script tests the secret syncing with wrangler 4.42.2

echo "🧪 Testing dual wrangler approach for secret syncing..."

# Check if we have the required environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ Error: CLOUDFLARE_API_TOKEN environment variable is not set"
    echo "Please set your Cloudflare API token:"
    echo "export CLOUDFLARE_API_TOKEN=your_token_here"
    exit 1
fi

if [ -z "$DOPPLER_TOKEN" ]; then
    echo "❌ Error: DOPPLER_TOKEN environment variable is not set"
    echo "Please set your Doppler token:"
    echo "export DOPPLER_TOKEN=your_token_here"
    exit 1
fi

echo "✅ Environment variables are set"

# Test the secret syncing script
echo "🔄 Running secret sync test..."
if ./scripts/sync-secrets-with-wrangler-4.42.2.sh; then
    echo "✅ Test completed successfully!"
else
    echo "❌ Test failed"
    exit 1
fi
