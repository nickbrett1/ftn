#!/bin/bash
# Idempotently ensures the goose config (~/.config/goose/config.yaml) contains
# this project's MCP server extensions (including Vikunja MCP).
#
# It only ADDS missing entries - any existing configuration (provider settings,
# built-in extensions, manual edits) is preserved untouched.
set -euo pipefail

GOOSE_CONFIG_DIR="$HOME/.config/goose"
GOOSE_CONFIG="$GOOSE_CONFIG_DIR/config.yaml"

mkdir -p "$GOOSE_CONFIG_DIR"

if [ ! -f "$GOOSE_CONFIG" ]; then
    echo "INFO: Creating minimal goose config at $GOOSE_CONFIG"
    printf 'extensions:\n' > "$GOOSE_CONFIG"
fi

GOOSE_CONFIG="$GOOSE_CONFIG" node << 'NODE'
const fs = require('fs');
const path = process.env.GOOSE_CONFIG;

// MCP server entries to ensure are present under the top-level `extensions:` key.
// Key = extension name, value = YAML body (4-space indented).
const MCP_SERVERS = {
  svelte: `    type: streamable_http
    name: svelte
    enabled: true
    uri: https://mcp.svelte.dev/mcp
    timeout: 300`,
  vikunja: `    type: streamable_http
    name: vikunja
    enabled: true
    uri: http://nas:8086/
    timeout: 300`,
  memos: `    type: streamable_http
    name: memos
    enabled: true
    uri: http://nas:5230/mcp
    env_keys:
    - MEMOS_TOKEN
    envs: {}
    headers:
      Authorization: Bearer \${MEMOS_TOKEN}
    timeout: 300`,
  'chrome-devtools': `    type: stdio
    name: chrome-devtools
    enabled: true
    cmd: npx
    args:
    - -y
    - chrome-devtools-mcp
    timeout: 300`,
  fintechnick: `    type: stdio
    name: fintechnick
    enabled: true
    cmd: sh
    args:
    - -c
    - 'npx -y mcp-remote https://www.fintechnick.com/api/mcp --header "Authorization: Bearer $FINTECHNICK_MCP"'
    timeout: 300`,
  github: `    type: stdio
    name: github
    enabled: true
    cmd: doppler
    args:
    - run
    - --
    - npx
    - -y
    - '@modelcontextprotocol/server-github'
    timeout: 300`,
  doppler: `    type: stdio
    name: doppler
    enabled: true
    cmd: sh
    args:
    - -c
    - DOPPLER_TOKEN=$(doppler configure get token --plain) npx -y @dopplerhq/mcp-server
    timeout: 300`,
  sonarqube: `    type: stdio
    name: sonarqube
    enabled: true
    cmd: doppler
    args:
    - run
    - --
    - npx
    - -y
    - sonarqube-mcp-server
    timeout: 300`,
  circleci: `    type: stdio
    name: circleci
    enabled: true
    cmd: doppler
    args:
    - run
    - --
    - npx
    - -y
    - '@circleci/mcp-server-circleci'
    timeout: 300`
};

let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

// Locate the top-level `extensions:` block (line with no leading whitespace).
let start = lines.findIndex((l) => /^extensions:/.test(l));
if (start === -1) {
  lines.push('extensions:');
  start = lines.length - 1;
}

// End of the block = first line after `start` that is non-blank and starts at column 0.
const blockEnd = () => {
  let e = start + 1;
  while (e < lines.length && (lines[e].trim() === '' || lines[e].startsWith(' '))) e++;
  return e;
};

// ---------------------------------------------------------------------------
// Migration: upgrade stale stdio (mcp-remote) entries for servers that now use
// streamable_http directly (memos, vikunja). Older versions of this bootstrap
// emitted `type: stdio` + `npx mcp-remote http://nas:PORT/...`; mcp-remote
// rejects non-HTTPS, non-localhost URLs unless `--allow-http` is passed, which
// makes the extension fail to start ("process quit before initialization").
// Existing stale entries are upgraded in place; fresh configs are born correct.
// ---------------------------------------------------------------------------
const UPGRADABLE = ['memos', 'vikunja'];
const migrated = [];
for (const key of UPGRADABLE) {
  let end = blockEnd();
  const keyRe = new RegExp(`^  ${key}:$`);
  for (let i = start + 1; i < end; i++) {
    if (!keyRe.test(lines[i])) continue;
    let j = i + 1;
    while (j < end && !/^  [A-Za-z0-9_-]+:/.test(lines[j])) j++;
    const bodyLines = lines.slice(i + 1, j);
    const body = bodyLines.join('\n');
    const needsReplacement =
      /mcp-remote/.test(body) ||
      /type: stdio/.test(body) ||
      (key === 'memos' && !/Authorization/.test(body));
    if (needsReplacement) {
      const replacement = [`  ${key}:`, ...MCP_SERVERS[key].split('\n')];
      // Preserve the blank-line separator after the entry, if one existed.
      if (bodyLines[bodyLines.length - 1] === '') replacement.push('');
      lines.splice(i, j - i, ...replacement);
      migrated.push(key);
    }
    break;
  }
}
let end = blockEnd();

// Collect existing extension keys inside the block (2-space indented `key:`).
const existing = new Set();
for (let i = start + 1; i < end; i++) {
  const m = lines[i].match(/^  ([A-Za-z0-9_-]+):/);
  if (m) existing.add(m[1]);
}

const missing = Object.keys(MCP_SERVERS).filter((k) => !existing.has(k));
let changed = migrated.length > 0;
if (missing.length > 0) {
  const insert = [];
  for (const key of Object.keys(MCP_SERVERS)) {
    if (!existing.has(key)) {
      insert.push(`  ${key}:\n${MCP_SERVERS[key]}`);
    }
  }
  lines.splice(end, 0, ...insert.join('\n\n').split('\n'));
  changed = true;
}
if (!changed) {
  console.log('INFO: goose config already up to date.');
} else {
  // Ensure a single trailing newline
  const out = lines.join('\n').replace(/\n+$/, '\n');
  fs.writeFileSync(path, out);
  if (migrated.length > 0) {
    console.log(`INFO: Migrated stale stdio MCP entries to streamable_http: ${migrated.join(', ')}`);
  }
  if (missing.length > 0) {
    console.log(`INFO: Added missing MCP servers to goose config: ${missing.join(', ')}`);
  }
}
NODE

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
