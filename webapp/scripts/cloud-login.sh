#!/bin/bash
set -e

# Determine the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The webapp directory is one level up from the scripts directory
WEBAPP_DIR="$(dirname "$SCRIPT_DIR")"

# Change to the webapp directory so that relative paths work correctly
cd "$WEBAPP_DIR"

# Tailscale login
if command -v tailscale &> /dev/null; then
  if ! pgrep -x tailscaled > /dev/null; then
    echo "INFO: Starting Tailscale daemon..."
    sudo tailscaled --state=/var/lib/tailscale/tailscaled.state > /dev/null 2>&1 &
    sleep 2
  fi
  if ! sudo tailscale status &> /dev/null; then
    echo "INFO: Logging into Tailscale..."
    sudo tailscale up --hostname=ftn
  else
    echo "✅ Already logged in to Tailscale."
  fi
fi

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

# 1. Check if already logged in via Doppler API Token (Highly recommended for multi-container)
if doppler run --project webapp --config dev -- env | grep -q "CLOUDFLARE_API_TOKEN"; then
  echo "✅ Found CLOUDFLARE_API_TOKEN in Doppler. Using token for authentication."
  # Verify connectivity
  if ! doppler run --project webapp --config dev -- npx wrangler whoami 2>&1 | grep -q "You are not authenticated"; then
    echo "✅ Successfully authenticated via Doppler token. Skipping interactive login."
    exit 0
  else
    echo "⚠️ CLOUDFLARE_API_TOKEN found in Doppler but 'wrangler whoami' failed. Proceeding to interactive login..."
  fi
fi

# 2. Check if already logged in via OAuth session
if ! npx wrangler whoami 2>&1 | grep -q "You are not authenticated"; then
  echo "✅ Already logged in via OAuth session."
  exit 0
fi

WRANGLER_CALLBACK_PORT=${WRANGLER_CALLBACK_PORT:-8976}

# 3. Check for port conflicts inside the container
if ss -tuln | grep -q ":8976 "; then
  CONFLICT_PID=$(lsof -t -i:8976)
  echo "❌ Error: Port 8976 is already in use inside this container (PID: $CONFLICT_PID)."
  echo "   If this is a stale 'socat' process, you can kill it with: kill $CONFLICT_PID"
  exit 1
fi

# If we are using a non-standard port, we need to bridge the gap from 8976
if [ "$WRANGLER_CALLBACK_PORT" != "8976" ]; then
  echo "INFO: Using non-standard port $WRANGLER_CALLBACK_PORT. Bridging from 8976..."
  socat TCP-LISTEN:8976,fork,reuseaddr TCP:localhost:$WRANGLER_CALLBACK_PORT &
  SOCAT_PID=$!
  trap "kill $SOCAT_PID 2>/dev/null || true" EXIT
fi

echo "📢 IMPORTANT: Cloudflare OAuth ALWAYS redirects to localhost:8976 on your host machine."
echo "   If you have multiple containers, ensure port 8976 is forwarded to THIS container in VS Code."
echo "   (Check the 'Ports' tab in VS Code and ensure 8976 points to this project)"
echo

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=$WRANGLER_CALLBACK_PORT | stdbuf -oL sed 's/0\\.0\\.0\\.0/localhost/g'" /dev/null

echo
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project webapp --config dev -- ./scripts/setup-wrangler-config.sh dev

echo


echo "INFO: Installing Nanobanana MCP..."
chmod +x ./scripts/install-nanobanana.sh
./scripts/install-nanobanana.sh

echo "Cloud login script finished."
