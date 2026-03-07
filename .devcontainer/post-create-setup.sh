#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "INFO: Starting custom container setup script..."

CURRENT_USER=$(whoami)
USER_HOME_DIR="$HOME"

echo "INFO: Creating Oh My Zsh custom directories..."
mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins"

echo "INFO: Initializing Gemini CLI global settings..."
mkdir -p "$USER_HOME_DIR/.gemini"
printf '{\n  "general": {\n    "sessionRetention": {\n      "enabled": true,\n      "maxAge": "30d",\n      "warningAcknowledged": true\n    }\n  },\n  "ide": {\n    "hasSeenNudge": true,\n    "enabled": true\n  }\n}\n' > "$USER_HOME_DIR/.gemini/settings.json"
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

echo "INFO: Installing Playwright and its Chromium dependencies..."
npx --yes playwright install --with-deps chromium
echo "INFO: Playwright Chromium installation complete."

echo "INFO: Configuring git safe directory..."
git config --global --add safe.directory /workspaces/ftn

echo "Setup bridget to access Chrome DevTools Protocol over a secure tunnel..."
socat TCP-LISTEN:9222,fork,bind=127.0.0.1 TCP:host.docker.internal:9222 &

echo "INFO: Custom container setup script finished."
echo "\n⚠️  To complete cloud login, run:"
echo "    cd /workspaces/ftn/webapp && bash scripts/cloud-login.sh"