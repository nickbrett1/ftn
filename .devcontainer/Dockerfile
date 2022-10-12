# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 18, 16, 14, 18-bullseye, 16-bullseye, 14-bullseye, 18-buster, 16-buster, 14-buster
ARG VARIANT=18-bullseye
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends chromium zsh-syntax-highlighting \
    && su node -c "npm install -g wrangler svgo source-map jest @lhci/cli@0.9.x" \
    && curl -sL https://sentry.io/get-cli/ | bash

ADD .zshrc /home/node
ADD .p10k.zsh /home/node