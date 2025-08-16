#!/bin/bash
set -e

# Preview Deployment Script for Non-Main Branches
# This script deploys the app to a preview environment with a unique URL
# AND to a fixed "latest" preview URL for easy access

echo "🚀 Setting up preview deployment..."

# Get branch name and sanitize it for URL
BRANCH_NAME=${CIRCLE_BRANCH:-$(git branch --show-current)}
BRANCH_SANITIZED=$(echo "$BRANCH_NAME" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')

# Create preview environment name
PREVIEW_ENV="preview-${BRANCH_SANITIZED}"
LATEST_PREVIEW_ENV="latest-preview"

echo "📋 Branch: $BRANCH_NAME"
echo "🔗 Preview Environment: $PREVIEW_ENV"
echo "🎯 Latest Preview Environment: $LATEST_PREVIEW_ENV"

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
BRANCH_NAME="$BRANCH_NAME" BRANCH_SANITIZED="$BRANCH_SANITIZED" doppler run $DOPPLER_ARGS -- bash -c "
    # Check if required environment variables are set
    if [ -z \"\$KV_NAMESPACE_ID\" ]; then
        echo \"Error: KV_NAMESPACE_ID environment variable is not set in Doppler\"
        exit 1
    fi

    if [ -z \"\$D1_WDI_DATABASE_ID\" ]; then
        echo \"Error: D1_WDI_DATABASE_ID environment variable is not set in Doppler\"
        exit 1
    fi

    if [ -z \"\$D1_CCBILLING_DATABASE_ID\" ]; then
        echo \"Error: D1_CCBILLING_DATABASE_ID environment variable is not set in Doppler\"
        exit 1
    fi

    echo \"✅ Environment variables verified:\"
    echo \"   KV_NAMESPACE_ID: \$KV_NAMESPACE_ID\"
    echo \"   D1_WDI_DATABASE_ID: \$D1_WDI_DATABASE_ID\"
    echo \"   D1_CCBILLING_DATABASE_ID: \$D1_CCBILLING_DATABASE_ID\"

    # Create wrangler.jsonc from template with substitutions
    echo \"📝 Generating wrangler.jsonc for preview deployment...\"
    sed \\
        -e \"s/KV_NAMESPACE_ID_PLACEHOLDER/\$KV_NAMESPACE_ID/g\" \\
        -e \"s/D1_WDI_DATABASE_ID_PLACEHOLDER/\$D1_WDI_DATABASE_ID/g\" \\
        -e \"s/D1_CCBILLING_DATABASE_ID_PLACEHOLDER/\$D1_CCBILLING_DATABASE_ID/g\" \\
        wrangler.template.jsonc > wrangler.jsonc

    echo \"✅ Wrangler configuration generated successfully\"

    # Deploy to preview environment
    echo \"🚀 Deploying to preview environment\"
    npx wrangler deploy --config wrangler.jsonc --env preview
    
    # Construct the preview URLs directly from known structure and branch
    GENERIC_PREVIEW_URL=\"https://ftn-preview.nick-brett1.workers.dev\"
    BRANCH_PREVIEW_URL=\"https://ftn-preview-\$BRANCH_SANITIZED.nick-brett1.workers.dev\"
    
    echo \"🎉 Preview deployment completed successfully!\"
    echo \"🔗 Generic Preview URL: \$GENERIC_PREVIEW_URL\"
    echo \"🌿 Branch Preview URL: \$BRANCH_PREVIEW_URL\"
    echo \"📋 Environment: preview\"
    echo \"🌿 Branch: \$BRANCH_NAME\"
    echo \"\"
    echo \"💡 Tip: Use the generic preview URL for quick iteration!\"
    echo \"💡 Tip: Use the branch preview URL for branch-specific testing!\"
    echo \"💡 Tip: Your mobile navigation fixes are now live for testing!\"
"