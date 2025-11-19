#!/bin/bash
set -e

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

echo "Cloud login script finished."
