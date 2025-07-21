# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:22-bookworm

# Install Chromium and fonts
RUN apt-get update \
    && apt-get install -y chromium fonts-liberation --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g obj2gltf gltf-pipeline gltfjsx source-map @lhci/cli npm-check-updates

# Ensure dependencies for sentry-cli
RUN apt-get update && apt-get install -y curl git

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
RUN rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions" \
    && mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins" \
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && git clone https://github.com/zsh-users/zsh-autosuggestions.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions"

USER root 

COPY webapp/package*.json /workspaces/ftn/webapp/
RUN cd /workspaces/ftn/webapp && npm ci 