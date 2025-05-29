#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "INFO: Starting custom container setup script..."

echo "INFO: Updating package lists and installing Chromium..."
sudo apt-get update
# Install Chromium and necessary fonts for headless operation
sudo apt-get install -y chromium fonts-liberation --no-install-recommends
echo "INFO: Chromium installation complete."

echo "INFO: Creating Oh My Zsh custom directories..."
mkdir -p "$HOME/.oh-my-zsh/custom/themes" "$HOME/.oh-my-zsh/custom/plugins"

if [ -f "/workspaces/ftn/.devcontainer/.zshrc" ]; then
    echo "INFO: Copying .zshrc to /home/node/.zshrc"
    cp "/workspaces/ftn/.devcontainer/.zshrc" "/home/node/.zshrc"
    sudo chown node:node "/home/node/.zshrc"
else
    echo "INFO: /workspaces/ftn/.devcontainer/.zshrc not found, skipping copy."
fi

if [ -f "/workspaces/ftn/.devcontainer/.p10k.zsh" ]; then
    echo "INFO: Copying .p10k.zsh to /home/node/.p10k.zsh"
    cp "/workspaces/ftn/.devcontainer/.p10k.zsh" "/home/node/.p10k.zsh"
    sudo chown node:node "/home/node/.p10k.zsh"
else
    echo "INFO: /workspaces/ftn/.devcontainer/.p10k.zsh not found, skipping copy."
fi

echo "INFO: Installing global npm packages as node user..."
npm install -g obj2gltf gltf-pipeline gltfjsx source-map @lhci/cli npm-check-updates

echo "INFO: Installing Sentry CLI..."
curl -sL https://sentry.io/get-cli/ | sh

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

ZSH_CUSTOM_DIR="/home/node/.oh-my-zsh/custom"
POWERLEVEL10K_DIR="$ZSH_CUSTOM_DIR/themes/powerlevel10k"
ZSH_SYNTAX_HIGHLIGHTING_DIR="$ZSH_CUSTOM_DIR/plugins/zsh-syntax-highlighting"
ZSH_AUTOSUGGESTIONS_DIR="$ZSH_CUSTOM_DIR/plugins/zsh-autosuggestions"

if [ ! -d "$POWERLEVEL10K_DIR" ]; then
    echo "INFO: Cloning Powerlevel10k theme..."
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$POWERLEVEL10K_DIR"
else
    echo "INFO: Powerlevel10k theme already exists at $POWERLEVEL10K_DIR."
fi

if [ ! -d "$ZSH_SYNTAX_HIGHLIGHTING_DIR" ]; then
    echo "INFO: Cloning zsh-syntax-highlighting plugin..."
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$ZSH_SYNTAX_HIGHLIGHTING_DIR"
else
    echo "INFO: zsh-syntax-highlighting plugin already exists at $ZSH_SYNTAX_HIGHLIGHTING_DIR."
fi

if [ ! -d "$ZSH_AUTOSUGGESTIONS_DIR" ]; then
    echo "INFO: Cloning zsh-autosuggestions plugin..."
    git clone https://github.com/zsh-users/zsh-autosuggestions.git "$ZSH_AUTOSUGGESTIONS_DIR"
else
    echo "INFO: zsh-autosuggestions plugin already exists at $ZSH_AUTOSUGGESTIONS_DIR."
fi

WEBAPP_DIR="/workspaces/ftn/webapp"
if [ -d "$WEBAPP_DIR" ]; then

    echo "INFO: Webapp directory found at $WEBAPP_DIR. Checking Wrangler login status..."
    ( # Start a subshell to localize the cd
        cd "$WEBAPP_DIR"
        if npx wrangler whoami &> /dev/null; then
            echo "INFO: Already logged in to Wrangler."
        else
            echo "INFO: Not logged in to Wrangler. Attempting login..."
            # Rather convoluted way to login to wranger due to this bug -> https://github.com/cloudflare/workers-sdk/issues/5937
            npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\.0\.0\.0/localhost/g'
            echo "INFO: Wrangler login process initiated."
        fi
    ) # End subshell
else
    echo "INFO: Webapp directory not found at $WEBAPP_DIR, skipping Wrangler login."
fi

echo "INFO: Custom container setup script finished."