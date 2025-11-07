# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:22-bookworm

# Install system dependencies, Chromium, fonts, global npm packages, sentry-cli, Doppler CLI, and uv
RUN apt-get update \
    && apt-get install -y \
        chromium \
        fonts-liberation \
        curl \
        git \
        --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g obj2gltf gltf-pipeline gltfjsx source-map @lhci/cli npm-check-updates \
    && if command -v sentry-cli >/dev/null 2>&1; then \
        echo "sentry-cli is already installed. Updating..."; \
        sentry-cli update; \
    else \
        echo "sentry-cli not found. Installing..."; \
        curl -sL https://sentry.io/get-cli/ | sh; \
    fi \
    && (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh \
    && curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

# Install Oh My Zsh plugins and themes, specify-cli, and Cursor CLI as node user
USER node
ENV USER_HOME_DIR=/home/node
RUN mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions" \
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions" \
    && uv tool install --python 3.11 git+https://github.com/github/spec-kit.git \
    && curl https://cursor.com/install -fsS | bash

# Add uv tools to PATH for node user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

USER root 