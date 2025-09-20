# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:22-bookworm

# Install system dependencies, Chromium and fonts
RUN apt-get update \
    && apt-get install -y \
        chromium \
        fonts-liberation \
        curl \
        git \
        --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g obj2gltf gltf-pipeline gltfjsx source-map @lhci/cli npm-check-updates

RUN if command -v sentry-cli >/dev/null 2>&1; then \
    echo "sentry-cli is already installed. Updating..."; \
    sentry-cli update; \
  else \
    echo "sentry-cli not found. Installing..."; \
    curl -sL https://sentry.io/get-cli/ | sh; \
  fi

# Install Oh My Zsh plugins and themes
USER node
ENV USER_HOME_DIR=/home/node
RUN mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions" \
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions"

USER root 