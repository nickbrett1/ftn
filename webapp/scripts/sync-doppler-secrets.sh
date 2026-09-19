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
    rm -f doppler_secrets_common.json doppler_secrets_project.json doppler_secrets.json doppler_secrets_batches.json doppler_secrets_batch_temp.json doppler_secrets_prune.txt
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

# `common` is a shared project: it is the config store for every container and
# app in the workspace, not just this Worker. Blindly pushing all of it is what
# put unrelated secrets on the Worker (the goose/LiteLLM/A2A entries added to
# common on 2026-09-18 pushed production from 64 to 68 variables and broke the
# deploy). So take every secret from the app-owned `webapp` project — that part
# is unambiguous — and from `common` take only the names this Worker actually
# reads. CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are the only two common
# secrets the app consumes at runtime (the R2 *bindings* are Worker config, not
# these S3 keys); the rest are CI-only (SONAR_TOKEN, GHCR_UPDATE_TOKEN, ...) or
# belong to other consumers (LITELLM_*, GOOSE_*, A2A_GOOSE_*).
#
# Override with COMMON_SECRETS_ALLOW="NAME_A NAME_B" if a new common secret is
# genuinely read at runtime, otherwise it will be dropped from the Worker.
COMMON_SECRETS_ALLOW="${COMMON_SECRETS_ALLOW:-CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN}"

# Merge common and project secrets (project overrides common), then keep every
# project secret plus only the allow-listed common secrets.
jq -s --arg allow "$COMMON_SECRETS_ALLOW" '
    (.[0] * .[1]) as $merged
    | ($allow | split(" ") | map(select(length > 0))) as $allowlist
    | ((.[1] | keys) + [.[0] | keys[] as $k | select($allowlist | index($k)) | $k]) as $keep
    | $merged | with_entries(select(.key as $k | ($keep | index($k)) != null))
' doppler_secrets_common.json doppler_secrets_project.json > doppler_secrets.json

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
    echo "$batch" > doppler_secrets_batch_temp.json
    npx wrangler versions secret bulk doppler_secrets_batch_temp.json $WRANGLER_ARGS || SUCCESS=false
done < doppler_secrets_batches.json

if [ "$SUCCESS" != true ]; then
    echo "❌ Error: Failed to sync secrets to Cloudflare ($ENV_DISPLAY_NAME)"
    exit 1
fi

echo "✅ Secrets successfully synced to Cloudflare ($ENV_DISPLAY_NAME)"

# Reconcile, don't just add. `wrangler versions secret bulk` only ever adds or
# updates: a secret later removed from Doppler stays on the Worker forever and
# keeps counting toward the Workers Free limit of 64 variables per Worker
# (secrets + text) — the limit that failed the production deploy at "This
# deployment includes 68 variables, which exceeds the Workers Free limit of 64"
# (build 128). Removing a name from Doppler is therefore not enough on its own.
#
# So prune whatever is on the Worker but not in the set we just pushed. The
# prune set is *derived* from the Worker's own listing rather than hand
# maintained, so it stays correct as Doppler changes — a secret dropped from
# Doppler disappears from the Worker on the next deploy, and nothing has to be
# remembered here. This is idempotent: once the Worker matches Doppler there is
# nothing left to delete.
#
# KEEP_SECRETS is the escape hatch for variables the app reads at runtime but
# that intentionally are not in Doppler. Today that is the production GitHub
# OAuth pair: webapp/prd has no GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET, they are
# set on the Worker directly, and src/lib/server/auth.js reads them. Dereferencing
# those would break GitHub sign-in, so they must survive the prune.
KEEP_SECRETS="${KEEP_SECRETS:-GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET}"

echo "🧹 Reconciling: pruning secrets the Worker has but Doppler no longer provides..."

# `wrangler secret list` fails when the Worker does not exist yet (first deploy);
# that is not an error, there is simply nothing to prune.
WORKER_SECRETS="$(npx wrangler secret list $WRANGLER_ARGS --format json 2>/dev/null || echo '[]')"

jq -r \
    --argjson desired "$(jq -c 'keys' doppler_secrets.json)" \
    --arg keep "$KEEP_SECRETS" \
    '($keep | split(" ") | map(select(length > 0))) as $keep
     | .[]
     | .name as $n
     | select(($desired | index($n)) == null)
     | select(($keep | index($n)) == null)
     | $n' <<< "$WORKER_SECRETS" > doppler_secrets_prune.txt 2>/dev/null || true

while read -r name; do
    [ -z "$name" ] && continue
    # </dev/null so wrangler cannot swallow the loop's stdin and skip names.
    if npx wrangler secret delete "$name" $WRANGLER_ARGS >/dev/null 2>&1 </dev/null; then
        echo "🗑️  Pruned: $name"
    else
        echo "⚠️  Could not prune: $name"
    fi
done < doppler_secrets_prune.txt
