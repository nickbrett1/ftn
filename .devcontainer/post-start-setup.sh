#!/bin/bash
# This file is executed every time the dev container starts up or resumes.
# It automatically checks if tailscaled, sshd, and socat are running and starts them if not.

echo "INFO: Checking SSH service status..."
if ! pgrep -x sshd >/dev/null; then
    echo "INFO: SSH service not running. Starting it..."
    sudo service ssh restart
fi

echo "INFO: Checking Tailscale status..."
if ! pgrep -x tailscaled >/dev/null; then
    echo "INFO: Tailscale daemon not running. Starting it..."
    sudo start-stop-daemon --start --background --oknodo --pidfile /var/run/tailscaled.pid --make-pidfile --exec /usr/sbin/tailscaled -- --state=/var/lib/tailscale/tailscaled.state
fi

echo "INFO: Checking socat tunnel status..."
if ! pgrep -f 'socat TCP-LISTEN:9222' >/dev/null; then
    echo "INFO: socat tunnel not running. Starting it..."
    sudo start-stop-daemon --start --background --pidfile /var/run/socat-9222.pid --make-pidfile --chuid node:node --exec /usr/bin/socat -- TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:host.docker.internal:9222
fi

# Ensure symlink for specs exists in docs folder for the documentation server
if [ ! -L /workspaces/ftn/docs/specs ] && [ ! -e /workspaces/ftn/docs/specs ]; then
    echo "INFO: Creating specs symlink in docs folder..."
    ln -s ../specs /workspaces/ftn/docs/specs
fi

echo "INFO: Checking documentation server status..."
if ! pgrep -f 'serve-docs.cjs' >/dev/null; then
    echo "INFO: Documentation server not running. Starting custom Node server..."
    if [ -f "/workspaces/ftn/.devcontainer/serve-docs.cjs" ]; then
        sudo start-stop-daemon --start --background --oknodo --pidfile /var/run/serve-docs.pid --make-pidfile --chuid node:node --exec "/usr/local/bin/node" -- /workspaces/ftn/.devcontainer/serve-docs.cjs
    else
        echo "WARNING: serve-docs.cjs not found, skipping startup."
    fi
fi

# Re-sync shell config from the repo on every start/resume so changes to
# .devcontainer/.zshrc (e.g. the goose() Doppler wrapper) reach the live
# container even when it was created before the change was committed.
if [ -f "/workspaces/ftn/.devcontainer/.zshrc" ]; then
    echo "INFO: Re-syncing .zshrc from repo to $HOME/.zshrc"
    cp -f "/workspaces/ftn/.devcontainer/.zshrc" "$HOME/.zshrc"
    chown "$(id -u):$(id -g)" "$HOME/.zshrc" 2>/dev/null || true
fi

echo "INFO: Syncing goose recipes..."
if [ -d "$HOME/.config/goose/recipes/.git" ]; then
    (cd "$HOME/.config/goose/recipes" && git pull --ff-only --quiet) \
        || echo "WARN: goose recipes update failed (offline?), keeping existing copy"
else
    echo "WARN: goose recipes not cloned yet; run goose-config-bootstrap.sh to install."
fi

echo "INFO: Checking goose version..."
if command -v goose >/dev/null 2>&1; then
    # `goose update` downloads the whole release even when the installed build
    # is already current (~55MB, ~10s on every start). Ask GitHub for the
    # latest stable tag and update only when it differs. Any failure here
    # (offline, rate-limited, unparseable, no curl) leaves `latest` empty and
    # falls back to updating, which is the old behaviour.
    installed="$(goose --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"
    latest="$(curl -fsSL --max-time 10 https://api.github.com/repos/block/goose/releases/latest 2>/dev/null \
        | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"v\{0,1\}\([^"]*\)".*/\1/p' | head -n1)"
    if [ -n "$installed" ] && [ "$installed" = "$latest" ]; then
        echo "INFO: goose $installed is already the latest stable release - skipping update."
    else
        echo "INFO: goose ${installed:-unknown} -> ${latest:-latest} - updating..."
        goose update || echo "WARN: goose update failed, keeping current version"
    fi
else
    echo "WARN: goose not found, skipping update"
fi

echo "INFO: Checking the container agent..."
if [ -x "/workspaces/ftn/scripts/agent-dev.sh" ]; then
    "/workspaces/ftn/scripts/agent-dev.sh" start || true
else
    echo "WARN: scripts/agent-dev.sh not found, skipping the container agent"
fi

echo "INFO: Services check/startup complete."

