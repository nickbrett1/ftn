#!/bin/bash
set -e

# Setup Wrangler Configuration Script
# This script generates wrangler.jsonc from the template using environment variables
# It should be called during development setup and CI/CD deployments

echo "Setting up Wrangler configuration..."

# Check if doppler CLI is available
if ! command -v doppler &> /dev/null; then
    echo "❌ Error: Doppler CLI is not installed or not in PATH"
    echo "Please install Doppler CLI: https://docs.doppler.com/docs/install-cli"
    exit 1
fi

# Check Doppler authentication status
echo "🔍 Checking Doppler authentication..."
if ! doppler whoami &> /dev/null; then
    echo "❌ Error: Not authenticated with Doppler"
    echo "Please run: doppler login"
    exit 1
fi

echo "✅ Doppler authentication confirmed"
echo "👤 Current Doppler user: $(doppler whoami 2>/dev/null || echo 'Unable to determine')"

# Check if wrangler.template.jsonc exists
if [ ! -f "wrangler.template.jsonc" ]; then
    echo "Error: wrangler.template.jsonc not found in current directory"
    exit 1
fi

# Build doppler args - use a different variable name to avoid confusion with DOPPLER_CONFIG (which is the token)
DOPPLER_CONFIG_TO_USE=""
DOPPLER_ARGS=""
if [ -n "$DOPPLER_CONFIG_NAME" ]; then
    DOPPLER_CONFIG_TO_USE="$DOPPLER_CONFIG_NAME"
    DOPPLER_ARGS="--config $DOPPLER_CONFIG_NAME"
    echo "🎯 Using Doppler config: $DOPPLER_CONFIG_NAME (from DOPPLER_CONFIG_NAME environment variable)"
else
    # Default to stg config for staging/production builds
    DOPPLER_CONFIG_TO_USE="stg"
    DOPPLER_ARGS="--config stg"
    echo "🎯 Using Doppler config: stg (default)"
fi

# Debug: Show if DOPPLER_CONFIG (token) is set
if [ -n "$DOPPLER_CONFIG" ]; then
    echo "🔑 Doppler token is set via DOPPLER_CONFIG (${#DOPPLER_CONFIG} characters)"
else
    echo "🔑 No Doppler token found in DOPPLER_CONFIG environment variable"
fi

# Validate that the config exists and is accessible
echo "🔍 Validating access to Doppler config '$DOPPLER_CONFIG_TO_USE'..."
if ! doppler configs get --project webapp --config "$DOPPLER_CONFIG_TO_USE" &> /dev/null; then
    echo "❌ Error: Cannot access Doppler config '$DOPPLER_CONFIG_TO_USE' in project 'webapp'"
    echo ""
    echo "🔍 Debugging information:"
    echo "  - Token type: Service token (CircleCI)"
    echo "  - Project: webapp"
    echo "  - Requested config: $DOPPLER_CONFIG_TO_USE"
    echo ""
    echo "📋 Attempting to list available configs:"
    if doppler configs --project webapp 2>/dev/null; then
        echo "✅ Successfully listed configs above"
    else
        echo "❌ Failed to list configs. This service token may have limited permissions."
        echo "💡 Common issues:"
        echo "   1. The config '$DOPPLER_CONFIG_TO_USE' doesn't exist"
        echo "   2. The service token doesn't have access to this config"
        echo "   3. The config name is being passed incorrectly"
    fi
    echo ""
    echo "🔧 To fix this:"
    echo "   1. Check that the config '$DOPPLER_CONFIG_TO_USE' exists in the Doppler dashboard"
    echo "   2. Ensure the CircleCI service token has access to this config"
    echo "   3. Verify the DOPPLER_CONFIG environment variable is set correctly"
    exit 1
fi
echo "✅ Config '$DOPPLER_CONFIG_TO_USE' is accessible"

# Run doppler to get environment variables and execute the configuration generation
echo "📥 Fetching environment variables from Doppler config '$DOPPLER_CONFIG_TO_USE'..."
if ! doppler run $DOPPLER_ARGS -- bash -c '
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
'; then
    echo "✅ Wrangler configuration setup completed successfully"
else
    echo "❌ Error: Failed to fetch environment variables from Doppler or generate wrangler.jsonc"
    echo "This could be due to:"
    echo "  1. Invalid Doppler token"
    echo "  2. Token doesn't have access to config '$DOPPLER_CONFIG_TO_USE'"
    echo "  3. Missing required environment variables in Doppler config"
    echo "  4. Network connectivity issues"
    exit 1
fi 