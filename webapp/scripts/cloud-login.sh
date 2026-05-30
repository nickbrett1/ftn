#!/bin/bash
set -e

# Determine the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The webapp directory is one level up from the scripts directory
WEBAPP_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the webapp directory so that relative paths work correctly
cd "$WEBAPP_DIR"

# Doppler login/setup
if command -v doppler &> /dev/null; then
  if doppler whoami &> /dev/null; then
    echo "Already logged in to Doppler."
  else
    echo "INFO: Logging into Doppler..."
    doppler login --no-check-version --no-timeout --yes
    echo "INFO: Setting up Doppler..."
    doppler setup --no-interactive --project webapp --config dev
  fi
else
  echo "Doppler CLI not found. Skipping Doppler login."
fi

echo
# Cloudflare Wrangler login
# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Wrangler CLI not found. Installing globally with npm..."
  npm install -g wrangler
fi

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\\.0\\.0\\.0/localhost/g'" /dev/null

echo
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project webapp --config dev -- ./scripts/setup-wrangler-config.sh dev

echo
echo "Configuring Gemini CLI..."

doppler run --project webapp --config dev -- gemini mcp add -t http -s project svelte https://mcp.svelte.dev/mcp

echo "INFO: Installing Nanobanana MCP..."
chmod +x ./scripts/install-nanobanana.sh
./scripts/install-nanobanana.sh

echo "Cloud login script finished."
