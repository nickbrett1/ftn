#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "INFO: Starting custom container setup script..."

CURRENT_USER=$(whoami)
USER_HOME_DIR="$HOME"

echo "INFO: Creating Oh My Zsh custom directories..."
mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins"

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

if doppler whoami &> /dev/null; then
  echo "Already logged in to Doppler."
else
	echo "INFO: Logging into Doppler..."
	doppler login --no-check-version --no-timeout --yes

	echo "INFO: Setting up Doppler..."
doppler setup --no-interactive
fi

echo "INFO: Configuring git safe directory..."
git config --global --add safe.directory /workspaces/ftn

# Needed when run under vscode, but does not work right now (July 20th, 2025) in Cursor
# WEBAPP_DIR="/workspaces/ftn/webapp"
# if [ -d "$WEBAPP_DIR" ]; then

#   echo "INFO: Webapp directory found at $WEBAPP_DIR. Checking Wrangler login status..."
#   ( # Start a subshell to localize the cd
#       cd "$WEBAPP_DIR"
#       npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\.0\.0\.0/localhost/g'
#       echo "INFO: Wrangler login process initiated."
#   ) # End subshell
# else
#   echo "INFO: Webapp directory not found at $WEBAPP_DIR, skipping Wrangler login."
# fi

echo "INFO: Custom container setup script finished."