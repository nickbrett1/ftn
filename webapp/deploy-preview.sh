#!/bin/bash
set -e

# Preview Deployment Script for Non-Main Branches
# This script deploys the app to a preview environment with a unique URL

echo "🚀 Setting up preview deployment..."

# Get branch name and sanitize it for URL
BRANCH_NAME=${CIRCLE_BRANCH:-$(git branch --show-current)}
BRANCH_SANITIZED=$(echo "$BRANCH_NAME" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')

# Create preview environment name
PREVIEW_ENV="preview-${BRANCH_SANITIZED}"

echo "📋 Branch: $BRANCH_NAME"
echo "🔗 Preview Environment: $PREVIEW_ENV"

# Check if doppler CLI is available
if ! command -v doppler &> /dev/null; then
    echo "Error: Doppler CLI is not installed or not in PATH"
    exit 1
fi

# Build doppler args if a config override is provided
DOPPLER_ARGS=""
if [ -n "$DOPPLER_CONFIG" ]; then
    DOPPLER_ARGS="--config $DOPPLER_CONFIG"
    echo "Using Doppler config: $DOPPLER_CONFIG"
fi

# Run doppler to get environment variables and execute the deployment
echo "🔐 Fetching environment variables from Doppler..."
doppler run $DOPPLER_ARGS -- bash -c '
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
    echo "📝 Generating wrangler.jsonc for preview deployment..."
    sed \
        -e "s/KV_NAMESPACE_ID_PLACEHOLDER/$KV_NAMESPACE_ID/g" \
        -e "s/D1_WDI_DATABASE_ID_PLACEHOLDER/$D1_WDI_DATABASE_ID/g" \
        -e "s/D1_CCBILLING_DATABASE_ID_PLACEHOLDER/$D1_CCBILLING_DATABASE_ID/g" \
        wrangler.template.jsonc > wrangler.jsonc

    echo "✅ Wrangler configuration generated successfully"

    # Deploy to preview environment
    echo "🚀 Deploying to preview environment: $PREVIEW_ENV"
    npx wrangler deploy --env $PREVIEW_ENV

    echo "🎉 Preview deployment completed successfully!"
    echo "🔗 Preview URL: https://$PREVIEW_ENV.ftn.workers.dev"
    echo "📋 Environment: $PREVIEW_ENV"
    echo "🌿 Branch: $BRANCH_NAME"
'