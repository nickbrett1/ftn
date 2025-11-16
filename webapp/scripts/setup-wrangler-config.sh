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

# Function to display usage information
show_usage() {
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT    Optional: The Doppler environment to use (e.g., 'stg', 'prod')."
    echo "                 Overrides DOPPLER_ENVIRONMENT if both are set."
    echo ""
    echo "This script generates wrangler.jsonc from the template using environment variables"
    echo "fetched from Doppler. It prioritizes the ENVIRONMENT argument, then the"
    echo "DOPPLER_ENVIRONMENT shell variable, and exits if neither is provided."
}

# Parse command line arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
fi

ENV_PARAM="$1" # Capture the first argument as the environment parameter

# Build doppler args - DOPPLER_TOKEN is the token, DOPPLER_ENVIRONMENT is the config name
DOPPLER_CONFIG_TO_USE=""
DOPPLER_ARGS=""

if [ -n "$ENV_PARAM" ]; then
    DOPPLER_CONFIG_TO_USE="$ENV_PARAM"
    DOPPLER_ARGS="--config $ENV_PARAM"
    echo "🎯 Using Doppler config: $ENV_PARAM (from script argument)"
elif [ -n "$DOPPLER_ENVIRONMENT" ]; then
    DOPPLER_CONFIG_TO_USE="$DOPPLER_ENVIRONMENT"
    DOPPLER_ARGS="--config $DOPPLER_ENVIRONMENT"
    echo "🎯 Using Doppler config: $DOPPLER_ENVIRONMENT (from DOPPLER_ENVIRONMENT environment variable)"
else
    echo "❌ Error: No Doppler environment specified."
    echo "Please set DOPPLER_ENVIRONMENT or pass an environment as an argument (e.g., '$0 stg')."
    exit 1
fi

# Add token to args if available
if [ -n "$DOPPLER_TOKEN" ]; then
    DOPPLER_ARGS="$DOPPLER_ARGS --token $DOPPLER_TOKEN"
fi

# Debug: Show environment variables
if [ -n "$DOPPLER_TOKEN" ]; then
    echo "🔑 Doppler token is set via DOPPLER_TOKEN (${#DOPPLER_TOKEN} characters)"
else
    echo "🔑 No Doppler token found in DOPPLER_TOKEN environment variable"
fi

if [ -n "$DOPPLER_ENVIRONMENT" ]; then
    echo "🌍 Doppler environment is set via DOPPLER_ENVIRONMENT: $DOPPLER_ENVIRONMENT"
else
    echo "🌍 No Doppler environment found in DOPPLER_ENVIRONMENT, using default"
fi

# Validate that the config exists and is accessible
echo "🔍 Validating access to Doppler config '$DOPPLER_CONFIG_TO_USE'..."
VALIDATION_ARGS="--project webapp --config $DOPPLER_CONFIG_TO_USE"
if [ -n "$DOPPLER_TOKEN" ]; then
    VALIDATION_ARGS="$VALIDATION_ARGS --token $DOPPLER_TOKEN"
fi
if ! doppler configs get $VALIDATION_ARGS &> /dev/null; then
    echo "❌ Error: Cannot access Doppler config '$DOPPLER_CONFIG_TO_USE' in project 'webapp'"
    echo ""
    echo "🔍 Debugging information:"
    echo "  - Token type: Service token (CircleCI)"
    echo "  - Project: webapp"
    echo "  - Requested config: $DOPPLER_CONFIG_TO_USE"
    echo ""
    echo "📋 Attempting to list available configs:"
    LIST_ARGS="--project webapp"
    if [ -n "$DOPPLER_TOKEN" ]; then
        LIST_ARGS="$LIST_ARGS --token $DOPPLER_TOKEN"
    fi
    if doppler configs $LIST_ARGS 2>/dev/null; then
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
if doppler run $DOPPLER_ARGS -- bash -c '
    set -e  # Exit on any error
    
    echo "🔍 Checking required environment variables..."
    
    # Check if required environment variables are set
    if [ -z "$KV_NAMESPACE_ID" ]; then
        echo "❌ Error: KV_NAMESPACE_ID environment variable is not set in Doppler config"
        exit 1
    fi
    echo "✅ KV_NAMESPACE_ID is set: ${KV_NAMESPACE_ID:0:10}..."

    if [ -z "$D1_WDI_DATABASE_ID" ]; then
        echo "❌ Error: D1_WDI_DATABASE_ID environment variable is not set in Doppler config"
        exit 1
    fi
    echo "✅ D1_WDI_DATABASE_ID is set: ${D1_WDI_DATABASE_ID:0:10}..."

    if [ -z "$D1_CCBILLING_DATABASE_ID" ]; then
        echo "❌ Error: D1_CCBILLING_DATABASE_ID environment variable is not set in Doppler config"
        exit 1
    fi
    echo "✅ D1_CCBILLING_DATABASE_ID is set: ${D1_CCBILLING_DATABASE_ID:0:10}..."

    if [ -z "$D1_GENPROJ_DATABASE_ID" ]; then
        echo "❌ Error: D1_GENPROJ_DATABASE_ID environment variable is not set in Doppler config"
        exit 1
    fi
    echo "✅ D1_GENPROJ_DATABASE_ID is set: ${D1_GENPROJ_DATABASE_ID:0:10}..."

    # Create wrangler.jsonc from template with substitutions
    echo "📝 Generating wrangler.jsonc from template..."
    if ! sed \
        -e "s/KV_NAMESPACE_ID_PLACEHOLDER/$KV_NAMESPACE_ID/g" \
        -e "s/D1_WDI_DATABASE_ID_PLACEHOLDER/$D1_WDI_DATABASE_ID/g" \
        -e "s/D1_CCBILLING_DATABASE_ID_PLACEHOLDER/$D1_CCBILLING_DATABASE_ID/g" \
        -e "s/D1_GENPROJ_DATABASE_ID_PLACEHOLDER/$D1_GENPROJ_DATABASE_ID/g" \
        wrangler.template.jsonc > wrangler.jsonc; then
        echo "❌ Error: Failed to generate wrangler.jsonc from template"
        exit 1
    fi

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
    echo "  5. Template file issues or sed command failure"
    exit 1
fi 