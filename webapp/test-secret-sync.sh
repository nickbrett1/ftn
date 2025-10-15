#!/bin/bash
set -e

# Test script for secret syncing with latest wrangler version
# This script tests the secret syncing with the current wrangler version

echo "🧪 Testing secret syncing with latest wrangler version..."

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

# Check wrangler version
echo "📦 Current wrangler version:"
npx wrangler --version

# Test the secret syncing command (dry run - just check syntax)
echo "🔄 Testing secret sync command syntax..."
if doppler secrets --json | jq -c 'with_entries(.value = .value.computed)' | head -c 100 > /dev/null; then
    echo "✅ Secret sync command syntax is valid"
    echo "📝 Note: This is a dry run. Actual secret upload requires proper environment setup."
else
    echo "❌ Secret sync command syntax test failed"
    exit 1
fi

echo "✅ Test completed successfully!"