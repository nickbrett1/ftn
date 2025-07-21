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
    doppler setup --no-interactive
  fi
else
  echo "Doppler CLI not found. Skipping Doppler login."
fi

echo
# Cloudflare Wrangler login
if command -v wrangler &> /dev/null; then
  echo "INFO: Starting Cloudflare Wrangler login (interactive)..."
  wrangler login
else
  echo "Wrangler CLI not found. Skipping Cloudflare login."
fi

echo "Cloud login script finished." 