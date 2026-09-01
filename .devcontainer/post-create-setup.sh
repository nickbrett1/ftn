#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "INFO: Starting custom container setup script..."

echo "INFO: Restoring or backing up SSH host keys..."
sudo mkdir -p /var/lib/tailscale/ssh
if [ -n "$(ls -A /var/lib/tailscale/ssh/ssh_host_* 2>/dev/null)" ]; then
    echo "INFO: Restoring SSH host keys from /var/lib/tailscale/ssh..."
    sudo cp -f /var/lib/tailscale/ssh/ssh_host_* /etc/ssh/
    sudo chmod 600 /etc/ssh/ssh_host_*_key
    sudo chmod 644 /etc/ssh/ssh_host_*_key.pub 2>/dev/null || true
else
    echo "INFO: Backing up SSH host keys to /var/lib/tailscale/ssh..."
    sudo ssh-keygen -A || true
    sudo cp -f /etc/ssh/ssh_host_* /var/lib/tailscale/ssh/
fi

echo "INFO: Ensuring SSH service is running..."
sudo service ssh restart

CURRENT_USER=$(whoami)
USER_HOME_DIR="$HOME"

echo "INFO: Creating Oh My Zsh custom directories..."
mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins"

echo "INFO: Initializing Antigravity CLI global settings..."
mkdir -p "$USER_HOME_DIR/.agy"
printf '{\n  "selectedAuthType": "oauth-personal",\n  "general": {\n    "sessionRetention": {\n      "enabled": true,\n      "maxAge": "30d",\n      "warningAcknowledged": true\n    }\n  },\n  "ide": {\n    "hasSeenNudge": true,\n    "enabled": true\n  }\n}\n' > "$USER_HOME_DIR/.agy/settings.json"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.agy"

echo "INFO: Installing agy-telemetry hook..."
curl -fsSL https://raw.githubusercontent.com/nickbrett1/agy-telemetry/main/install.py | python3

echo "INFO: Ensuring wrangler directory permissions..."
mkdir -p "$USER_HOME_DIR/.wrangler"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.wrangler"

echo "INFO: Ensuring doppler directory permissions..."
mkdir -p "$USER_HOME_DIR/.doppler"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.doppler"

echo "INFO: Ensuring gemini directory permissions..."
mkdir -p "$USER_HOME_DIR/.gemini"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.gemini"

if [ -f "/workspaces/ftn/.devcontainer/.zshrc" ]; then
    echo "INFO: Copying .zshrc to $USER_HOME_DIR/.zshrc"
    cp "/workspaces/ftn/.devcontainer/.zshrc" "$USER_HOME_DIR/.zshrc"
    sudo chown "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.zshrc"
else
    echo "INFO: /workspaces/ftn/.devcontainer/.zshrc not found, skipping copy."
fi

if [ -f "/workspaces/ftn/.devcontainer/.p10k.zsh" ]; then
    echo "INFO: Copying .p10k.zsh to $USER_HOME_DIR/.p10k.zsh"
    cp "/workspaces/ftn/.devcontainer/.p10k.zsh" "$USER_HOME_DIR/.p10k.zsh"
    sudo chown "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.p10k.zsh"
else
    echo "INFO: /workspaces/ftn/.devcontainer/.p10k.zsh not found, skipping copy."
fi

if [ -f "/workspaces/ftn/.devcontainer/.tmux.conf" ]; then
    echo "INFO: Copying .tmux.conf to $USER_HOME_DIR/.tmux.conf"
    cp "/workspaces/ftn/.devcontainer/.tmux.conf" "$USER_HOME_DIR/.tmux.conf"
    sudo chown "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.tmux.conf"
else
    echo "INFO: /workspaces/ftn/.devcontainer/.tmux.conf not found, skipping copy."
fi


echo "INFO: Installing specdag globally..."
npm install -g @japorto100/specdag

echo "INFO: Installing Playwright and its Chromium dependencies..."
npx --yes playwright install --with-deps chromium
echo "INFO: Playwright Chromium installation complete."

echo "INFO: Configuring git safe directory..."
git config --global --add safe.directory /workspaces/ftn

echo "INFO: Configuring GitHub auth over SSH (no PAT)..."
# genproj-github-auth (SSH-first): GitHub remotes authenticate via an SSH key
# supplied by the host bind-mount (~/.ssh) or the forwarded SSH agent. No PAT
# is ever written to ~/.gitconfig or remote URLs.
KEY_COPIED=""
if [ -n "${SSH_AUTH_SOCK:-}" ] && command -v ssh-add &> /dev/null && ssh-add -l >/dev/null 2>&1; then
    echo "INFO: GitHub auth via forwarded SSH agent (${SSH_AUTH_SOCK})."
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
if [ -n "$KEY_COPIED" ]; then
    git config --global core.sshCommand "ssh -i $KEY_COPIED -o IdentitiesOnly=yes"
fi
if git config --global --get-regexp '^url\.git@github\.com:.*\.insteadof' >/dev/null 2>&1; then
    echo "INFO: GitHub SSH rewrite already configured; leaving in place."
elif ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=8 -T git@github.com 2>&1 | grep -qi "successfully authenticated"; then
    git config --global url."git@github.com:".insteadOf "https://github.com/"
    echo "INFO: GitHub remotes now use SSH (git@github.com:)."
else
    echo "WARN: No working SSH key/agent found for github.com."
    echo "      Add an SSH public key at https://github.com/settings/keys,"
    echo "      load it on the host (ssh-add --apple-use-keychain), and rebuild."
fi

echo "INFO: Installing git pre-commit hooks (simple-git-hooks + lint-staged)..."
(cd /workspaces/ftn/webapp && npx --yes simple-git-hooks) || echo "WARN: Could not install git hooks, run 'cd webapp && npx --yes simple-git-hooks' manually."

if ! pgrep -f "socat TCP-LISTEN:9222" > /dev/null; then
    echo "Setup bridget to access Chrome DevTools Protocol over a secure tunnel..."
    sudo start-stop-daemon --start --background --pidfile /var/run/socat-9222.pid --make-pidfile --chuid node:node --exec /usr/bin/socat -- TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:host.docker.internal:9222
fi

echo "INFO: Checking Tailscale status..."
if ! command -v tailscale &> /dev/null; then
    echo "INFO: Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
fi

if ! pgrep -x tailscaled > /dev/null; then
    echo "INFO: Starting Tailscale daemon..."
    sudo start-stop-daemon --start --background --oknodo --pidfile /var/run/tailscaled.pid --make-pidfile --exec /usr/sbin/tailscaled -- --state=/var/lib/tailscale/tailscaled.state
fi

echo "INFO: Checking Nanobanana MCP installation..."
if [ -f "webapp/scripts/install-nanobanana.sh" ]; then
    bash webapp/scripts/install-nanobanana.sh
elif [ -f "scripts/install-nanobanana.sh" ]; then
    bash scripts/install-nanobanana.sh
fi

echo "INFO: Bootstrapping goose MCP configuration..."
if [ -f "/workspaces/ftn/.devcontainer/goose-config-bootstrap.sh" ]; then
    bash "/workspaces/ftn/.devcontainer/goose-config-bootstrap.sh"
else
    echo "WARN: goose-config-bootstrap.sh not found, skipping."
fi

echo "INFO: Custom container setup script finished."
echo "\n⚠️  To complete cloud login, run:"
echo "    cd /workspaces/ftn/webapp && bash scripts/cloud-login.sh"