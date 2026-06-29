#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "INFO: Starting custom container setup script..."

echo "INFO: Ensuring SSH service is running..."
sudo service ssh start

CURRENT_USER=$(whoami)
USER_HOME_DIR="$HOME"

echo "INFO: Creating Oh My Zsh custom directories..."
mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins"

echo "INFO: Initializing Antigravity CLI global settings..."
mkdir -p "$USER_HOME_DIR/.agy"
printf '{\n  "selectedAuthType": "oauth-personal",\n  "general": {\n    "sessionRetention": {\n      "enabled": true,\n      "maxAge": "30d",\n      "warningAcknowledged": true\n    }\n  },\n  "ide": {\n    "hasSeenNudge": true,\n    "enabled": true\n  }\n}\n' > "$USER_HOME_DIR/.agy/settings.json"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.agy"

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


echo "INFO: Installing Playwright and its Chromium dependencies..."
npx --yes playwright install --with-deps chromium
echo "INFO: Playwright Chromium installation complete."

echo "INFO: Configuring git safe directory..."
git config --global --add safe.directory /workspaces/ftn

echo "Setup bridget to access Chrome DevTools Protocol over a secure tunnel..."
socat TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:host.docker.internal:9222 &

echo "INFO: Checking Tailscale status..."
if ! command -v tailscale &> /dev/null; then
    echo "INFO: Installing Tailscale..."
    curl -fsSL https://tailscale.com/install.sh | sh
fi

if ! pgrep -x tailscaled > /dev/null; then
    echo "INFO: Starting Tailscale daemon..."
    sudo tailscaled --state=/var/lib/tailscale/tailscaled.state > /dev/null 2>&1 &
fi

echo "INFO: Checking Nanobanana MCP installation..."
if [ -f "webapp/scripts/install-nanobanana.sh" ]; then
    bash webapp/scripts/install-nanobanana.sh
elif [ -f "scripts/install-nanobanana.sh" ]; then
    bash scripts/install-nanobanana.sh
fi

echo "INFO: Custom container setup script finished."
echo "\n⚠️  To complete cloud login, run:"
echo "    cd /workspaces/ftn/webapp && bash scripts/cloud-login.sh"