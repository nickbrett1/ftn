#!/bin/bash
set -e

# Preview Deployment Script for Non-Main Branches
# This script deploys the app to a preview environment with a unique URL
# AND to a fixed "latest" preview URL for easy access
#
# IMPROVED ERROR HANDLING:
# - Detects build failures and exits with error code 1
# - Captures and displays Wrangler output for debugging
# - Provides clear error messages and actionable advice
# - Prevents misleading "success" messages when deployment actually fails
# - Ensures CI/CD pipelines fail appropriately when there are build errors
    # Deploy to preview environment
    echo "🚀 Deploying to preview environment"
    
    # Capture Wrangler output and exit code
    echo "⏳ Running Wrangler deployment..."
    WRANGLER_OUTPUT=$(npx wrangler deploy --config wrangler.jsonc --env preview 2>&1)
    WRANGLER_EXIT_CODE=$?
    
    echo "📋 Wrangler deployment completed with exit code: $WRANGLER_EXIT_CODE"
    
    # Check for build errors in the output (most critical)
    if echo "$WRANGLER_OUTPUT" | grep -q "Build failed with [0-9]* errors"; then
        echo ""
        echo "❌ BUILD FAILED WITH ERRORS!"
        echo "=================================="
        echo "📋 Environment: preview"
        echo "🌿 Branch: $BRANCH_NAME"
        echo ""
        echo "🔍 Build errors detected:"
        echo "$WRANGLER_OUTPUT" | grep -A 20 "Build failed with [0-9]* errors"
        echo ""
        echo "💡 ACTION REQUIRED: Fix the build errors before deploying again."
        echo "   Common causes:"
        echo "   - Missing dependencies in package.json"
        echo "   - Import/export errors in Svelte components"
        echo "   - Configuration issues in svelte.config.js"
        echo "   - Environment variable issues"
        echo ""
        echo "🚫 Deployment aborted due to build failures."
        exit 1
    fi
    
    # Check for other critical Wrangler errors
    if echo "$WRANGLER_OUTPUT" | grep -q "ERROR\|Error\|✘"; then
        echo ""
        echo "❌ WRANGLER DEPLOYMENT FAILED!"
        echo "=================================="
        echo "📋 Environment: preview"
        echo "🌿 Branch: $BRANCH_NAME"
        echo ""
        echo "🔍 Error details:"
        echo "$WRANGLER_OUTPUT" | grep -A 10 -B 5 "ERROR\|Error\|✘"
        echo ""
        echo "💡 Check the error messages above for details."
        exit 1
    fi
    
    # Check for non-zero exit code
    if [ $WRANGLER_EXIT_CODE -ne 0 ]; then
        echo ""
        echo "❌ WRANGLER EXITED WITH ERROR CODE $WRANGLER_EXIT_CODE!"
        echo "======================================================"
        echo "📋 Environment: preview"
        echo "🌿 Branch: $BRANCH_NAME"
        echo ""
        echo "🔍 Full Wrangler output:"
        echo "$WRANGLER_OUTPUT"
        echo ""
        echo "💡 Check the output above for any error messages."
        exit 1
    fi
    
    # Check for success indicators
    if echo "$WRANGLER_OUTPUT" | grep -q "Deployed to\|Successfully deployed"; then
        echo ""
        echo "🎉 PREVIEW DEPLOYMENT SUCCESSFUL!"
        echo "=================================="
        echo "📋 Environment: preview"
        echo "🌿 Branch: $BRANCH_NAME"
        echo ""
        echo "🔗 Deployment URL: $(echo "$WRANGLER_OUTPUT" | grep "Deployed to\|Successfully deployed" | tail -1)"
        echo ""
        echo "💡 Tip: Check /deploys for all active deployment URLs!"
        echo "💡 Tip: Your mobile navigation fixes are now live for testing!"
    else
        echo ""
        echo "❌ DEPLOYMENT STATUS UNCLEAR!"
        echo "=============================="
        echo "📋 Environment: preview"
        echo "🌿 Branch: $BRANCH_NAME"
        echo ""
        echo "🔍 Wrangler output (no success indicator found):"
        echo "$WRANGLER_OUTPUT"
        echo ""
        echo "💡 The deployment may have failed. Check the output above for any error messages."
        echo "   If you see 'Build failed with X errors', fix those issues first."
        exit 1
    fi