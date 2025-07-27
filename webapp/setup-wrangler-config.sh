#!/bin/bash
set -e

# Setup Wrangler Configuration Script
# This script generates wrangler.jsonc from the template using environment variables
# It should be called during development setup and CI/CD deployments

echo "Setting up Wrangler configuration..."

# Check if doppler CLI is available
if ! command -v doppler &> /dev/null; then
    echo "Error: Doppler CLI is not installed or not in PATH"
    echo "Please install Doppler CLI: https://docs.doppler.com/docs/install-cli"
    exit 1
fi

# Check if wrangler.template.jsonc exists
if [ ! -f "wrangler.template.jsonc" ]; then
    echo "Error: wrangler.template.jsonc not found in current directory"
    exit 1
fi

# Run doppler to get environment variables and execute the configuration generation
echo "Fetching environment variables from Doppler..."
doppler run -- bash -c '
    # Check if required environment variables are set
    if [ -z "$KV_NAMESPACE_ID" ]; then
        echo "Error: KV_NAMESPACE_ID environment variable is not set in Doppler"
        exit 1
    fi

    if [ -z "$D1_WDI_DATABASE_ID" ]; then
        echo "Error: D1_WDI_DATABASE_ID environment variable is not set in Doppler"
        exit 1
    fi

    if [ -z "$D1_CCBILLING_DATABASE_ID" ]; then
        echo "Error: D1_CCBILLING_DATABASE_ID environment variable is not set in Doppler"
        exit 1
    fi

    # Create wrangler.jsonc from template with substitutions
    echo "Generating wrangler.jsonc from template..."
    sed \
        -e "s/KV_NAMESPACE_ID_PLACEHOLDER/$KV_NAMESPACE_ID/g" \
        -e "s/D1_WDI_DATABASE_ID_PLACEHOLDER/$D1_WDI_DATABASE_ID/g" \
        -e "s/D1_CCBILLING_DATABASE_ID_PLACEHOLDER/$D1_CCBILLING_DATABASE_ID/g" \
        wrangler.template.jsonc > wrangler.jsonc

    echo "✅ Wrangler configuration generated successfully"
    echo "📁 Generated: wrangler.jsonc"
' 