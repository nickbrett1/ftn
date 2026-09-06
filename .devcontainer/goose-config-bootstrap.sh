#!/bin/bash
# ftn devcontainer goose config bootstrap.
#
# Migration (memo goose-mcp-groups-migration §C / handoff-goose-devcontainer-genproj):
# MCPHub is now the goose data plane on the trusted tailnet. This devcontainer
# consumes the MCPHub `dev` (and `dev-ui`) groups as AUTH-OFF streamable_http
# extensions (no headers / keys / doppler wrapper) instead of wiring ~10
# individual per-capability MCP servers (svelte, vikunja, memos, github,
# circleci, sonarqube, fintechnick, doppler…). Those hub-backed tools now
# arrive via the `dev` group. Only genuinely machine-local tools are kept as
# local extensions (chrome-devtools, a stdio server).
#
# No `provider:` block is written here: goose resolves its provider from the
# Doppler environment at runtime (GOOSE_ALIAS runs goose under `doppler run`).
#
# The config is (re)written only when it is absent or is a legacy pre-migration
# config (i.e. it does not already declare `mcphub-dev`). Already-migrated
# configs are left untouched.
set -euo pipefail

GOOSE_CONFIG_DIR="$HOME/.config/goose"
GOOSE_CONFIG="$GOOSE_CONFIG_DIR/config.yaml"

mkdir -p "$GOOSE_CONFIG_DIR"

if [ -f "$GOOSE_CONFIG" ] && grep -q '^  mcphub-dev:' "$GOOSE_CONFIG"; then
    echo "INFO: goose config already on MCPHub groups; leaving $GOOSE_CONFIG untouched."
else
    if [ -f "$GOOSE_CONFIG" ]; then
        echo "INFO: Replacing legacy goose config (pre-MCPHub per-tool entries) at $GOOSE_CONFIG"
    else
        echo "INFO: Writing project goose config at $GOOSE_CONFIG (extensions only; provider resolves from Doppler env)"
    fi
    cat > "$GOOSE_CONFIG" <<'GOOSECFGEOF'
# ftn goose config — MCPHub groups (memo goose-mcp-groups-migration §C)
# Extensions only. Provider resolves from the Doppler env at runtime.
extensions:
  mcphub-dev:
    type: streamable_http
    name: mcphub-dev
    enabled: true
    uri: http://nas:8781/mcp/dev
    timeout: 300
  mcphub-dev-ui:
    type: streamable_http
    name: mcphub-dev-ui
    enabled: true
    uri: http://nas:8781/mcp/dev-ui
    timeout: 300
  chrome-devtools:
    type: stdio
    name: chrome-devtools
    enabled: true
    cmd: npx
    args:
    - -y
    - chrome-devtools-mcp
    timeout: 300
GOOSECFGEOF
    echo "INFO: Wrote MCPHub groups config (mcphub-dev, mcphub-dev-ui) + local chrome-devtools."
fi

# ---------------------------------------------------------------------------
# Goose recipes (nickbrett1/goose-recipes) - spec-first development process.
# Recipes are cloned into the global recipes dir (~/.config/goose/recipes/) so
# goose discovers them automatically (no env var needed at runtime).
# ---------------------------------------------------------------------------
RECIPES_DIR="$GOOSE_CONFIG_DIR/recipes"
echo "INFO: Ensuring goose recipes are available at $RECIPES_DIR ..."
if [ -d "$RECIPES_DIR/.git" ]; then
    (cd "$RECIPES_DIR" && git pull --ff-only --quiet) \
        || echo "WARN: Could not update goose-recipes (offline or conflict); keeping existing copy."
else
    mkdir -p "$GOOSE_CONFIG_DIR"
    git clone --quiet https://github.com/nickbrett1/goose-recipes.git "$RECIPES_DIR" \
        || echo "WARN: Could not clone goose-recipes; recipes will be unavailable."
fi

# Also record the repo for environments where `gh` CLI is available (goose
# discovers recipes from this repo directly; requires gh installed + authed).
if ! grep -q '^GOOSE_RECIPE_GITHUB_REPO:' "$GOOSE_CONFIG"; then
    printf '\n# Recipe Configuration\nGOOSE_RECIPE_GITHUB_REPO: "nickbrett1/goose-recipes"\n' >> "$GOOSE_CONFIG"
    echo "INFO: Added GOOSE_RECIPE_GITHUB_REPO to goose config."
fi

echo "INFO: goose config bootstrap complete."
