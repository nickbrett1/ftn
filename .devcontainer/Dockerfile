# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 18, 16, 14, 18-bullseye, 16-bullseye, 14-bullseye, 18-buster, 16-buster, 14-buster
ARG VARIANT=
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends chromium default-jre zsh-syntax-highlighting curl gnupg \
    && su node -c "npm install -g obj2gltf gltf-pipeline gltfjsx source-map @lhci/cli npm-check-updates" \
    && curl -sL https://sentry.io/get-cli/ | sh

RUN (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh

ADD .zshrc /home/node
ADD .p10k.zsh /home/node
