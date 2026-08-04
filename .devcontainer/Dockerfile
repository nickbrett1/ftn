# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:22-bookworm

# Install system dependencies, Chromium, fonts, global npm packages, sentry-cli, Doppler CLI, and uv
RUN apt-get update \
    && apt-get install -y \
        chromium \
        fonts-liberation \
        curl \
        git \
				socat \
				gnupg \
				openssh-server \
				mosh \
				micro \
				xclip \
        libevent-dev \
        libncurses-dev \
        pkg-config \
        bison \
        build-essential \
        wget \
        unzip \
        sudo \
        --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# docsify-cli pulls in docsify@4, whose postinstall (`opencollective-postinstall && npx husky install`)
# exits with 127 under npm 10 ("husky: not found"), which breaks `docker build`.
# Install it with --ignore-scripts; the docsify CLI works fine without those scripts.
RUN npm install -g obj2gltf gltf-pipeline gltfjsx source-map @lhci/cli npm-check-updates \
    && npm install -g --ignore-scripts docsify-cli

RUN if command -v sentry-cli >/dev/null 2>&1; then \
        echo "sentry-cli is already installed. Updating..."; \
        sentry-cli update; \
    else \
        echo "sentry-cli not found. Installing..."; \
        curl -sL https://sentry.io/get-cli/ | sh; \
    fi

RUN (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh

RUN curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

# Build a current tmux from source (Debian bookworm's apt tmux is old).
# Bump TMUX_VERSION (and TMUX_SHA256) to keep tmux up to date.
ARG TMUX_VERSION=3.7b
ARG TMUX_SHA256=87f2e99e3b685973f2ca002ffd6ed7e51a5744f7009daae5a15670b6d532db96
RUN curl -fsSL -o /tmp/tmux.tar.gz "https://github.com/tmux/tmux/releases/download/${TMUX_VERSION}/tmux-${TMUX_VERSION}.tar.gz" \
    && echo "${TMUX_SHA256}  /tmp/tmux.tar.gz" | sha256sum -c - \
    && mkdir -p /tmp/tmux-src \
    && tar -xzf /tmp/tmux.tar.gz -C /tmp/tmux-src --strip-components=1 \
    && cd /tmp/tmux-src \
    && ./configure --prefix=/usr/local \
    && make -j"$(nproc)" \
    && make install \
    && rm -rf /tmp/tmux.tar.gz /tmp/tmux-src

# Oh My Zsh plugins and themes as node user
USER node
ENV USER_HOME_DIR=/home/node
RUN mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && rm -rf "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions" \
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$USER_HOME_DIR/.oh-my-zsh/custom/themes/powerlevel10k" \
    && git clone --depth=1 https://github.com/zsh-users/zsh-syntax-highlighting.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" \
    && git clone --depth=1 https://github.com/zsh-users/zsh-autosuggestions.git "$USER_HOME_DIR/.oh-my-zsh/custom/plugins/zsh-autosuggestions"

# specify-cli (spec-kit) via uv
RUN uv tool install --python 3.11 git+https://github.com/github/spec-kit.git

# Cursor agent CLI
RUN curl https://cursor.com/install -fsS | bash

# Antigravity CLI
RUN curl -fsSL https://antigravity.google/cli/install.sh | bash

# goose CLI
RUN curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | CONFIGURE=false bash

# Wrangler config volume mount point
RUN mkdir -p "$HOME/.wrangler"


# Add uv tools to PATH for node user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

USER root 

# Create the .ssh directory
RUN mkdir -p /home/node/.ssh

# Dynamically pull all your public keys from GitHub
RUN curl -fsSL https://github.com/nickbrett1.keys > /home/node/.ssh/authorized_keys

# Set permissions
RUN chown -R node:node /home/node/.ssh \
    && chmod 700 /home/node/.ssh \
    && chmod 600 /home/node/.ssh/authorized_keys

USER node
 