#!/bin/bash
set -e

# Determine the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The project root directory is one level up from the scripts directory
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to the project root directory so that relative paths work correctly
cd "$PROJECT_ROOT"
if [ -d "worker" ]; then
    echo "Rust worker detected. Skipping wrangler.jsonc generation."
    exit 0
fi
if command -v envsubst >/dev/null 2>&1; then
    envsubst < wrangler.template.jsonc > wrangler.jsonc
else
    echo "Warning: envsubst not found. Copying template as is."
    cp wrangler.template.jsonc wrangler.jsonc
fi
echo "wrangler.jsonc generated."
