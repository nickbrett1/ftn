#!/bin/bash

# Get Preview URL Script
# This script shows the preview URL for the current branch

echo "🔍 Finding preview URL for current branch..."

# Get current branch name
BRANCH_NAME=$(git branch --show-current)

if [ -z "$BRANCH_NAME" ]; then
    echo "❌ Error: Could not determine current branch"
    exit 1
fi

# Check if this is the main branch
if [ "$BRANCH_NAME" = "main" ]; then
    echo "⚠️  Warning: You're on the main branch"
    echo "   Main branch deploys to production, not preview"
    echo "   Switch to a feature branch to get a preview URL"
    exit 1
fi

# Sanitize branch name for URL
BRANCH_SANITIZED=$(echo "$BRANCH_NAME" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')
PREVIEW_URL="https://preview-${BRANCH_SANITIZED}.ftn.workers.dev"

echo ""
echo "🌿 Branch: $BRANCH_NAME"
echo "🔗 Unique Preview URL: $PREVIEW_URL"
echo "🎯 Latest Preview URL: https://latest-preview.ftn.workers.dev"
echo ""
echo "📋 To deploy to preview:"
echo "   git push origin $BRANCH_NAME"
echo ""
echo "📱 Preview will be available after CircleCI completes deployment"
echo "⏱️  Usually takes 3-5 minutes after push"
echo ""
echo "💡 Tips:"
echo "   - Use the latest preview URL for quick iteration"
echo "   - Use the unique preview URL for sharing specific versions"
echo "   - Run 'npm run deploy-preview' locally for immediate deployment"
echo "   - Run 'npm run cleanup-previews' to manage environments"