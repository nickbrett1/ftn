#!/bin/bash
# Sync Doppler secrets to Cloudflare
set -e

# Determine the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The webapp directory is one level up from the scripts directory
WEBAPP_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the webapp directory so that relative paths work correctly
cd "$WEBAPP_DIR"

# Defaults
DOPPLER_PROJECT="webapp"
DOPPLER_CONFIG="prod"
CLOUDFLARE_ENV=""

# Parse optional arguments to override defaults
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --project) DOPPLER_PROJECT="$2"; shift ;;
        --config) DOPPLER_CONFIG="$2"; shift ;;
        --env) CLOUDFLARE_ENV="$2"; shift ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --project <name>      Doppler project name (default: webapp)"
            echo "  --config <name>       Doppler config name (default: prod)"
            echo "  --env <name>          Cloudflare Wrangler environment (default: primary Worker, use 'default' to omit)"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if Doppler CLI is installed
if ! command -v doppler &> /dev/null; then
    echo "❌ Error: Doppler CLI is not installed or not in PATH"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed or not in PATH"
    exit 1
fi

# Build doppler args. If DOPPLER_TOKEN is set, it might be a service token.
# Service tokens are locked to a specific project/config, so passing --config/--project will result in a warning/error from Doppler CLI.
# So we only pass them if DOPPLER_TOKEN is not a service token (doesn't start with dp.st.)
DOPPLER_ARGS=""
if [ -n "$DOPPLER_TOKEN" ]; then
    DOPPLER_ARGS="$DOPPLER_ARGS --token $DOPPLER_TOKEN"
    if [[ ! "$DOPPLER_TOKEN" =~ ^dp\.st\. ]]; then
        DOPPLER_ARGS="$DOPPLER_ARGS --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG"
    fi
else
    # Fallback to local login check
    if ! doppler whoami &> /dev/null; then
        echo "❌ Error: Not authenticated with Doppler. Please run 'doppler login' or set DOPPLER_TOKEN."
        exit 1
    fi
    DOPPLER_ARGS="$DOPPLER_ARGS --project $DOPPLER_PROJECT --config $DOPPLER_CONFIG"
fi

echo "🔄 Fetching secrets from Doppler ($DOPPLER_PROJECT/$DOPPLER_CONFIG)..."

# Fetch secrets, compute values, and format for Cloudflare
cleanup() {
    rm -f doppler_secrets_common.json doppler_secrets_project.json doppler_secrets.json doppler_secrets_batches.json
}
trap cleanup EXIT

# Fetch common secrets first
echo "{}" > doppler_secrets_common.json
if [[ -z "$DOPPLER_TOKEN" || ! "$DOPPLER_TOKEN" =~ ^dp\.st\. ]]; then
    echo "🔄 Fetching common secrets from Doppler (common/$DOPPLER_CONFIG)..."
    if ! doppler secrets --json --project common --config "$DOPPLER_CONFIG" 2>/dev/null | jq -c 'with_entries(.value = .value.computed)' > doppler_secrets_common.json; then
        echo "⚠️ Warning: Could not fetch common secrets (they may not exist or access is denied)."
        echo "{}" > doppler_secrets_common.json
    fi
else
    echo "⚠️ Warning: Using a service token. Skipping common secrets fetch."
fi

echo "🔄 Fetching project secrets from Doppler ($DOPPLER_PROJECT/$DOPPLER_CONFIG)..."
if ! doppler secrets --json $DOPPLER_ARGS | jq -c 'with_entries(.value = .value.computed)' > doppler_secrets_project.json; then
    echo "❌ Error: Failed to fetch secrets from Doppler."
    exit 1
fi

# Merge common and project secrets, project overrides common
jq -s '.[0] * .[1]' doppler_secrets_common.json doppler_secrets_project.json > doppler_secrets.json

if [ ! -s doppler_secrets.json ] || [ "$(cat doppler_secrets.json)" = "{}" ]; then
    echo "⚠️ Warning: No secrets found to sync."
    exit 0
fi

# Split into batches of 20 (Wrangler bulk upload limit)
jq -c 'to_entries | _nwise(20) | from_entries' doppler_secrets.json > doppler_secrets_batches.json

# Build wrangler environment arguments
WRANGLER_ARGS=""
ENV_DISPLAY_NAME="primary Worker"
if [ -n "$CLOUDFLARE_ENV" ] && [ "$CLOUDFLARE_ENV" != "default" ]; then
    WRANGLER_ARGS="--env $CLOUDFLARE_ENV"
    ENV_DISPLAY_NAME="environment: $CLOUDFLARE_ENV"
fi

echo "🚀 Syncing secrets to Cloudflare ($ENV_DISPLAY_NAME)..."
SUCCESS=true
while read -r batch; do
    echo "$batch" | npx wrangler secret bulk $WRANGLER_ARGS || SUCCESS=false
done < doppler_secrets_batches.json

if [ "$SUCCESS" = true ]; then
    echo "✅ Secrets successfully synced to Cloudflare ($ENV_DISPLAY_NAME)"
else
    echo "❌ Error: Failed to sync secrets to Cloudflare ($ENV_DISPLAY_NAME)"
    exit 1
fi
