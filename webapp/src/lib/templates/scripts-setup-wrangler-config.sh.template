#!/bin/bash
set -e

echo "Generating wrangler.jsonc from template..."
if command -v envsubst >/dev/null 2>&1; then
    envsubst < wrangler.template.jsonc > wrangler.jsonc
else
    echo "Warning: envsubst not found. Copying template as is."
    cp wrangler.template.jsonc wrangler.jsonc
fi
echo "wrangler.jsonc generated."
