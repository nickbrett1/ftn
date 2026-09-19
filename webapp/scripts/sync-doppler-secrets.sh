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
    rm -f doppler_secrets_common.json doppler_secrets_project.json doppler_secrets.json doppler_secrets_filtered.json doppler_secrets_batches.json doppler_secrets_batch_temp.json desired_secret_keys.txt deployed_secret_keys.txt superseded_secret_keys.txt
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

# Drop the keys this Worker does not read. The merged set is the whole shared
# `common` bus plus this project's config; most of the bus belongs to the
# container agents and to CI, and pushing it wholesale crossed Cloudflare's
# Workers Free limit of 64 variables per Worker (secrets + text). That failure
# is reported by the API only after the upload is rejected, as
# "This deployment includes 68 variables" (code 10055). What is dropped here is
# also reconciled against the Worker below, and the count is checked before the
# upload, so the message can say what to do about it.
#
# See `worker-secret-exclusions.txt` for what is dropped and why, and
# `tests/sync-doppler-secrets.test.js` for the guard that keeps the list honest.
EXCLUSIONS_FILE="$SCRIPT_DIR/worker-secret-exclusions.txt"
if [ -f "$EXCLUSIONS_FILE" ]; then
    jq --rawfile exclusions "$EXCLUSIONS_FILE" '
        ($exclusions
            | split("\n")
            | map(sub("\\s*#.*$"; "") | gsub("\\s"; ""))
            | map(select(length > 0))) as $dropped
        | with_entries(select(.key as $key | ($dropped | index($key)) == null))
    ' doppler_secrets.json > doppler_secrets_filtered.json || {
        echo "❌ Error: Failed to apply $EXCLUSIONS_FILE."
        exit 1
    }
    mv doppler_secrets_filtered.json doppler_secrets.json
fi

# Build wrangler environment arguments
WRANGLER_ARGS=""
ENV_DISPLAY_NAME="primary Worker"
if [ -n "$CLOUDFLARE_ENV" ] && [ "$CLOUDFLARE_ENV" != "default" ]; then
    WRANGLER_ARGS="--env $CLOUDFLARE_ENV"
    ENV_DISPLAY_NAME="environment: $CLOUDFLARE_ENV"
fi

# Removing a key from the set above stops it being sent, but `versions secret
# bulk` only ever adds or updates: a key that has been synced once stays on the
# Worker until it is deleted explicitly. So the deployed secrets are reconciled
# against the set that should be there, and the difference is taken off. (When
# this was written the Worker carried 68 — seven of them not on the bus at all
# any more, which is exactly the drift the count check below is about.)
#
# This is housekeeping, so none of it fails the deploy: if the list cannot be
# read, or a removal fails, it warns and carries on. The count check still
# guards the total.
if jq -r 'keys[]' doppler_secrets.json | sort > desired_secret_keys.txt \
    && npx wrangler versions secret list $WRANGLER_ARGS 2>/dev/null \
        | sed -n 's/^[[:space:]]*Secret Name:[[:space:]]*//p' | sort -u > deployed_secret_keys.txt \
    && [ -s deployed_secret_keys.txt ]; then
    comm -23 deployed_secret_keys.txt desired_secret_keys.txt > superseded_secret_keys.txt
    if [ -s superseded_secret_keys.txt ]; then
        REMOVED=0
        while read -r key; do
            if npx wrangler versions secret delete "$key" $WRANGLER_ARGS >/dev/null 2>&1; then
                REMOVED=$((REMOVED + 1))
            else
                echo "⚠️ Warning: Could not remove superseded secret: $key"
            fi
        done < superseded_secret_keys.txt
        echo "🗑️  Removed $REMOVED superseded secret(s) from the Worker."
    else
        echo "✅ No superseded secrets deployed."
    fi
else
    echo "⚠️ Warning: Could not list the deployed secrets, so superseded ones are left in place."
fi

# Workers Free allows 64 variables per Worker, secrets and text together. The
# generated wrangler config declares no `vars`, so the whole budget is available
# for secrets and that is the default here; both numbers are overridable for the
# day either changes. Counting here means an overflow is a readable message
# rather than the API's code 10055, which arrives after four retries.
WORKER_VARIABLE_LIMIT="${WORKER_VARIABLE_LIMIT:-64}"
WORKER_TEXT_VARIABLES="${WORKER_TEXT_VARIABLES:-0}"
SECRETS_TO_SYNC="$(jq 'length' doppler_secrets.json)"
if [ "$SECRETS_TO_SYNC" -gt "$((WORKER_VARIABLE_LIMIT - WORKER_TEXT_VARIABLES))" ]; then
    echo "❌ Error: $SECRETS_TO_SYNC secrets plus $WORKER_TEXT_VARIABLES text variables exceeds the Workers limit of $WORKER_VARIABLE_LIMIT variables per Worker."
    echo "   Either add keys this Worker does not read to $EXCLUSIONS_FILE, or set WORKER_VARIABLE_LIMIT/WORKER_TEXT_VARIABLES to match the plan and the Worker."
    exit 1
fi
echo "🔄 Syncing $SECRETS_TO_SYNC secrets (Worker budget $WORKER_VARIABLE_LIMIT variables, $WORKER_TEXT_VARIABLES as text)..."

# Split into batches of 20 (Wrangler bulk upload limit)
jq -c 'to_entries | _nwise(20) | from_entries' doppler_secrets.json > doppler_secrets_batches.json

echo "🚀 Syncing secrets to Cloudflare ($ENV_DISPLAY_NAME)..."
SUCCESS=true
while read -r batch; do
    echo "$batch" > doppler_secrets_batch_temp.json
    npx wrangler versions secret bulk doppler_secrets_batch_temp.json $WRANGLER_ARGS || SUCCESS=false
done < doppler_secrets_batches.json

if [ "$SUCCESS" = true ]; then
    echo "✅ Secrets successfully synced to Cloudflare ($ENV_DISPLAY_NAME)"
else
    echo "❌ Error: Failed to sync secrets to Cloudflare ($ENV_DISPLAY_NAME)"
    exit 1
fi
