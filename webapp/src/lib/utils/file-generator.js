// webapp/src/lib/utils/file-generator.js

import devcontainerJavaDockerfile from '../templates/devcontainer-java-dockerfile.template?raw';
import devcontainerJavaJson from '../templates/devcontainer-java-json.template?raw';
import devcontainerNodeDockerfile from '../templates/devcontainer-node-dockerfile.template?raw';
import devcontainerNodeJson from '../templates/devcontainer-node-json.template?raw';
import devcontainerP10kZshFull from '../templates/devcontainer-p10k-zsh-full.template?raw';
import devcontainerP10kZsh from '../templates/devcontainer-p10k-zsh.template?raw';
import devcontainerPostCreateSetupSh from '../templates/devcontainer-post-create-setup-sh.template?raw';
import devcontainerPostStartSetupSh from '../templates/devcontainer-post-start-setup-sh.template?raw';
import devcontainerPythonDockerfile from '../templates/devcontainer-python-dockerfile.template?raw';
import devcontainerPythonJson from '../templates/devcontainer-python-json.template?raw';
import devcontainerRustDockerfile from '../templates/devcontainer-rust-dockerfile.template?raw';
import devcontainerRustJson from '../templates/devcontainer-rust-json.template?raw';
import devcontainerZshrcFull from '../templates/devcontainer-zshrc-full.template?raw';
import devcontainerZshrc from '../templates/devcontainer-zshrc.template?raw';
import devcontainerTmuxConf from '../templates/devcontainer-tmux-conf.template?raw';
import dopplerYaml from '../templates/doppler-yaml.template?raw';
import playwrightConfig from '../templates/playwright-config.template?raw';
import lighthouseCiConfig from '../templates/lighthouse-ci-config.template?raw';
import circleCiConfig from '../templates/circleci-config.template?raw';
import dockerfileTemplate from '../templates/dockerfile.template?raw';
import dockerignoreTemplate from '../templates/dockerignore.template?raw';
import dockerComposeTemplate from '../templates/docker-compose.template?raw';
import deployReadmeTemplate from '../templates/deploy-readme.template?raw';
import homepageServicesTemplate from '../templates/homepage-services.template?raw';
import envExampleTemplate from '../templates/env-example.template?raw';
import sonarProjectProperties from '../templates/.sonarcloud.properties.template?raw';
import mcpConfigJson from '../templates/mcp-config-json.template?raw';
import mcpSseProxyJs from '../templates/mcp-sse-proxy-js.template?raw';
import mcpStreamableHttpProxyJs from '../templates/mcp-streamable-http-proxy-js.template?raw';
import packageJsonTemplate from '../templates/package-json.template?raw';
import wranglerJsonc from '../templates/wrangler.jsonc.template?raw';
import wranglerTemplateJsonc from '../templates/wrangler.template.jsonc.template?raw';
import scriptsCloudLoginSh from '../templates/scripts-cloud-login.sh.template?raw';
import scriptsRunWranglerDevelopmentSh from '../templates/scripts-run-wrangler-dev-sh.template?raw';
import scriptsSetupWranglerConfigSh from '../templates/scripts-setup-wrangler-config.sh.template?raw';
import scriptsSyncDopplerSecretsSh from '../templates/scripts-sync-doppler-secrets-sh.template?raw';
import eslintConfigJs from '../templates/eslint-config-js.template?raw';

import gitignoreTemplate from '../templates/gitignore.template?raw';
import dependabotConfig from '../templates/dependabot.yml.template?raw';
import dependabotAutoMerge from '../templates/dependabot-auto-merge.yml.template?raw';
import vscodeTasksJson from '../templates/vscode-tasks-json.template?raw';
import vscodeSettingsJson from '../templates/vscode-settings-json.template?raw';
import cloudflareWorkerIndexJs from '../templates/cloudflare-worker-index-js.template?raw';
import svelteAppHtml from '../templates/svelte-app-html.template?raw';
import sveltePageSvelte from '../templates/svelte-page-svelte.template?raw';
import svelteConfigJs from '../templates/svelte-config-js.template?raw';
import svelteViteConfigJs from '../templates/svelte-vite-config-js.template?raw';
import docsifyIndex from '../templates/docsify-index.template?raw';
import docsifyReadme from '../templates/docsify-readme.template?raw';
import devcontainerServeDocumentsCjs from '../templates/devcontainer-serve-docs-cjs.template?raw';
import { capabilities } from '$lib/config/capabilities.js';
import {
	getCapabilityTemplateData,
	applyDefaults,
	resolveLanguage,
	resolveDopplerTarget,
	toPythonPackageName,
	toDistributionName,
	getGooseMcpConfig,
	assertNoGooseEnvVarReferences
} from '$lib/utils/capability-template-utils.js';

// 2.2: health endpoint emitted for docker-container SvelteKit projects.
// Returns 200 {ok:true} so the container HEALTHCHECK and Homepage widget work
// without any additional tooling.
export const HEALTH_ROUTE_SOURCE = `// Health check endpoint used by the container HEALTHCHECK and Homepage widget.
export function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
`;

export const AGY_DEV_ALIAS = `# A robust function to run Antigravity with Doppler, ensuring no stale SonarQube containers exist.
# Secrets are loaded from the 'common' project first, then the current project's secrets layer on
# top (project-specific secrets take precedence over common ones).
agy-dev() {
  # Only check for Docker containers if Docker is installed
  if command -v docker &> /dev/null; then
    # Define the name of the container to check for
    local container_name="sonarqube-mcp-server"

    # Find the container ID using Docker's filter. The -q flag means "quiet" (ID only).
    local container_id=$(docker ps -a -q --filter "name=\${container_name}")

    # Check if the container_id variable is not empty
    if [ -n "$container_id" ]; then
      echo "Found stale container '\${container_name}' ($container_id). Removing it..."
      # Force remove the container. The -f flag stops it if it's running.
      docker rm -f "$container_id"
    fi
  fi

  echo "Starting Antigravity with Doppler (common + {{dopplerProject}})..."
  # Load common secrets first, then layer project-specific secrets on top.
  # --forward-signals ensures SIGINT/SIGTERM are correctly passed through to agy.
  doppler run --project common --config dev -- doppler run --forward-signals --project {{dopplerProject}} --config dev -- agy "$@"
}`;

export const SHELL_SETUP_SCRIPT = `
echo "INFO: Installing uv tool..."
curl -LsSf https://astral.sh/uv/install.sh | sudo env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

echo "INFO: Installing Cursor CLI..."
curl https://cursor.com/install -fsS | bash
`;

export const GIT_SAFE_DIR_SCRIPT = `
echo "INFO: Configuring git safe directory..."
git config --global --add safe.directory /workspaces/{{projectName}}`;

export const GIT_GITHUB_AUTH_SETUP_SCRIPT = `
echo "INFO: Configuring GitHub auth over SSH (no PAT)..."
# genproj-github-auth (SSH-first): GitHub remotes authenticate via an SSH key
# supplied by the host bind-mount (~/.ssh) or the forwarded SSH agent. No PAT
# is ever written to ~/.gitconfig or remote URLs. Defaults to SSH; fails loud
# with guidance if no working key/agent is found. Idempotent: re-runs must not
# duplicate or clobber the existing rewrite.

# --- 1. Make a usable key for the container user ---------------------------
# The host ~/.ssh is bind-mounted at $HOME/.ssh. Those files keep the host uid
# (macOS 501), which OpenSSH (running as the container uid, typically 1000)
# refuses to use. We never chown the mount (that mutates the host file).
# Preferred: forward the SSH agent (zero keys on disk). Fallback: copy the
# mounted key into a container-owned dir with mode 600.
KEY_COPIED=""
if [ -n "\${SSH_AUTH_SOCK:-}" ] && command -v ssh-add &> /dev/null && ssh-add -l >/dev/null 2>&1; then
    echo "INFO: GitHub auth via forwarded SSH agent (\${SSH_AUTH_SOCK})."
else
    mkdir -p "$HOME/.genproj-ssh" && chmod 700 "$HOME/.genproj-ssh"
    for KEY in "$HOME/.ssh/id_ed25519" "$HOME/.ssh/id_rsa"; do
        if [ -r "$KEY" ]; then
            DEST="$HOME/.genproj-ssh/$(basename "$KEY")"
            cp "$KEY" "$DEST"
            chmod 600 "$DEST"
            KEY_COPIED="$DEST"
            echo "INFO: Copied host-mounted key $KEY into $DEST."
            break
        fi
    done
fi

# --- 2. Point git's ssh at the copied key (if any) -------------------------
# Persisted in ~/.gitconfig (no secret involved), so it survives re-runs.
if [ -n "$KEY_COPIED" ]; then
    git config --global core.sshCommand "ssh -i $KEY_COPIED -o IdentitiesOnly=yes"
fi

# --- 3. Idempotent SSH insteadOf rewrite for github.com ---------------------
if git config --global --get-regexp '^url\\.git@github\\.com:.*\\.insteadof' >/dev/null 2>&1; then
    echo "INFO: GitHub SSH rewrite already configured; leaving in place."
elif ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 -T git@github.com 2>&1 | grep -qi "successfully authenticated"; then
    git config --global url."git@github.com:".insteadOf "https://github.com/"
    echo "INFO: GitHub remotes now use SSH (git@github.com:)."
else
    echo "WARN: No working SSH key/agent found for github.com."
    echo "      Add an SSH public key at https://github.com/settings/keys,"
    echo "      load it on the host (ssh-add --apple-use-keychain), and"
    echo "      rebuild/re-run this setup. HTTPS push/pull will use the"
    echo "      default credential helper until then."
fi
`;

export const GOOSE_ALIAS = `# A robust function to run goose with Doppler, ensuring all secrets are available.
# Secrets are loaded from the 'common' project first, then the 'goose' project's secrets layer on
# top (project-specific secrets take precedence over common ones).
# Overrides the bare \`goose\` binary (which can't work standalone: it needs Doppler secrets).
goose() {
  echo "Starting goose with Doppler (common + goose)..."
  # Doppler auth pre-flight: fail with actionable guidance instead of the cryptic
  # "Doppler Error: you must provide a token" that 'doppler run' emits when the
  # container has no Doppler auth (fresh devcontainer / codespace).
  if ! command -v doppler &> /dev/null; then
    echo "❌ Doppler CLI not found - goose needs Doppler secrets to start."
    echo "   Finish the devcontainer post-create setup (it installs the CLI), then try again."
    return 127
  fi
  if ! doppler whoami &> /dev/null 2>&1; then
    echo "❌ Not authenticated with Doppler - goose needs Doppler secrets to start."
    echo "   Run: bash scripts/cloud_login.sh   (interactive browser login)"
    echo "   Or set a service token:  export DOPPLER_TOKEN=dp.st.<token>"
    return 1
  fi
  # Load common secrets first, then layer goose project secrets on top.
  # Uses 'prd' config for the goose project to pick up LITELLM endpoint env vars.
  # --forward-signals ensures SIGINT/SIGTERM are correctly passed through to goose.
  # Routes through _wt_ensure so goose runs in this shell's feature worktree.
  _wt_ensure doppler run --project common --config dev -- doppler run --forward-signals --project goose --config prd -- goose "$@"
}`;

/**
 * Doppler setup block for .devcontainer/post-create-setup.sh
 *
 * - ensures ~/.doppler perms and the CLI is on PATH (round-5 fallback install)
 * - genproj-doppler-context-pin (memo Gi8CN7XqpH6CxFAc2YUJsK): Doppler's
 *   precedence is env > doppler.yaml > ~/.doppler. Ambient
 *   DOPPLER_PROJECT/DOPPLER_CONFIG/DOPPLER_ENVIRONMENT from the session that
 *   launches the devcontainer (e.g. an agent runtime) leak in and silently
 *   redirect every `doppler` command at the wrong project. Pin this repo's
 *   doppler.yaml context in ~/.bashrc + ~/.zshrc so EVERY shell — including
 *   agent-spawned ones that never re-run post-create — resolves the right
 *   project. Must run AFTER the repo .zshrc copy in the template, otherwise
 *   the cp clobbers the appended block.
 * - verifies the resolved project loudly at setup time (never silent).
 */
export function generateDopplerSetupScript(context = {}) {
	// Doppler scaling memo (memos/doppler-scaling): repos default to the
	// shared `common` project (no new project created); projectStrategy: 'new'
	// opts into a dedicated per-app project. The context pin must match the
	// repo's doppler.yaml, so it follows the resolved target.
	const { project: projectName, config } = resolveDopplerTarget(context);

	const rcBlock = `# genproj-doppler-context-pin: this repo's doppler.yaml context wins over ambient env
export DOPPLER_PROJECT=${projectName}
export DOPPLER_CONFIG=${config}
unset DOPPLER_ENVIRONMENT 2>/dev/null || true
`;

	return `echo "INFO: Ensuring doppler directory permissions..."
mkdir -p "$USER_HOME_DIR/.doppler"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.doppler"
# Round-5 (memo genproj-fixes-round5): guarantee the CLI is on PATH. The
# Dockerfile installs it for fresh projects, but a regenerated project whose
# Dockerfile was preserved (round-3 idempotent overwrite) needs the fallback.
# (A devcontainer feature was tried first but ghcr.io/devcontainers-contrib
# features are no longer reliably pullable — 'denied'.)
if ! command -v doppler &> /dev/null; then
    echo "INFO: Installing Doppler CLI (fallback)..."
    (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sudo sh
fi
# genproj-doppler-context-pin (memo Gi8CN7XqpH6CxFAc2YUJsK): ambient
# DOPPLER_PROJECT/DOPPLER_CONFIG/DOPPLER_ENVIRONMENT from the launching session
# override doppler.yaml (env > yaml) and silently point every 'doppler' command
# at the wrong project. Pin the repo context in ~/.bashrc + ~/.zshrc so new
# shells (including agent-spawned ones) inherit it. The marker keeps the
# append idempotent across post-create re-runs.
DOPPLER_RC_MARKER='# genproj-doppler-context-pin'
if ! grep -qF "$DOPPLER_RC_MARKER" "$HOME/.bashrc" 2>/dev/null; then
    cat >> "$HOME/.bashrc" <<'EOF'
${rcBlock}
EOF
    echo "INFO: Pinned doppler context (${projectName}/${config}) in ~/.bashrc"
fi
if ! grep -qF "$DOPPLER_RC_MARKER" "$HOME/.zshrc" 2>/dev/null; then
    cat >> "$HOME/.zshrc" <<'EOF'
${rcBlock}
EOF
    echo "INFO: Pinned doppler context (${projectName}/${config}) in ~/.zshrc"
fi
# Apply to this shell too, then verify resolution is never silently wrong.
export DOPPLER_PROJECT=${projectName}
export DOPPLER_CONFIG=${config}
unset DOPPLER_ENVIRONMENT 2>/dev/null || true
if command -v doppler &> /dev/null && doppler whoami &> /dev/null 2>&1; then
    RESOLVED_PROJECT="$(doppler run -- printenv DOPPLER_PROJECT 2>/dev/null | tail -n 1)"
    if [ -n "$RESOLVED_PROJECT" ] && [ "$RESOLVED_PROJECT" != "${projectName}" ]; then
        echo "WARNING: 'doppler run' resolves project '$RESOLVED_PROJECT', but doppler.yaml"
        echo "         declares '${projectName}'. An ambient DOPPLER_* export is overriding"
        echo "         the repo context. Run: unset DOPPLER_PROJECT DOPPLER_CONFIG DOPPLER_ENVIRONMENT"
        echo "         then 'doppler setup --no-interactive --project ${projectName} --config ${config}'."
    elif [ -z "$RESOLVED_PROJECT" ]; then
        echo "WARNING: could not resolve the doppler project via 'doppler run'. If"
        echo "         'doppler projects get ${projectName}' 404s, create it and run"
        echo "         'doppler setup --no-interactive --project ${projectName} --config ${config}'."
    else
        echo "INFO: doppler context verified: ${projectName}/${config}"
    fi
fi
`;
}

/**
 * Generates the goose setup script for post-create-setup.sh
 *
 * Non-destructive by design: it NEVER overwrites an existing
 * $HOME/.config/goose/config.yaml. The user's real config (active provider +
 * extensions) is bind-mounted into the devcontainer (see
 * getDevcontainerJsonExtras), so writing a fresh config here would clobber it
 * and surface as "error: No provider configured. Run 'goose configure' first."
 * when goose starts. Only recipes are bootstrapped (recipes/ dir is additive).
 *
 * @returns {string} The setup script content
 */
export function generateGooseSetupScript(context = {}) {
	const gooseMcp = getGooseMcpConfig(context);
	const fragments = [
		{ key: 'sonarqube', block: gooseMcp.sonarQubeGooseConfig },
		{ key: 'circleci', block: gooseMcp.circleCiGooseConfig },
		{ key: 'xcode-native', block: gooseMcp.xcodeNativeGooseConfig },
		{ key: 'svelte', block: gooseMcp.svelteGooseConfig }
	].filter((f) => f.block);

	// Regression guard (genproj-goose-env-refs): goose does not expand
	// ${VAR}/$VAR in stdio extension env maps — the literal text would be used
	// as the token (→ MCP 401). Fail generation loudly rather than shipping a
	// broken config. Only the YAML blocks are scanned; the shell scaffolding
	// below legitimately uses $HOME/${key} etc.
	for (const f of fragments) {
		assertNoGooseEnvVarReferences(f.block, f.key);
	}

	// Round-4 fix (memo genproj-goose-extensions): wire the previously-dead
	// getGooseMcpConfig() into generation. Selected capabilities (circleci,
	// sonarcloud, xcode-development) now register their goose MCP extension in
	// the container's config.yaml — idempotently: keys already present (e.g.
	// from the bind-mounted host ~/.config/goose) are skipped, and a missing
	// top-level `extensions:` map is created. Never clobbers anything.
	let extensionMerge = '';
	if (fragments.length > 0) {
		const ensureFn = `
# Idempotently register a project-selected goose MCP extension. Never clobbers:
# skips keys already present, only appends the missing block under extensions:.
ensure_goose_extension() {
  local key="$1" block="$2" config="$HOME/.config/goose/config.yaml"
  [ -f "$config" ] || { echo "WARN: no goose config yet - project extensions apply after 'goose configure'"; return 0; }
  grep -qE "^  \${key}:" "$config" && { echo "INFO: goose extension '\${key}' already registered."; return 0; }
  grep -q '^extensions:' "$config" || echo "extensions:" >> "$config"
  awk -v frag="$block" '/^extensions:/ { print; printf "%s", frag; next } { print }' "$config" > "\${config}.tmp" && mv "\${config}.tmp" "$config"
  echo "INFO: Registered goose extension '\${key}'."
}
`;
		const calls = fragments
			.map((f) => `ensure_goose_extension "${f.key}" '${f.block.replace(/^\n/, '')}\n'`)
			.join('\n');
		extensionMerge = `
echo "INFO: Registering project-selected goose MCP extensions..."
${ensureFn}
${calls}
`;
	}

	return `
echo "INFO: Setting up goose configuration and MCP servers..."

# Create goose config directory
mkdir -p "$HOME/.config/goose"

# Never overwrite an existing goose config: the user's real config.yaml
# (provider + extensions) is bind-mounted into the devcontainer. Clobbering it
# drops the configured provider and surfaces as:
#   error: No provider configured. Run 'goose configure' first.
if [ -f "$HOME/.config/goose/config.yaml" ]; then
    echo "INFO: Keeping existing $HOME/.config/goose/config.yaml (provider + extensions preserved)."
else
    echo "INFO: No goose config found yet - run 'goose configure' inside the container to set up your provider."
fi
${extensionMerge}
echo "INFO: Ensuring goose recipes are available (spec-first development process)..."
RECIPES_DIR="$HOME/.config/goose/recipes"
if [ -d "$RECIPES_DIR/.git" ]; then
    (cd "$RECIPES_DIR" && git pull --ff-only --quiet) \
        || echo "WARN: Could not update goose-recipes (offline or conflict); keeping existing copy."
else
    mkdir -p "$HOME/.config/goose"
    git clone --quiet https://github.com/nickbrett1/goose-recipes.git "$RECIPES_DIR" \
        || echo "WARN: Could not clone goose-recipes; recipes will be unavailable."
fi

echo "INFO: goose configuration complete."
`;
}

export const AGY_SETUP_SCRIPT = String.raw`
echo "INFO: Installing Antigravity CLI and Specify CLI..."
if ! command -v npm &> /dev/null; then
    echo "npm not found. Installing nodejs and npm..."
    sudo apt-get update
    sudo apt-get install -y nodejs npm
fi
sudo npm install -g @specifyapp/cli
curl -fsSL https://antigravity.google/cli/install.sh | bash
echo "INFO: Antigravity CLI and Specify CLI installation complete."

echo "INFO: Initializing Antigravity CLI global settings..."
mkdir -p "$USER_HOME_DIR/.agy"
printf '{\n  "selectedAuthType": "oauth-personal",\n  "general": {\n    "sessionRetention": {\n      "enabled": true,\n      "maxAge": "30d",\n      "warningAcknowledged": true\n    }\n  },\n  "ide": {\n    "hasSeenNudge": true,\n    "enabled": true\n  }\n}\n' > "$USER_HOME_DIR/.agy/settings.json"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.agy"

echo "INFO: Installing agy-telemetry hook..."
curl -fsSL https://raw.githubusercontent.com/nickbrett1/agy-telemetry/main/install.py | python3`;

export const PLAYWRIGHT_SETUP_SCRIPT = `
echo "INFO: Installing Playwright and its Chromium dependencies..."
npx --yes playwright install --with-deps chromium
echo "INFO: Playwright Chromium installation complete."`;

export const PYTHON_SETUP_SCRIPT = `
# Setup python virtual environment and install dependencies
# (memo: genproj python devcontainer .venv PATH). postCreate runs with the
# workspace as CWD, but cd explicitly so this also works when invoked from
# elsewhere (e.g. a manual re-run after the container restarted in $HOME).
cd "/workspaces/{{projectName}}" 2>/dev/null || true

if [ ! -d ".venv" ]; then
    echo "INFO: Creating Python virtual environment (.venv)..."
    python3 -m venv .venv
fi

if [ -f "requirements.txt" ]; then
    echo "INFO: Installing dependencies from requirements.txt..."
    .venv/bin/pip install -r requirements.txt
elif [ -f "pyproject.toml" ]; then
    echo "INFO: Installing dependencies from pyproject.toml (dev extras)..."
    .venv/bin/pip install -e ".[dev]"
fi

# genproj-python-venv-path: expose .venv/bin on PATH for shells that do NOT
# inherit devcontainer.json remoteEnv (VS Code terminals get PATH from
# remoteEnv; ssh / 'bash -lc' / tmux panes started outside VS Code do not).
# The marker comment keeps this idempotent across post-create re-runs.
VENV_RC_MARKER='# genproj-python-venv-path'
if ! grep -qF "$VENV_RC_MARKER" "$HOME/.bashrc" 2>/dev/null; then
    cat >> "$HOME/.bashrc" <<'EOF'
# genproj-python-venv-path: prefer project .venv
if [ -d "/workspaces/{{projectName}}/.venv/bin" ]; then
    export PATH="/workspaces/{{projectName}}/.venv/bin:$PATH"
fi
EOF
    echo "INFO: Added .venv PATH hook to ~/.bashrc"
fi
if ! grep -qF "$VENV_RC_MARKER" "$HOME/.zshrc" 2>/dev/null; then
    cat >> "$HOME/.zshrc" <<'EOF'
# genproj-python-venv-path: prefer project .venv
if [ -d "/workspaces/{{projectName}}/.venv/bin" ]; then
    export PATH="/workspaces/{{projectName}}/.venv/bin:$PATH"
fi
EOF
    echo "INFO: Added .venv PATH hook to ~/.zshrc"
fi
`;

export const NODE_SETUP_SCRIPT = `
# Setup node dependencies and expose node_modules/.bin on PATH
# (memo: genproj node devcontainer .venv PATH — same class of bug as python
# .venv). postCreate runs with the workspace as CWD, but cd explicitly so
# this also works when invoked from elsewhere.
cd "/workspaces/{{projectName}}" 2>/dev/null || true

if [ -f "package.json" ]; then
    # genproj-npm-pin: activate the npm pinned in package.json. npm 10 bundled
    # with Node <24 crashes installing vitest-4 projects ('edgesOut'), and
    # packageManager/corepack alone does NOT switch npm (corepack only shims
    # yarn/pnpm) - so install the pinned version globally, mirroring CI.
    PINNED_NPM="$(node -p "try{require('./package.json').packageManager}catch(e){''}" 2>/dev/null || true)"
    if [ -n "$PINNED_NPM" ]; then
        VERSION="\${PINNED_NPM#npm@}"
        CURRENT="$(npm --version 2>/dev/null || echo '')"
        if [ "$VERSION" != "$CURRENT" ]; then
            echo "INFO: Activating pinned \${PINNED_NPM} (image npm: \${CURRENT:-unknown})..."
            (npm install -g "npm@\${VERSION}" 2>/dev/null || sudo npm install -g "npm@\${VERSION}") || echo "WARN: Could not activate pinned npm \${VERSION}; continuing with $(npm --version 2>/dev/null)"
        fi
    fi
    echo "INFO: Installing dependencies with npm install..."
    npm install
fi

# genproj-node-bin-path: expose node_modules/.bin on PATH for shells that do
# NOT inherit devcontainer.json remoteEnv (VS Code terminals get PATH from
# remoteEnv; ssh / 'bash -lc' / tmux panes started outside VS Code do not).
# The marker comment keeps this idempotent across post-create re-runs.
NODE_BIN_MARKER='# genproj-node-bin-path'
if ! grep -qF "$NODE_BIN_MARKER" "$HOME/.bashrc" 2>/dev/null; then
    cat >> "$HOME/.bashrc" <<'EOF'
# genproj-node-bin-path: prefer project node_modules/.bin
if [ -d "/workspaces/{{projectName}}/node_modules/.bin" ]; then
    export PATH="/workspaces/{{projectName}}/node_modules/.bin:$PATH"
fi
EOF
    echo "INFO: Added node_modules/.bin PATH hook to ~/.bashrc"
fi
if ! grep -qF "$NODE_BIN_MARKER" "$HOME/.zshrc" 2>/dev/null; then
    cat >> "$HOME/.zshrc" <<'EOF'
# genproj-node-bin-path: prefer project node_modules/.bin
if [ -d "/workspaces/{{projectName}}/node_modules/.bin" ]; then
    export PATH="/workspaces/{{projectName}}/node_modules/.bin:$PATH"
fi
EOF
    echo "INFO: Added node_modules/.bin PATH hook to ~/.zshrc"
fi
`;

export const DOPPLER_LOGIN_SCRIPT = `
# Doppler login/setup
if command -v doppler &> /dev/null; then
  if doppler whoami &> /dev/null 2>&1; then
    echo "✅ Already logged in to Doppler."
  else
    echo "INFO: Logging into Doppler (browser flow)..."
    echo "      If a browser does not open, copy the URL and auth code printed above into"
    echo "      your browser to complete the login, then return here."
    if doppler login --no-check-version --yes; then
      echo "✅ Doppler login successful."
      if doppler setup --no-interactive --project {{dopplerProject}} --config dev; then
        echo "✅ Doppler project {{dopplerProject}}/dev configured."
      else
        echo "WARN: doppler setup failed for {{dopplerProject}}/dev - the project may not"
        echo "      exist yet. Create it at https://dashboard.doppler.com, then run:"
        echo "      doppler setup --no-interactive --project {{dopplerProject}} --config dev"
      fi
    else
      echo "❌ Doppler login did not complete. Re-run this script (or 'doppler login'),"
      echo "   or authenticate with a service token:  export DOPPLER_TOKEN=dp.st.<token>"
    fi
  fi
else
  echo "⚠️  Doppler CLI not found. Skipping Doppler login - run 'goose' after the"
  echo "    devcontainer post-create setup finishes, or install the CLI manually."
fi`;

export const WRANGLER_LOGIN_SCRIPT = String.raw`
echo
# Cloudflare Wrangler login
# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Wrangler CLI not found. Installing globally with npm..."
  npm install -g wrangler
fi

# 1. Check if already logged in via Doppler API Token (Highly recommended for multi-container)
if doppler run --project {{dopplerProject}} --config dev -- env | grep -q "CLOUDFLARE_API_TOKEN"; then
  echo "✅ Found CLOUDFLARE_API_TOKEN in Doppler. Using token for authentication."
  # Verify connectivity
  if ! doppler run --project {{dopplerProject}} --config dev -- npx wrangler whoami 2>&1 | grep -q "You are not authenticated"; then
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

WRANGLER_CALLBACK_PORT=${'${WRANGLER_CALLBACK_PORT:-8976}'}

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

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=${'$WRANGLER_CALLBACK_PORT'} | stdbuf -oL sed 's/0\\.0\\.0\\.0/localhost/g'" /dev/null`;

export const SETUP_WRANGLER_SCRIPT = `
echo
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project {{dopplerProject}} --config dev -- ./scripts/setup-wrangler-config.sh dev`;

export const DOPPLER_INSTALL_SCRIPT = String.raw`curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list`;

const templateImports = {
	'devcontainer-java-dockerfile': devcontainerJavaDockerfile,
	'devcontainer-java-json': devcontainerJavaJson,
	'devcontainer-node-dockerfile': devcontainerNodeDockerfile,
	'devcontainer-node-json': devcontainerNodeJson,
	'devcontainer-p10k-zsh-full': devcontainerP10kZshFull,
	'devcontainer-p10k-zsh': devcontainerP10kZsh,
	'devcontainer-post-create-setup-sh': devcontainerPostCreateSetupSh,
	'devcontainer-post-start-setup-sh': devcontainerPostStartSetupSh,
	'devcontainer-python-dockerfile': devcontainerPythonDockerfile,
	'devcontainer-python-json': devcontainerPythonJson,
	'devcontainer-rust-dockerfile': devcontainerRustDockerfile,
	'devcontainer-rust-json': devcontainerRustJson,
	'devcontainer-zshrc-full': devcontainerZshrcFull,
	'devcontainer-zshrc': devcontainerZshrc,
	'devcontainer-tmux-conf': devcontainerTmuxConf,
	'playwright-config': playwrightConfig,
	'lighthouse-ci-config': lighthouseCiConfig,
	'circleci-config': circleCiConfig,
	dockerfile: dockerfileTemplate,
	dockerignore: dockerignoreTemplate,
	'docker-compose': dockerComposeTemplate,
	'deploy-readme': deployReadmeTemplate,
	'homepage-services': homepageServicesTemplate,
	'env-example': envExampleTemplate,
	'.sonarcloud.properties': sonarProjectProperties,
	'eslint-config-js': eslintConfigJs,
	'doppler-yaml': dopplerYaml,
	'mcp-config-json': mcpConfigJson,
	'mcp-sse-proxy-js': mcpSseProxyJs,
	'mcp-streamable-http-proxy-js': mcpStreamableHttpProxyJs,
	'package-json': packageJsonTemplate,
	'wrangler-jsonc': wranglerJsonc,
	'wrangler-template-jsonc': wranglerTemplateJsonc,
	'scripts-cloud-login-sh': scriptsCloudLoginSh,
	'scripts-run-wrangler-dev-sh': scriptsRunWranglerDevelopmentSh,
	'scripts-setup-wrangler-config-sh': scriptsSetupWranglerConfigSh,
	'scripts-sync-doppler-secrets-sh': scriptsSyncDopplerSecretsSh,

	gitignore: gitignoreTemplate,
	'dependabot-config': dependabotConfig,
	'dependabot-auto-merge': dependabotAutoMerge,
	'vscode-tasks-json': vscodeTasksJson,
	'vscode-settings-json': vscodeSettingsJson,
	'cloudflare-worker-index-js': cloudflareWorkerIndexJs,
	'svelte-app-html': svelteAppHtml,
	'svelte-page-svelte': sveltePageSvelte,
	'svelte-config-js': svelteConfigJs,
	'svelte-vite-config-js': svelteViteConfigJs,
	'docsify-index': docsifyIndex,
	'docsify-readme': docsifyReadme,
	'devcontainer-serve-docs-cjs': devcontainerServeDocumentsCjs
};

export class TemplateEngine {
	constructor() {
		this.templates = new Map();
		this.initialized = false;
	}

	async initialize() {
		if (this.initialized) {
			return true;
		}
		try {
			// Load raw template strings
			for (const [templateId, templateString] of Object.entries(templateImports)) {
				this.templates.set(templateId, templateString);
			}

			this.initialized = true;
			return true;
		} catch (error) {
			console.error('Failed to initialize TemplateEngine:', error);
			return false;
		}
	}

	getTemplate(name) {
		const template = this.templates.get(name);
		return template || null;
	}

	compileTemplate(templateString, data) {
		let content = templateString;
		const regex = /{{([^{}]+)}}/g;

		content = content.replaceAll(regex, (match, key) => {
			const trimmedKey = key.trim();
			if (Object.hasOwn(data, trimmedKey)) {
				// eslint-disable-next-line security/detect-object-injection
				return data[trimmedKey];
			}

			const keys = trimmedKey.split('.');
			let value = data;
			for (const k of keys) {
				if (value && typeof value === 'object' && Object.hasOwn(value, k)) {
					// eslint-disable-next-line security/detect-object-injection
					value = value[k];
				} else {
					return match;
				}
			}
			return value;
		});

		return content;
	}

	generateFile(templateId, data) {
		const template = this.getTemplate(templateId);
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}
		return this.compileTemplate(template, data);
	}

	generateFiles(fileRequests) {
		const results = [];
		for (const [index, request] of fileRequests.entries()) {
			try {
				// If content is already pre-generated, use it directly
				// This is for merged devcontainer files
				const content =
					request.content ?? this.generateFile(request.templateId, { ...request.data, index });
				results.push({ ...request, success: true, content });
			} catch (error) {
				results.push({ ...request, success: false, error: error.message });
			}
		}
		return results;
	}
}

function collectSingleTemplateFile(templateEngine, context, capabilityId, capability, template) {
	try {
		const extraData = getCapabilityTemplateData(capabilityId, {
			capabilities: context.capabilities,
			configuration: context.configuration,
			projectName: context.projectName || context.name || 'my-project',
			registryNamespace: context.registryNamespace
		});

		// Special handling for SvelteKit config adapter
		let adapterPackage = '@sveltejs/adapter-auto';
		let adapterComment =
			'// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.\n' +
			'    // If your environment is not supported or you settled on a specific environment, switch out the adapter.\n' +
			'    // See https://kit.svelte.dev/docs/adapters for more information about adapters.';

		if (capabilityId === 'sveltekit' && context.capabilities.includes('cloudflare-wrangler')) {
			adapterPackage = '@sveltejs/adapter-cloudflare';
			adapterComment =
				'// adapter-cloudflare is configured for Wrangler deployment\n' +
				'    // See https://kit.svelte.dev/docs/adapter-cloudflare for more information.';
		} else if (capabilityId === 'sveltekit' && context.capabilities.includes('docker-container')) {
			adapterPackage = '@sveltejs/adapter-node';
			adapterComment =
				'// adapter-node outputs a standalone Node server (build/index.js) for the Docker container\n' +
				'    // See https://kit.svelte.dev/docs/adapter-node for more information.';
		}

		// eslint-disable-next-line security/detect-object-injection
		const capabilityConfig = context.configuration?.[capabilityId] || {};

		const content = templateEngine.generateFile(template.templateId, {
			...context,
			...extraData,
			projectName: context.projectName || context.name || 'my-project',
			capabilityConfig,
			capability,
			adapterPackage,
			adapterComment
		});
		return {
			filePath: template.filePath,
			content: /\.ya?ml$/i.test(template.filePath) ? normalizeYamlBlankLines(content) : content
		};
	} catch (error) {
		console.warn(`⚠️ Failed to process template ${template.templateId}:`, error);
		return;
	}
}

// Helper to collect files for non-dev-container capabilities
export function collectNonDevelopmentContainerFiles(templateEngine, context, otherCapabilities) {
	const files = [];

	for (const capabilityId of otherCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.templates) {
			for (const template of capability.templates) {
				const file = collectSingleTemplateFile(
					templateEngine,
					context,
					capabilityId,
					capability,
					template
				);
				if (file) {
					files.push(file);
				}
			}
		}
	}
	return files;
}

function addExtensionsFromContainerJson(allExtensions, json) {
	if (json.customizations?.vscode?.extensions) {
		for (const extension of json.customizations.vscode.extensions) {
			allExtensions.add(extension);
		}
	}
}

function addExtensionsFromCapabilities(allExtensions, capabilityIds) {
	for (const capabilityId of capabilityIds) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.vscodeExtensions) {
			for (const extension of capability.vscodeExtensions) allExtensions.add(extension);
		}
	}
}

/**
 * Computes the devcontainer.json mounts + forwardPorts from the SELECTED
 * capabilities only (memo §2.9 / audit §4.5): the tailscale state volume is
 * always kept (dev-network bootstrap, do-not-regress), wrangler/doppler/gemini
 * volumes only when those capabilities are selected, and the kitchen-sink
 * forwardPorts are dropped (docsify adds its own below).
 * @param {Object} context - Generation context
 * @returns {{devcontainerMounts: string, devcontainerForwardPorts: string}} Template data
 */
export function getDevcontainerJsonExtras(context) {
	const isNode = context.capabilities.includes('devcontainer-node');
	const home = isNode ? '/home/node' : '/home/vscode';
	const projectName = context.projectName || context.name || 'my-project';

	const mounts = [`source=${projectName}-tailscale-state,target=/var/lib/tailscale,type=volume`];
	if (context.capabilities.includes('cloudflare-wrangler')) {
		mounts.push(`source=${projectName}-wrangler-config,target=${home}/.wrangler,type=volume`);
	}
	if (context.capabilities.includes('doppler')) {
		// Round-5 (memo genproj-fixes-round5): bind the host ~/.doppler into the
		// container so `doppler setup`/auth survives rebuilds and the host's
		// Doppler login is shared (mirrors the ${localEnv:HOME}/.config/goose
		// bind-mount). Previously a named volume — the CLI auth never persisted.
		mounts.push(`source=\${localEnv:HOME}/.doppler,target=${home}/.doppler,type=bind`);
	}
	if (context.capabilities.includes('coding-agents')) {
		mounts.push(`source=gemini-cli-settings,target=${home}/.gemini,type=volume`);
	}
	// genproj-ssh-auth (memo "Fix genproj to scaffold SSH-based GitHub auth"):
	// bind the host ~/.ssh into the container so GitHub auth works over SSH
	// (git@github.com:) with no PAT embedded in git config / remote URLs. The
	// post-create setup copies the key into a container-owned dir (never
	// chowns the mount) or uses a forwarded SSH agent. Always present, like
	// the goose config bind below.
	mounts.push(`source=\${localEnv:HOME}/.ssh,target=${home}/.ssh,type=bind`);
	// goose is installed in every generated devcontainer Dockerfile, so bind the
	// host ~/.config/goose into the container: the user's real config.yaml
	// (active provider + extensions) must be visible or goose fails with
	// "No provider configured. Run 'goose configure' first." and loses all
	// user extensions. The setup script (generateGooseSetupScript) never
	// overwrites this config. ${localEnv:HOME} is expanded by the devcontainer
	// tooling on the host at container start.
	mounts.push(`source=\${localEnv:HOME}/.config/goose,target=${home}/.config/goose,type=bind`);

	return {
		devcontainerMounts: mounts.map((m) => `"${m}"`).join(',\n    '),
		devcontainerForwardPorts: '[]'
	};
}

function processAdditionalDevelopmentContainer(
	capabilityId,
	context,
	templateEngine,
	mergedJson,
	allExtensions
) {
	const capability = capabilities.find((c) => c.id === capabilityId);
	// eslint-disable-next-line security/detect-object-injection
	const capabilityConfig = applyDefaults(capability, context.configuration?.[capabilityId] || {});

	const otherJsonContent = templateEngine.generateFile(
		`devcontainer-${capabilityId.split('-')[1]}-json`,
		{
			...context,
			projectName: context.projectName || context.name || 'my-project',
			capabilityConfig: capabilityConfig,
			capability: capability,
			...getDevcontainerJsonExtras(context)
		}
	);
	const otherJson = JSON.parse(otherJsonContent);

	if (otherJson.features) {
		mergedJson.features = {
			...mergedJson.features,
			...otherJson.features
		};
	}

	addExtensionsFromContainerJson(allExtensions, otherJson);
}

function generateAndMergeDevcontainerJson(
	templateEngine,
	context,
	developmentContainerCapabilities
) {
	const baseDevelopmentContainerId = developmentContainerCapabilities[0];
	const baseCapability = capabilities.find((c) => c.id === baseDevelopmentContainerId);

	const baseCapabilityConfig = applyDefaults(
		baseCapability,
		// eslint-disable-next-line security/detect-object-injection
		context.configuration?.[baseDevelopmentContainerId] || {}
	);

	// Process devcontainer.json merging
	const baseJsonContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-json`,
		{
			...context,
			projectName: context.projectName || context.name || 'my-project',
			capabilityConfig: baseCapabilityConfig,
			capability: baseCapability,
			...getDevcontainerJsonExtras(context)
		}
	);
	let mergedDevelopmentContainerJson = JSON.parse(baseJsonContent);

	const allExtensions = new Set();
	// Always include the tmux-integrated and mermaid-preview extensions
	allExtensions.add('pcassidy75.tmux-integrated');
	allExtensions.add('vsc-mermaid.mermaid-preview');

	// 1. From base JSON
	addExtensionsFromContainerJson(allExtensions, mergedDevelopmentContainerJson);

	// 2. From all capabilities (project configuration)
	addExtensionsFromCapabilities(allExtensions, context.capabilities);

	// 3. From other devcontainer JSONs (merged ones)
	for (let index = 1; index < developmentContainerCapabilities.length; index++) {
		// eslint-disable-next-line security/detect-object-injection
		const capabilityId = developmentContainerCapabilities[index];
		processAdditionalDevelopmentContainer(
			capabilityId,
			context,
			templateEngine,
			mergedDevelopmentContainerJson,
			allExtensions
		);
	}

	if (allExtensions.size > 0) {
		if (!mergedDevelopmentContainerJson.customizations) {
			mergedDevelopmentContainerJson.customizations = {};
		}
		if (!mergedDevelopmentContainerJson.customizations.vscode) {
			mergedDevelopmentContainerJson.customizations.vscode = {};
		}
		mergedDevelopmentContainerJson.customizations.vscode.extensions = [...allExtensions];
	}

	if (context.capabilities.includes('docsify')) {
		if (!mergedDevelopmentContainerJson.forwardPorts) {
			mergedDevelopmentContainerJson.forwardPorts = [];
		}
		if (!mergedDevelopmentContainerJson.forwardPorts.includes(3000)) {
			mergedDevelopmentContainerJson.forwardPorts.unshift(3000);
		}
	}

	return {
		filePath: '.devcontainer/devcontainer.json',
		content: `${JSON.stringify(mergedDevelopmentContainerJson, undefined, 2)}\n`
	};
}

// Helper to generate and merge devcontainer files
export function generateMergedDevelopmentContainerFiles(
	templateEngine,
	context,
	developmentContainerCapabilities
) {
	const files = [];

	if (developmentContainerCapabilities.length === 0) return files;

	const baseDevelopmentContainerId = developmentContainerCapabilities[0];
	const baseCapability = capabilities.find((c) => c.id === baseDevelopmentContainerId);

	const baseCapabilityConfig = applyDefaults(
		baseCapability,
		// eslint-disable-next-line security/detect-object-injection
		context.configuration?.[baseDevelopmentContainerId] || {}
	);

	// Process Dockerfile (using base one for now)
	const dockerfileContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-dockerfile`,
		{
			...context,
			capabilityConfig: baseCapabilityConfig,
			capability: baseCapability,
			dopplerInstallation: context.capabilities.includes('doppler')
				? ` \\\n    && ${DOPPLER_INSTALL_SCRIPT} \\\n    && apt-get update && apt-get install -y doppler`
				: '',
			docsifyInstallation: context.capabilities.includes('docsify')
				? ' \\\n    && npm install -g docsify-cli'
				: ''
		}
	);

	files.push(
		generateAndMergeDevcontainerJson(templateEngine, context, developmentContainerCapabilities),
		{
			filePath: '.devcontainer/Dockerfile',
			content: dockerfileContent
		},
		{
			filePath: '.devcontainer/.zshrc',
			content: templateEngine.generateFile('devcontainer-zshrc-full', {
				...context,
				projectName: context.projectName || context.name || 'my-project',
				agyDevAlias: context.capabilities.includes('doppler')
					? AGY_DEV_ALIAS.replaceAll(
							'{{dopplerProject}}',
							() => resolveDopplerTarget(context).project
						)
					: '',
				gooseAlias: context.capabilities.includes('doppler') ? GOOSE_ALIAS : ''
			})
		},
		{
			filePath: '.devcontainer/.p10k.zsh',
			content: templateEngine.generateFile('devcontainer-p10k-zsh-full', context)
		},
		{
			filePath: '.devcontainer/.tmux.conf',
			content: templateEngine.generateFile('devcontainer-tmux-conf', {
				...context,
				projectName: context.projectName || context.name || 'my-project'
			})
		},
		{
			filePath: '.devcontainer/post-start-setup.sh',
			content: templateEngine.generateFile('devcontainer-post-start-setup-sh', {
				...context,
				docsifyService: context.capabilities.includes('docsify')
					? `\n# Start documentation server\n# Ensure symlink for specs exists in docs folder for the documentation server\nif [ ! -L /workspaces/${context.projectName || context.name || 'my-project'}/docs/specs ] && [ ! -e /workspaces/${context.projectName || context.name || 'my-project'}/docs/specs ]; then\n    echo "INFO: Creating specs symlink in docs folder..."\n    ln -s ../specs /workspaces/${context.projectName || context.name || 'my-project'}/docs/specs\nfi\n\necho "INFO: Checking documentation server status..."\nif ! pgrep -f 'serve-docs.cjs' >/dev/null; then\n    echo "INFO: Documentation server not running. Starting custom Node server..."\n    if [ -f "/workspaces/${context.projectName || context.name || 'my-project'}/.devcontainer/serve-docs.cjs" ]; then\n        sudo start-stop-daemon --start --background --oknodo --pidfile /var/run/serve-docs.pid --make-pidfile --chuid $(id -un):$(id -gn) --exec "/usr/local/bin/node" -- /workspaces/${context.projectName || context.name || 'my-project'}/.devcontainer/serve-docs.cjs\n    else\n        echo "WARNING: serve-docs.cjs not found, skipping startup."\n    fi\nfi\n`
					: ''
			})
		},
		{
			filePath: '.devcontainer/post-create-setup.sh',
			content: templateEngine.generateFile('devcontainer-post-create-setup-sh', {
				...context,
				// 2.9: the devcontainer setup script only contains tooling for
				// SELECTED capabilities — no kitchen-sink leftovers.
				wranglerSetup: context.capabilities.includes('cloudflare-wrangler')
					? `echo "INFO: Ensuring wrangler directory permissions..."\nmkdir -p "$USER_HOME_DIR/.wrangler"\nsudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.wrangler"\n`
					: '',
				dopplerSetup: context.capabilities.includes('doppler')
					? generateDopplerSetupScript(context)
					: '',
				geminiSetup: context.capabilities.includes('coding-agents')
					? `echo "INFO: Ensuring gemini directory permissions..."\nmkdir -p "$USER_HOME_DIR/.gemini"\nsudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.gemini"\n`
					: '',
				shellSetup: context.capabilities.includes('shell-tools')
					? SHELL_SETUP_SCRIPT.replaceAll(
							'{{projectName}}',
							() => context.projectName || context.name || 'my-project'
						)
					: '',
				pythonSetup: context.capabilities.some((c) => c.startsWith('devcontainer-python'))
					? PYTHON_SETUP_SCRIPT.replaceAll(
							'{{projectName}}',
							() => context.projectName || context.name || 'my-project'
						)
					: '',
				nodeSetup: context.capabilities.some((c) => c.startsWith('devcontainer-node'))
					? NODE_SETUP_SCRIPT.replaceAll(
							'{{projectName}}',
							() => context.projectName || context.name || 'my-project'
						)
					: '',
				gitSafeDirectory: GIT_SAFE_DIR_SCRIPT.replaceAll(
					'{{projectName}}',
					() => context.projectName || context.name || 'my-project'
				),
				gitGithubAuthSetup: context.capabilities.includes('doppler')
					? GIT_GITHUB_AUTH_SETUP_SCRIPT
					: '',
				agySetup: context.capabilities.includes('coding-agents') ? AGY_SETUP_SCRIPT : '',
				// goose setup (recipes + project-selected MCP extensions) runs for
				// coding-agents AND for any capability that registers a goose
				// extension (circleci, sonarcloud, xcode-development, sveltekit) —
				// otherwise a project selecting e.g. circleci would get no circleci
				// extension.
				gooseSetup:
					context.capabilities.includes('coding-agents') ||
					['circleci', 'sonarcloud', 'xcode-development', 'sveltekit'].some((c) =>
						context.capabilities.includes(c)
					)
						? generateGooseSetupScript(context)
						: '',
				playwrightSetup: context.capabilities.includes('playwright') ? PLAYWRIGHT_SETUP_SCRIPT : '',
				gitHooksSetup:
					context.capabilities.includes('code-quality') ||
					context.capabilities.includes('code-quality-python') ||
					context.capabilities.includes('devcontainer-node')
						? `echo "INFO: Installing git pre-commit hooks (lint-staged)..."\n(cd /workspaces/${context.projectName || context.name || 'my-project'} && npx --yes simple-git-hooks) || echo "WARN: Run 'npx simple-git-hooks' to install hooks manually."`
						: '',
				specdagSetup: context.capabilities.includes('spec-kit')
					? `echo "INFO: Installing specdag globally..."\nnpm install -g @japorto100/specdag\n`
					: '',
				socatSetup: context.capabilities.includes('coding-agents')
					? `if ! pgrep -f "socat TCP-LISTEN:9222" > /dev/null; then\n    echo "Setup bridget to access Chrome DevTools Protocol over a secure tunnel..."\n    sudo start-stop-daemon --start --background --pidfile /var/run/socat-9222.pid --make-pidfile --chuid $(id -un):$(id -gn) --exec /usr/bin/socat -- TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:host.docker.internal:9222\nfi\n`
					: '',
				cloudLoginSetup:
					context.capabilities.includes('doppler') ||
					context.capabilities.includes('cloudflare-wrangler') ||
					context.capabilities.includes('google-cloud')
						? `echo -e "\\nINFO: Custom container setup script finished."\necho -e "\\n⚠️  To complete cloud login, run:"\necho "    cd /workspaces/${context.projectName || context.name || 'my-project'} && bash scripts/cloud_login.sh"`
						: 'echo "INFO: Custom container setup script finished."'
			})
		}
	);

	return files;
}

function _getFrameworkConfig(context) {
	const hasSvelteKit = context.capabilities.includes('sveltekit');
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const hasDocker = context.capabilities.includes('docker-container');
	let scripts =
		',\n    "test": "echo \\"Error: no test specified\\" && exit 1",\n    "build": "echo \'No build step required\'"';
	let devDependencies = '';
	let typeField = 'commonjs';
	let overrides = '';

	if (hasSvelteKit) {
		typeField = 'module';
		// Dependency versions mirror the FTN webapp's known-good set. In
		// particular vitest must be >=4.x to pair with vite 8 / the svelte 5
		// plugin (vitest 2.x with vite 7 broke component/route imports).
		overrides =
			',\n  "overrides": {\n    "cookie": "^1.0.2",\n    "@sveltejs/vite-plugin-svelte": "^7.3.0",\n    "vite": "^8.2.2"\n  }';
		scripts =
			',\n    "test": "echo \\"Error: no test specified\\" && exit 1",\n    "dev": "vite dev",\n    "build": "vite build",\n    "preview": "vite preview --host 127.0.0.1",\n    "check": "svelte-kit sync && svelte-check",\n    "check:watch": "svelte-kit sync && svelte-check --watch"';
		devDependencies +=
			'"@sveltejs/kit": "^2.70.3",\n    "@sveltejs/vite-plugin-svelte": "^7.3.0",\n    "svelte": "^5.53.8",\n    "svelte-check": "^4.1.1",\n    "typescript": "^5.7.2",\n    "vite": "^8.2.2"';

		if (hasWrangler) {
			scripts += ',\n    "deploy": "wrangler deploy"';
			devDependencies +=
				',\n    "@sveltejs/adapter-cloudflare": "^7.2.4",\n    "wrangler": "^4.56.0"';
		} else if (hasDocker) {
			devDependencies += ',\n    "@sveltejs/adapter-node": "^5.4.2"';
		} else {
			devDependencies += ',\n    "@sveltejs/adapter-auto": "^3.0.0"';
		}
	} else if (hasWrangler) {
		scripts += ',\n    "deploy": "wrangler deploy"';
		devDependencies += '"wrangler": "^3.57.0"';
		typeField = 'module';
	}

	return { typeField, scripts, devDependencies, overrides };
}

function _addNodeDevcontainerConfig(context, config) {
	if (context.capabilities.includes('devcontainer-node')) {
		config.typeField = 'module';
		if (!config.devDependencies.includes('"vitest"')) {
			config.devDependencies += config.devDependencies
				? ',\n    "vitest": "^4.1.10"'
				: '"vitest": "^4.1.10"';
		}
		// Coverage provider is required whenever vitest is present: generated
		// projects get the same coverage gate as the FTN webapp
		// (thresholds in vite.config.js, enforced by `vitest --coverage` in CI).
		if (!config.devDependencies.includes('"@vitest/coverage-v8"')) {
			config.devDependencies += config.devDependencies
				? ',\n    "@vitest/coverage-v8": "^4.1.11"'
				: '"@vitest/coverage-v8": "^4.1.11"';
		}
		// Replace the placeholder test script with the real vitest runner. The
		// placeholder is injected into every generated package.json up-front, so
		// we must REPLACE it here rather than append (appending produced a
		// duplicate "test" key, which broke JSON consumers).
		config.scripts = config.scripts.replace(
			',\n    "test": "echo \\"Error: no test specified\\" && exit 1"',
			',\n    "test": "vitest --coverage",\n    "test:once": "npx vitest run --changed"'
		);

		// SvelteKit projects ship a component smoke test (renders the home page
		// + exercises the health route) so the enforced coverage gate is
		// satisfiable on a fresh project. Component tests need a DOM environment
		// and jest-dom matchers, so pull in @testing-library/svelte (plus its
		// vite plugin), jsdom and jest-dom.
		if (context.capabilities.includes('sveltekit')) {
			const svelteTestDeps = [
				'"@testing-library/svelte": "^5.2.0"',
				'"@testing-library/jest-dom": "^6.6.0"',
				'"jsdom": "^25.0.1"'
			];
			for (const dep of svelteTestDeps) {
				if (!config.devDependencies.includes(dep.split(':')[0])) {
					config.devDependencies += config.devDependencies ? ',\n    ' + dep : dep;
				}
			}
		}
	}
}

const CODE_QUALITY_DEV_DEPS = [
	'"@eslint/js": "^10.0.1"',
	'"eslint": "^10.8.0"',
	'"eslint-config-prettier": "^10.1.8"',
	'"eslint-plugin-sonarjs": "^4.2.0"',
	'"eslint-plugin-security": "^4.0.1"',
	'"globals": "^17.0.0"',
	'"prettier": "^3.9.6"',
	'"simple-git-hooks": "^2.13.1"',
	'"lint-staged": "^16.4.0"'
];

function _addCodeQualityConfig(context, config) {
	if (!context.capabilities.includes('code-quality')) {
		return;
	}
	const missing = CODE_QUALITY_DEV_DEPS.filter(
		(dep) => !config.devDependencies.includes(dep.split(':')[0])
	);
	if (missing.length > 0) {
		config.devDependencies += (config.devDependencies ? ',\n    ' : '') + missing.join(',\n    ');
	}
	if (!config.scripts.includes('"lint"')) {
		config.scripts += ',\n    "lint": "prettier --check . && eslint ."';
	}
}

export function generatePackageJson(templateEngine, context) {
	const config = _getFrameworkConfig(context);
	_addNodeDevcontainerConfig(context, config);
	_addCodeQualityConfig(context, config);

	if (
		context.capabilities.includes('devcontainer-node') ||
		context.capabilities.includes('cloudflare-wrangler')
	) {
		const content = templateEngine.generateFile('package-json', {
			...context,
			scripts: config.scripts,
			devDependencies: config.devDependencies,
			dependencies: '',
			typeField: config.typeField,
			overrides: config.overrides,
			// Pin a working npm for projects that depend on vitest 4 (injected by
			// devcontainer-node). npm 10's arborist crashes on a fresh install of
			// those projects ('Cannot read properties of null reading edgesOut'),
			// so lock to npm 11 and enforce it via engine-strict (see .npmrc).
			// NOTE: packageManager alone does NOT switch a user's npm (corepack
			// only shims yarn/pnpm) - the devcontainer/CI must ALSO install it.
			npmPins: context.capabilities.includes('devcontainer-node')
				? `  "packageManager": "npm@11.19.1",\n  "engines": {\n    "npm": ">=11 <12"\n  },\n`
				: '',
			projectName: context.projectName || context.name || 'my-project'
		});
		return {
			filePath: 'package.json',
			content
		};
	}
}

/**
 * Generates a project .npmrc enforcing the pinned npm version for Node
 * projects that run a fresh install in a devcontainer (devcontainer-node).
 * Combined with the packageManager/engines pin this prevents the npm 10
 * arborist 'edgesOut' crash on vitest-4 projects. Returns null for projects
 * that don't need it.
 */
export function generateNpmrcFile(context) {
	if (!context.capabilities.includes('devcontainer-node')) {
		return null;
	}
	return {
		filePath: '.npmrc',
		// engine-strict makes npm refuse to install under a mismatched npm
		// (e.g. the npm 10 bundled with Node 22), failing fast with a clear
		// EBADENGINE instead of silently crashing mid-resolution.
		content: 'engine-strict=true\n'
	};
}

/**
 * Generates the Python project scaffold for a devcontainer-python project:
 * a standard src-layout pyproject.toml plus minimal src/<pkg>/ and tests/
 * skeletons (memo §2.3). Returns an array of file objects; an empty array when
 * no Python devcontainer is selected.
 *
 * Fixes over the previous scaffold:
 * - real description (no "Generated by Project Generation Tool").
 * - pytest/ruff move to `[project.optional-dependencies] dev` (dev extras,
 *   not runtime deps) -> `pip install -e ".[dev]"` works in CI + devcontainer.
 * - `[tool.setuptools.packages.find] where = ["src"]` (src layout).
 * - standard `testpaths = ["tests"]` with `test_*.py` (no nonstandard
 *   `python_files = "*.test.py"`).
 * - scaffolds src/<pkg>/__init__.py + __main__.py and tests/test_smoke.py so
 *   `python -m <pkg>`, ruff and pytest all work with zero hand edits.
 */
export function generatePyProjectToml(context) {
	const hasPython = context.capabilities.some((c) => c.startsWith('devcontainer-python'));
	if (!hasPython) return [];

	const hasDagster = context.capabilities.includes('dagster');
	const projectName = context.projectName || context.name || 'my-project';
	const distName = toDistributionName(projectName);
	const pkgName = toPythonPackageName(projectName);
	const description = (
		context.description || `A ${projectName} project generated with genproj`
	).replace(/"/g, '\\"');

	// Round-2 fix 2: `pythonDependencies` (docker-container config) are the
	// app's runtime deps — the generator can't guess them, so they are
	// config-driven like aptPackages/envVars. Emitted into [project]
	// dependencies; dev tools (pytest, ruff) stay in the dev extra.
	const pythonDependencies = Array.isArray(
		context.configuration?.['docker-container']?.pythonDependencies
	)
		? context.configuration['docker-container'].pythonDependencies
		: [];

	const deps = [...pythonDependencies];
	if (hasDagster) {
		deps.push('dagster', 'dagster-webserver');
	}
	const dependencies =
		deps.length > 0
			? '[\n' + deps.map((d) => `    "${String(d).replace(/"/g, '\\"')}"`).join(',\n') + '\n]'
			: '[]';

	const pyproject = `[project]
name = "${distName}"
version = "0.1.0"
description = "${description}"
readme = "README.md"
requires-python = ">=3.11"
dependencies = ${dependencies}

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "ruff>=0.4"
]

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]

[tool.ruff]
src = ["src", "tests"]
`;

	const initPy = `"""${projectName} package."""

__version__ = "0.1.0"
`;

	const mainPy = `"""Default module entry point (python -m ${pkgName}).

Override the container command via the genproj docker-container "command"
configuration option (or "entrypoint") when your application needs a custom
entry point.
"""

import sys


def main() -> int:
    print(f"{__package__} is installed and importable.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
`;

	const smokeTest = `"""Smoke test: the src-layout package installs and imports cleanly."""


def test_package_imports():
    import ${pkgName}

    assert ${pkgName}.__version__
`;

	// Round-3 fix (memo genproj-fixes-round3): when docker-container is
	// configured with a custom `command` or `entrypoint`, the app provides its
	// own entry point — do NOT emit the scaffold `__main__.py`. Regenerating a
	// project whose app had taken over `__main__.py` previously clobbered the
	// real entrypoint with this placeholder (silent breakage: `python -m <pkg>`
	// printed "installed and importable" and exited, killing the MCP stdio
	// server behind mcpo). Fresh projects without a custom command/entrypoint
	// keep the placeholder.
	const dockerConfig = context.configuration?.['docker-container'] || {};
	const hasCustomEntrypoint =
		(Array.isArray(dockerConfig.command) && dockerConfig.command.length > 0) ||
		(Array.isArray(dockerConfig.entrypoint) && dockerConfig.entrypoint.length > 0);

	return [
		{ filePath: 'pyproject.toml', content: pyproject },
		{ filePath: `src/${pkgName}/__init__.py`, content: initPy },
		...(hasCustomEntrypoint ? [] : [{ filePath: `src/${pkgName}/__main__.py`, content: mainPy }]),
		{ filePath: 'tests/test_smoke.py', content: smokeTest }
	];
}

/**
 * Generates the root README.md (memo §2.5). Language-aware quickstart: pip
 * install -e ".[dev]" + pytest/ruff for Python, npm install + dev for Node.
 * Points to deploy/README.md when docker-container is selected.
 * @param {Object} context - Generation context
 * @returns {Object} README file object
 */
export function generateReadmeFile(context) {
	const projectName = context.projectName || context.name || 'my-project';
	const description = context.description || `A ${projectName} project generated with genproj`;
	const hasDocker = context.capabilities.includes('docker-container');
	const language = resolveLanguage(context);

	const capabilitiesSection =
		context.capabilities && context.capabilities.length > 0
			? `## Capabilities

This project includes the following capabilities:

${context.capabilities
	.map((id) => {
		const cap = capabilities.find((c) => c.id === id);
		return cap ? `- **${cap.name}**: ${cap.description}` : `- ${id}`;
	})
	.join('\n')}
`
			: '';

	const quickstart =
		language === 'python'
			? `## Setup

1. Clone the repository
2. Create a virtualenv and install the package with dev extras:

   \`\`\`bash
   python3 -m venv .venv
   . .venv/bin/activate
   pip install -e ".[dev]"
   \`\`\`

3. Run the checks:

   \`\`\`bash
   ruff check src tests
   pytest -v
   \`\`\`
`
			: `## Setup

1. Clone the repository
2. Install dependencies:

   \`\`\`bash
   npm install
   \`\`\`

3. Run the dev server:

   \`\`\`bash
   npm run dev
   \`\`\`
`;

	const deploySection = hasDocker
		? `## Deployment

See \`deploy/README.md\` for the deployment runbook (CircleCI -> GHCR ->
Watchtower -> Docker host). Deploy with:

\`\`\`bash
docker compose up -d
\`\`\`
`
		: '';

	// Round-5 (memo genproj-fixes-round5): document the one-time doppler setup
	// (the CLI is installed in the devcontainer; first use must link it).
	// Round-7 (memo Gi8CN7XqpH6CxFAc2YUJsK): document env>yaml precedence and
	// manual provisioning so a wrong-project resolution is never a mystery.
	// Doppler scaling memo (memos/doppler-scaling): repos default to the shared
	// `common` project; projectStrategy: 'new' opts into a dedicated project.
	const dopplerSection = context.capabilities.includes('doppler')
		? (() => {
				const { project: dopplerProject, strategy } = resolveDopplerTarget(context);
				const provisioning =
					strategy === 'new'
						? `This project uses Doppler for secrets in its own \`${dopplerProject}\` project.
First use (links the project and \`dev\` config):

\`\`\`bash
doppler setup --project ${dopplerProject} --config dev
\`\`\`

If the project does not exist in your Doppler workplace yet, create it first:

\`\`\`bash
doppler projects create ${dopplerProject}
doppler configs create dev --project ${dopplerProject}
\`\`\``
						: `This project uses Doppler for secrets from the shared \`common\` project
(config \`dev\`) — no per-repo Doppler project is created. First use (links
the shared project and \`dev\` config):

\`\`\`bash
doppler setup --project common --config dev
\`\`\`

If your repo needs app-specific secrets that shouldn't live in the shared
\`common\` project, regenerate it with the doppler capability set to
\`projectStrategy: "new"\` to get a dedicated project.`;
				return `## Doppler

${provisioning}

The Doppler CLI is installed in the devcontainer — it must be on PATH for the
VS Code extension and \`doppler run\` to work. Auth is persisted via the host
\`~/.doppler\` bind-mount.

### Env-var precedence (read this if \`doppler run\` hits the wrong project)

Doppler resolves its target as **environment variables > \`doppler.yaml\` >
\`~/.doppler\` scoped config**. If your shell — or the session that launched
the devcontainer (e.g. an agent runtime) — exports \`DOPPLER_PROJECT\` /
\`DOPPLER_CONFIG\` / \`DOPPLER_ENVIRONMENT\`, those silently override this
repo's \`doppler.yaml\` and every \`doppler\` command targets the wrong
project. The devcontainer's post-create setup pins this repo's context
(\`${dopplerProject}\`/\`dev\`) in \`~/.bashrc\` and \`~/.zshrc\` and warns at
setup if resolution still mismatches. To force the correct context manually:

\`\`\`bash
unset DOPPLER_PROJECT DOPPLER_CONFIG DOPPLER_ENVIRONMENT
doppler setup --no-interactive --project ${dopplerProject} --config dev
\`\`\`
`;
			})()
		: '';

	const content = `# ${projectName}

${description}

${capabilitiesSection}
${quickstart}
${dopplerSection}
${deploySection}
## Generated by genproj

This project was generated using the genproj tool.
`;

	return {
		filePath: 'README.md',
		// Empty optional sections (doppler/deploy) leave 2+ blank lines behind;
		// collapse to a single blank line so prettier --check passes.
		content: content
			.replace(/\n{3,}/g, '\n\n')
			.replace(/^\n+/, '')
			.replace(/\n+$/, '\n')
	};
}

function pushWranglerFiles(templateEngine, context, files, projectName, compatibilityDate) {
	const hasDoppler = context.capabilities.includes('doppler');
	const hasSvelteKit = context.capabilities.includes('sveltekit');
	// Doppler scaling memo: the doppler project is `common` by default.
	const dopplerProject = resolveDopplerTarget(context).project;
	const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
	const isRustWorker = wranglerConfig.workerType === 'rust';

	let mainEntryPoint = 'src/index.js';
	if (hasSvelteKit) {
		mainEntryPoint = '.svelte-kit/cloudflare/_worker.js';
	} else if (isRustWorker) {
		mainEntryPoint = 'build/worker/index.js';
	}

	const assetsConfig = hasSvelteKit
		? ',\n\t"assets": {\n\t\t"binding": "ASSETS",\n\t\t"directory": ".svelte-kit/cloudflare"\n\t}'
		: '';

	const buildConfig = isRustWorker
		? ',\n\t"build": {\n\t\t"command": "cargo install -q worker-build && worker-build --release"\n\t}'
		: '';

	files.push({
		filePath: 'scripts/run-wrangler-dev.sh',
		content: templateEngine.generateFile('scripts-run-wrangler-dev-sh', {
			...context,
			projectName,
			dopplerProject
		})
	});

	if (hasDoppler) {
		files.push(
			{
				filePath: 'wrangler.template.jsonc',
				content: templateEngine.generateFile('wrangler-template-jsonc', {
					...context,
					projectName,
					compatibilityDate,
					mainEntryPoint,
					assetsConfig,
					buildConfig
				})
			},
			{
				filePath: 'scripts/setup-wrangler-config.sh',
				content: templateEngine.generateFile('scripts-setup-wrangler-config-sh', context)
			}
		);
	} else {
		files.push({
			filePath: 'wrangler.jsonc',
			content: templateEngine.generateFile('wrangler-jsonc', {
				...context,
				projectName,
				compatibilityDate,
				mainEntryPoint,
				assetsConfig,
				buildConfig
			})
		});
	}
}

export function generateCloudLoginFiles(templateEngine, context) {
	const files = [];
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const hasDoppler = context.capabilities.includes('doppler');
	const hasGoogleCloud = context.capabilities.includes('google-cloud');
	const hasDevcontainer = context.capabilities.some((c) => c.startsWith('devcontainer-'));

	if (!hasWrangler && !hasDoppler && !hasGoogleCloud && !hasDevcontainer) return files;

	const projectName = context.projectName || context.name || 'my-project';
	const compatibilityDate = new Date().toISOString().split('T')[0];

	// Doppler scaling memo (memos/doppler-scaling): the doppler project a
	// repo points at is `common` by default (projectStrategy: 'new' opts into
	// a dedicated project). All doppler CLI references in the login/setup
	// scripts must use the RESOLVED project, not the repo name.
	const dopplerProject = resolveDopplerTarget(context).project;

	// cloud_login.sh
	const dopplerLogin = hasDoppler
		? DOPPLER_LOGIN_SCRIPT.replaceAll('{{dopplerProject}}', () => dopplerProject)
		: '';

	const wranglerLogin = hasWrangler
		? WRANGLER_LOGIN_SCRIPT.replaceAll('{{dopplerProject}}', () => dopplerProject)
		: '';

	const setupWrangler =
		hasDoppler && hasWrangler
			? SETUP_WRANGLER_SCRIPT.replaceAll('{{dopplerProject}}', () => dopplerProject)
			: '';

	const googleCloudLogin = hasGoogleCloud
		? `gcloud auth login && gcloud config set project ${projectName}`
		: '';

	const tailscaleLogin = hasDevcontainer
		? `# Tailscale login\nif command -v tailscale &> /dev/null; then\n  if ! pgrep -x tailscaled > /dev/null; then\n    echo "INFO: Starting Tailscale daemon..."\n    sudo tailscaled --state=/var/lib/tailscale/tailscaled.state > /dev/null 2>&1 &\n    sleep 2\n  fi\n  if ! sudo tailscale status &> /dev/null; then\n    echo "INFO: Logging into Tailscale..."\n    sudo tailscale up --hostname=${projectName}\n  else\n    echo "✅ Already logged in to Tailscale."\n  fi\nfi`
		: '';

	files.push({
		filePath: 'scripts/cloud_login.sh',
		content: templateEngine.generateFile('scripts-cloud-login-sh', {
			...context,
			tailscaleLogin,
			dopplerLogin,
			wranglerLogin,
			setupWrangler,
			googleCloudLogin
		})
	});

	if (hasWrangler) {
		pushWranglerFiles(templateEngine, context, files, projectName, compatibilityDate);
	}

	if (hasWrangler && hasDoppler) {
		files.push({
			filePath: 'scripts/sync-doppler-secrets.sh',
			content: templateEngine.generateFile('scripts-sync-doppler-secrets-sh', {
				...context,
				projectName,
				dopplerProject
			})
		});
	}

	return files;
}

export function generateGitignoreFile(templateEngine, context) {
	const hasDoppler = context.capabilities.includes('doppler');
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const hasPython = context.capabilities.some((c) => c.startsWith('devcontainer-python'));
	const hasJava = context.capabilities.some((c) => c.startsWith('devcontainer-java'));
	const hasDagster = context.capabilities.includes('dagster');

	let wranglerIgnore = '';
	if (hasWrangler) {
		wranglerIgnore = '\n# Cloudflare Wrangler\n.wrangler';
		if (hasDoppler) {
			wranglerIgnore += '\nwrangler.jsonc';
		}
	}

	let pythonIgnore = hasPython
		? '\n# Python\n__pycache__/\n*.py[cod]\n*$py.class\n.venv\nvenv/\n*.manifest\n*.egg-info/'
		: '';

	if (hasDagster) {
		pythonIgnore += '\n\n# Dagster\n.tmp_dagster*';
	}
	const javaIgnore = hasJava
		? '\n# Java\n*.class\n*.log\n*.ctxt\n.mtj.tmp/\n*.jar\n*.war\n*.nar\n*.ear\n*.zip\n*.tar.gz\n*.rar\ntarget/'
		: '';

	const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
	const isRustWorker = hasWrangler && wranglerConfig.workerType === 'rust';
	const hasRust =
		context.capabilities.some((c) => c.startsWith('devcontainer-rust')) || isRustWorker;
	const rustIgnore = hasRust
		? '\n# Rust\ntarget/\n**/target/\nCargo.lock\n.rustc_info.json\n**/.rustc_info.json'
		: '';

	return {
		filePath: '.gitignore',
		content: templateEngine.generateFile('gitignore', {
			...context,
			wranglerIgnore,
			pythonIgnore,
			javaIgnore,
			rustIgnore
		})
	};
}

export function generatePrettierIgnoreFile() {
	// Generated infra files are machine output (or build templates) and are
	// excluded from `prettier --check` so a generated project's lint step
	// passes. `.agents/` holds MCP config + proxy scripts; the wrangler
	// template JSONC is consumed by a setup script, not hand-edited.
	return {
		filePath: '.prettierignore',
		content: `# Generated infra files (machine output) excluded from prettier --check.
.agents/
coverage/
wrangler.template.jsonc
`
	};
}

export function generateVscodeSettingsFile(templateEngine, context) {
	const hasPython =
		Array.isArray(context.capabilities) &&
		context.capabilities.some((c) => c.startsWith('devcontainer-python'));

	const content = templateEngine.generateFile('vscode-settings-json', {
		...context,
		projectName: context.projectName || context.name || 'my-project'
	});

	let settings;
	try {
		settings = JSON.parse(content);
		if (!hasPython) {
			delete settings['python.defaultInterpreterPath'];
		}
		return {
			filePath: '.vscode/settings.json',
			content: `${JSON.stringify(settings, undefined, 2)}\n`
		};
	} catch {
		// Fallback for tests that mock template engine to return non-JSON
		return {
			filePath: '.vscode/settings.json',
			content
		};
	}
}

export function generateVscodeExtensionsFile() {
	const content = `${JSON.stringify(
		{
			recommendations: ['pcassidy75.tmux-integrated', 'vsc-mermaid.mermaid-preview']
		},
		undefined,
		2
	)}\n`;
	return {
		filePath: '.vscode/extensions.json',
		content
	};
}

export function generateAgentRulesFiles() {
	const gitGuidelines = `# Git, Code Review, and Deployment Rules

- **Commit Changes**: You may run \`git commit\` to package your work. Use clear, descriptive commit messages and keep commits atomic (logical groups of related changes).
- **Push Changes**: You may run \`git push\` to push commits to the remote. Follow the repository's branch workflow (a \`fix/\`/\`feature/\` branch + PR, or pushing directly where that is the convention).
- **Checks are your safety net**: This repo runs CI/code checks, so prefer to run the relevant local checks/tests before pushing; CI validates the rest.
- **No Deployments**: Never run \`wrangler deploy\`, \`npm run deploy\`, or any other deployment command to push code to the production/default environment.
`;

	const testingGuidelines = `# Testing Guidelines

## Run Focused Tests on Changed Files Only

When running tests, always scope them to the files that have actually changed rather than running the full test suite. This keeps feedback fast and avoids noise from unrelated tests.

### How to identify changed files

Use \`git\` to find what has changed relative to the working directory:

\`\`\`bash
# Unstaged + staged changes (everything modified vs HEAD)
git diff --name-only HEAD
\`\`\`

Then map each changed source file to its corresponding test file:

| Source file      | Test file             |
| ---------------- | --------------------- |
| \`src/browser.ts\` | \`src/browser.test.ts\` |
| \`src/index.ts\`   | \`src/index.test.ts\`   |

### Running focused tests with Vitest

Pass the test file(s) directly to Vitest to limit the run:

\`\`\`bash
# Single test file
npx vitest run src/browser.test.ts

# Multiple test files
npx vitest run src/browser.test.ts src/index.test.ts

# With coverage for the specific files only
npx vitest run --coverage src/browser.test.ts
\`\`\`

### Full suite

Only run the full suite (\`npm test\`) when:

- You have changed shared utilities used by many tests, or
- You are doing a final pre-commit validation of a large change set.
`;

	return [
		{ filePath: '.agents/.rules/git_guidelines.md', content: gitGuidelines },
		{ filePath: '.agents/.rules/testing_guidelines.md', content: testingGuidelines }
	];
}

export function generateCargoToml(context) {
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
	const isRustWorker = hasWrangler && wranglerConfig.workerType === 'rust';

	if (!isRustWorker) return;

	const projectName = context.projectName || context.name || 'my-project';
	const content = `[package]
name = "${projectName}"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
worker = { version = "0.8.5", features = ["d1"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = "s"
lto = true
`;

	return {
		filePath: 'worker/Cargo.toml',
		content
	};
}

export function generateRustWorkerLibrary(context) {
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
	const isRustWorker = hasWrangler && wranglerConfig.workerType === 'rust';

	if (!isRustWorker) return;

	const content = `use worker::*;

#[event(fetch)]
pub async fn main(req: Request, env: Env, ctx: Context) -> Result<Response> {
    Response::ok("Hello, World!")
}
`;

	return {
		filePath: 'worker/src/lib.rs',
		content
	};
}

/**
 * Collapses runs of blank lines in generated YAML to a single blank line and
 * strips leading/trailing blank lines, matching what `prettier --check`
 * expects (prettier treats 2+ consecutive blank lines in YAML as a style
 * error). The CircleCI template composes sections via blank-line separators,
 * so empty optional sections can otherwise leave 2-3 blank lines behind.
 * @param {string} content - Raw generated YAML content
 * @returns {string} Normalized YAML content
 */
export function normalizeYamlBlankLines(content) {
	return content
		.replace(/\n{3,}/g, '\n\n')
		.replace(/^\n+/, '')
		.replace(/\n+$/, '\n');
}

export async function generateAllFiles(context) {
	const templateEngine = new TemplateEngine();
	await templateEngine.initialize();

	const developmentContainerCapabilities = context.capabilities.filter((c) =>
		c.startsWith('devcontainer-')
	);
	const otherCapabilities = context.capabilities.filter((c) => !c.startsWith('devcontainer-'));

	const cloudLoginFiles = generateCloudLoginFiles(templateEngine, context);

	const otherFiles = [
		generatePackageJson(templateEngine, context),
		...generatePyProjectToml(context),
		generateCargoToml(context),
		generateRustWorkerLibrary(context),
		generateGitignoreFile(templateEngine, context),
		generatePrettierIgnoreFile(),
		generateVscodeSettingsFile(templateEngine, context),
		generateVscodeExtensionsFile(),
		generateNpmrcFile(context),
		// 2.5: root README (language-aware quickstart).
		generateReadmeFile(context)
	].filter(Boolean);

	let allGeneratedFiles = [
		...collectNonDevelopmentContainerFiles(templateEngine, context, otherCapabilities),
		...generateMergedDevelopmentContainerFiles(
			templateEngine,
			context,
			developmentContainerCapabilities
		),
		...cloudLoginFiles,
		...otherFiles,
		...generateAgentRulesFiles()
	];

	if (context.capabilities.includes('devcontainer-node')) {
		// Filter out any template-generated vite.config.js
		allGeneratedFiles = allGeneratedFiles.filter((f) => f.filePath !== 'vite.config.js');
		allGeneratedFiles.push(generateViteConfigFile(context));
	}

	// Generated SvelteKit projects ship a smoke test so the coverage gate in
	// vite.config.js is satisfiable on a fresh project (otherwise vitest fails
	// with "no test files found" and 0% coverage on every first build).
	if (
		context.capabilities.includes('devcontainer-node') &&
		context.capabilities.includes('sveltekit')
	) {
		// The /health route is generated for docker-container SvelteKit apps
		// (added later in this function), so derive its presence from the
		// capabilities rather than scanning the file list.
		const hasHealth =
			context.capabilities.includes('docker-container') &&
			context.capabilities.includes('sveltekit');
		allGeneratedFiles.push({
			filePath: 'src/test-setup.js',
			content: 'import "@testing-library/jest-dom/vitest";\n'
		});
		allGeneratedFiles.push({
			filePath: 'tests/smoke.test.js',
			content: buildSveltekitSmokeTest(hasHealth)
		});
	}

	if (context.capabilities.includes('sonarcloud')) {
		const sonarCloudFile = allGeneratedFiles.find((f) => f.filePath === '.sonarcloud.properties');
		const sonarContent = sonarCloudFile ? sonarCloudFile.content : '';
		allGeneratedFiles.push({ filePath: 'sonar-project.properties', content: sonarContent });
	}

	// 2.2: docker-container SvelteKit apps need a /health route for the
	// container HEALTHCHECK and the Homepage widget.
	if (
		context.capabilities.includes('sveltekit') &&
		context.capabilities.includes('docker-container')
	) {
		allGeneratedFiles.push({
			filePath: 'src/routes/health/+server.js',
			content: HEALTH_ROUTE_SOURCE
		});
	}

	return allGeneratedFiles;
}

/**
 * Builds the smoke test shipped with generated SvelteKit projects. It renders
 * the home page and (when present) exercises the /health route, giving the
 * generated project real tests to satisfy the coverage gate.
 * @param {boolean} hasHealth - Whether a src/routes/health/+server.js is generated
 * @returns {string} The smoke test source
 */
export function buildSveltekitSmokeTest(hasHealth) {
	// Must be Prettier-clean on generation (double quotes, 2-space indent), since
	// the CircleCI lint step runs `prettier --check .`.
	//
	// Renders the generated home page (covers its component code so the
	// enforced coverage gate passes) and, when present, exercises the /health
	// route. Requires the jsdom environment + svelteTesting() plugin from
	// vite.config.js and the jest-dom matchers in src/test-setup.js.
	const healthImport = hasHealth ? 'import { GET } from "../src/routes/health/+server.js";\n' : '';
	const healthTest = hasHealth
		? `
  it("health endpoint returns ok", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });`
		: '';
	return `import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import Page from "../src/routes/+page.svelte";
${healthImport}
describe("generated app smoke test", () => {
  it("renders the home page with the initial counter", () => {
    render(Page);
    expect(screen.getByText("Welcome to SvelteKit")).toBeInTheDocument();
    expect(screen.getByRole("button").textContent).toContain("0");
  });
  it("increments the counter on click", () => {
    render(Page);
    const btn = screen.getByRole("button");
    fireEvent.click(btn);
    expect(btn.textContent).toContain("1");
  });${healthTest}
});
`;
}

export function generateViteConfigFile(context) {
	const hasSvelteKit = context.capabilities.includes('sveltekit');

	// Coverage is reported (lcov feeds SonarCloud) and thresholds ARE enforced:
	// generated SvelteKit projects ship a smoke test that satisfies them (see
	// buildSveltekitSmokeTest). Branches stays at 50 because a placeholder
	// counter page inherently caps there; statements/functions/lines are gated
	// at 80. Users don't have to remember to re-enable the gate.
	const coverageConfig = `    coverage: {
      reporter: ["lcov", "text"],
      thresholds: {
        statements: 80,
        branches: 50,
        functions: 80,
        lines: 80,
      },
    },`;

	const testConfigSvelte = `  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test-setup.js"],
    reporter: ["default", "junit"],
    outputFile: {
      junit: "./reports/junit.xml",
    },
${coverageConfig}
  },`;

	const testConfigVanilla = `  test: {
    reporter: ["default"],
${coverageConfig}
  },`;

	let content;

	if (hasSvelteKit) {
		content = `import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
${testConfigSvelte}
});
`;
	} else {
		content = `import { defineConfig } from "vitest/config";

export default defineConfig({
${testConfigVanilla}
});
`;
	}

	return {
		filePath: 'vite.config.js',
		content
	};
}
