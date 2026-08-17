import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateEngine, AGY_DEV_ALIAS, generateAllFiles } from '$lib/utils/file-generator.js';
import { getCapabilityTemplateData } from '$lib/utils/capability-template-utils.js';

// Manually define the content of the templates for testing purposes
const nodeJsonTemplateContent = `{
  "name": "Node.js",
  "runArgs": ["--sysctl", "net.ipv6.conf.all.disable_ipv6=1", "--cap-add=NET_ADMIN", "--device=/dev/net/tun"],
  "build": { "dockerfile": "Dockerfile" },
  "workspaceFolder": "/workspaces/{{projectName}}",
  "remoteUser": "node",
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "configureZshAsDefaultShell": true,
      "installOhMyZsh": true,
      "upgradePackages": true,
      "username": "node"
    },
    "ghcr.io/devcontainers-extra/features/apt-packages:1": {
      "packages": "socat"
    },
    "ghcr.io/devcontainers/features/python:1": {},
    "ghcr.io/devcontainers/features/node:1": {}
  },
  "mounts": [
    {{devcontainerMounts}}
  ],
  "forwardPorts": {{devcontainerForwardPorts}},
  "containerEnv": {
    "LANG": "en_US.UTF-8",
    "LC_ALL": "en_US.UTF-8"
  },
  "remoteEnv": {
    "PATH": "\${containerWorkspaceFolder}/node_modules/.bin:\${containerEnv:PATH}"
  },
  "postCreateCommand": "bash .devcontainer/post-create-setup.sh",
  "postStartCommand": "bash /workspaces/{{projectName}}/.devcontainer/post-start-setup.sh"
}
`;

const javaDockerfileTemplateContent = `FROM mcr.microsoft.com/devcontainers/java
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
    && apt-get -y install --no-install-recommends git socat curl gnupg openssh-server mosh micro libevent-dev libncurses-dev pkg-config bison build-essential xclip

RUN curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh{{dopplerInstallation}}


# Build a current tmux from source (Debian bookworm's apt tmux is old).
# Bump TMUX_VERSION (and TMUX_SHA256) to keep tmux up to date.
ARG TMUX_VERSION=3.7b
ARG TMUX_SHA256=87f2e99e3b685973f2ca002ffd6ed7e51a5744f7009daae5a15670b6d532db96
RUN curl -fsSL -o /tmp/tmux.tar.gz "https://github.com/tmux/tmux/releases/download/\${TMUX_VERSION}/tmux-\${TMUX_VERSION}.tar.gz" \\
    && echo "\${TMUX_SHA256}  /tmp/tmux.tar.gz" | sha256sum -c - \\
    && mkdir -p /tmp/tmux-src \\
    && tar -xzf /tmp/tmux.tar.gz -C /tmp/tmux-src --strip-components=1 \\
    && cd /tmp/tmux-src \\
    && ./configure --prefix=/usr/local \\
    && make -j"$(nproc)" \\
    && make install \\
    && rm -rf /tmp/tmux.tar.gz /tmp/tmux-src
USER vscode
ENV USER_HOME_DIR=/home/vscode
# The goose installer downloads the release tarball to the current working
# directory (curl --output <name>), which is '/' by default and not writable by
# the non-root 'vscode' user -> "Failed to download" (curl exit 23). Run
# vscode-user steps from a writable home directory.
WORKDIR /home/vscode

RUN if [ -d "$HOME/.oh-my-zsh" ]; then rm -rf "$HOME/.oh-my-zsh"; fi \\
    && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \\
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git $HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \\
    && git clone https://github.com/zsh-users/zsh-autosuggestions $HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions \\
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git $HOME/.oh-my-zsh/custom/themes/powerlevel10k \\
    && curl https://cursor.com/install -fsS | bash \\
    && uv tool install --python 3.11 git+https://github.com/github/spec-kit.git \\
    && curl -fsSL https://antigravity.google/cli/install.sh | bash \\
    && mkdir -p "$HOME/.local/bin" \\
    && GOOSE_ARCH="$(uname -m | sed 's/arm64/aarch64/')" \\
    && GOOSE_TAG="$(curl -fsSL --retry 5 --retry-all-errors --retry-delay 5 https://api.github.com/repos/aaif-goose/goose/releases/latest | sed -n 's/.*"tag_name": "\\([^"]*\\)".*/\\1/p')" \\
    && if [ -z "$GOOSE_TAG" ]; then echo "WARN: could not resolve latest goose tag; falling back to 'stable' release"; GOOSE_TAG=stable; fi \\
    && GOOSE_URL="https://github.com/aaif-goose/goose/releases/download/\${GOOSE_TAG}/goose-\${GOOSE_ARCH}-unknown-linux-gnu.tar.bz2" \\
    && echo "Downloading goose \${GOOSE_TAG} (\${GOOSE_ARCH})..." \\
    && curl -fsSL --retry 5 --retry-all-errors --retry-delay 5 -o /tmp/goose.tar.bz2 "$GOOSE_URL" \\
    && mkdir -p /tmp/goose-extract \\
    && tar -xjf /tmp/goose.tar.bz2 -C /tmp/goose-extract \\
    && install -m 0755 /tmp/goose-extract/goose "$HOME/.local/bin/goose" \\
    && "$HOME/.local/bin/goose" --version \\
    && rm -rf /tmp/goose.tar.bz2 /tmp/goose-extract

# Add uv tools and goose to PATH for the non-root user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

RUN mkdir -p $HOME/.wrangler

USER root

# Ensure zsh is the default shell for the vscode user
RUN chsh -s /usr/bin/zsh vscode

COPY --chown=vscode:vscode .zshrc .p10k.zsh /home/vscode/

# Create the .ssh directory
RUN mkdir -p /home/vscode/.ssh

# Dynamically pull all your public keys from GitHub
RUN curl -fsSL https://github.com/nickbrett1.keys > /home/vscode/.ssh/authorized_keys

# Set permissions
RUN chown -R vscode:vscode /home/vscode/.ssh \\
    && chmod 700 /home/vscode/.ssh \\
    && chmod 600 /home/vscode/.ssh/authorized_keys

USER vscode
`;

const pythonDockerfileTemplateContent = `FROM mcr.microsoft.com/devcontainers/python
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
    && apt-get -y install --no-install-recommends git socat curl gnupg nodejs npm openssh-server mosh micro libevent-dev libncurses-dev pkg-config bison build-essential xclip \\
    && curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh{{dopplerInstallation}}


# Build a current tmux from source (Debian bookworm's apt tmux is old).
# Bump TMUX_VERSION (and TMUX_SHA256) to keep tmux up to date.
ARG TMUX_VERSION=3.7b
ARG TMUX_SHA256=87f2e99e3b685973f2ca002ffd6ed7e51a5744f7009daae5a15670b6d532db96
RUN curl -fsSL -o /tmp/tmux.tar.gz "https://github.com/tmux/tmux/releases/download/\${TMUX_VERSION}/tmux-\${TMUX_VERSION}.tar.gz" \\
    && echo "\${TMUX_SHA256}  /tmp/tmux.tar.gz" | sha256sum -c - \\
    && mkdir -p /tmp/tmux-src \\
    && tar -xzf /tmp/tmux.tar.gz -C /tmp/tmux-src --strip-components=1 \\
    && cd /tmp/tmux-src \\
    && ./configure --prefix=/usr/local \\
    && make -j"$(nproc)" \\
    && make install \\
    && rm -rf /tmp/tmux.tar.gz /tmp/tmux-src
USER vscode
ENV USER_HOME_DIR=/home/vscode
# The goose installer downloads the release tarball to the current working
# directory (curl --output <name>), which is '/' by default and not writable by
# the non-root 'vscode' user -> "Failed to download" (curl exit 23). Run
# vscode-user steps from a writable home directory.
WORKDIR /home/vscode

RUN if [ -d "$HOME/.oh-my-zsh" ]; then rm -rf "$HOME/.oh-my-zsh"; fi \\
    && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \\
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git $HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \\
    && git clone https://github.com/zsh-users/zsh-autosuggestions $HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions \\
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git $HOME/.oh-my-zsh/custom/themes/powerlevel10k \\
    && curl https://cursor.com/install -fsS | bash \\
    && uv tool install --python 3.11 git+https://github.com/github/spec-kit.git \\
    && curl -fsSL https://antigravity.google/cli/install.sh | bash \\
    && mkdir -p "$HOME/.local/bin" \\
    && GOOSE_ARCH="$(uname -m | sed 's/arm64/aarch64/')" \\
    && GOOSE_TAG="$(curl -fsSL --retry 5 --retry-all-errors --retry-delay 5 https://api.github.com/repos/aaif-goose/goose/releases/latest | sed -n 's/.*"tag_name": "\\([^"]*\\)".*/\\1/p')" \\
    && if [ -z "$GOOSE_TAG" ]; then echo "WARN: could not resolve latest goose tag; falling back to 'stable' release"; GOOSE_TAG=stable; fi \\
    && GOOSE_URL="https://github.com/aaif-goose/goose/releases/download/\${GOOSE_TAG}/goose-\${GOOSE_ARCH}-unknown-linux-gnu.tar.bz2" \\
    && echo "Downloading goose \${GOOSE_TAG} (\${GOOSE_ARCH})..." \\
    && curl -fsSL --retry 5 --retry-all-errors --retry-delay 5 -o /tmp/goose.tar.bz2 "$GOOSE_URL" \\
    && mkdir -p /tmp/goose-extract \\
    && tar -xjf /tmp/goose.tar.bz2 -C /tmp/goose-extract \\
    && install -m 0755 /tmp/goose-extract/goose "$HOME/.local/bin/goose" \\
    && "$HOME/.local/bin/goose" --version \\
    && rm -rf /tmp/goose.tar.bz2 /tmp/goose-extract

# Add uv tools and goose to PATH for the non-root user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

RUN mkdir -p $HOME/.wrangler

USER root

# Ensure zsh is the default shell for the vscode user
RUN chsh -s /usr/bin/zsh vscode

COPY --chown=vscode:vscode .zshrc .p10k.zsh /home/vscode/

# Create the .ssh directory
RUN mkdir -p /home/vscode/.ssh

# Dynamically pull all your public keys from GitHub
RUN curl -fsSL https://github.com/nickbrett1.keys > /home/vscode/.ssh/authorized_keys

# Set permissions
RUN chown -R vscode:vscode /home/vscode/.ssh \\
    && chmod 700 /home/vscode/.ssh \\
    && chmod 600 /home/vscode/.ssh/authorized_keys

USER vscode
`;

const nodeDockerfileTemplateContent = `FROM mcr.microsoft.com/devcontainers/typescript-node
RUN apt-get update \\
    && apt-get -y install --no-install-recommends git socat curl gnupg gnupg2 apt-transport-https ca-certificates openssh-server mosh micro libevent-dev libncurses-dev pkg-config bison build-essential xclip \\
    && curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh{{dopplerInstallation}}{{docsifyInstallation}}


# Build a current tmux from source (Debian bookworm's apt tmux is old).
# Bump TMUX_VERSION (and TMUX_SHA256) to keep tmux up to date.
ARG TMUX_VERSION=3.7b
ARG TMUX_SHA256=87f2e99e3b685973f2ca002ffd6ed7e51a5744f7009daae5a15670b6d532db96
RUN curl -fsSL -o /tmp/tmux.tar.gz "https://github.com/tmux/tmux/releases/download/\${TMUX_VERSION}/tmux-\${TMUX_VERSION}.tar.gz" \\
    && echo "\${TMUX_SHA256}  /tmp/tmux.tar.gz" | sha256sum -c - \\
    && mkdir -p /tmp/tmux-src \\
    && tar -xzf /tmp/tmux.tar.gz -C /tmp/tmux-src --strip-components=1 \\
    && cd /tmp/tmux-src \\
    && ./configure --prefix=/usr/local \\
    && make -j"$(nproc)" \\
    && make install \\
    && rm -rf /tmp/tmux.tar.gz /tmp/tmux-src
USER node
ENV USER_HOME_DIR=/home/node
# The goose installer downloads the release tarball to the current working
# directory (curl --output <name>), which is '/' by default and not writable by
# the non-root 'node' user -> "Failed to download" (curl exit 23). Run node-user
# steps from a writable home directory.
WORKDIR /home/node

RUN if [ -d "$HOME/.oh-my-zsh" ]; then rm -rf "$HOME/.oh-my-zsh"; fi \\
    && sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \\
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git $HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \\
    && git clone https://github.com/zsh-users/zsh-autosuggestions $HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions \\
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git $HOME/.oh-my-zsh/custom/themes/powerlevel10k \\
    && curl https://cursor.com/install -fsS | bash \\
    && uv tool install --python 3.11 git+https://github.com/github/spec-kit.git \\
    && curl -fsSL https://antigravity.google/cli/install.sh | bash \\
    && mkdir -p "$HOME/.local/bin" \\
    && GOOSE_ARCH="$(uname -m | sed 's/arm64/aarch64/')" \\
    && GOOSE_TAG="$(curl -fsSL --retry 5 --retry-all-errors --retry-delay 5 https://api.github.com/repos/aaif-goose/goose/releases/latest | sed -n 's/.*"tag_name": "\\([^"]*\\)".*/\\1/p')" \\
    && if [ -z "$GOOSE_TAG" ]; then echo "WARN: could not resolve latest goose tag; falling back to 'stable' release"; GOOSE_TAG=stable; fi \\
    && GOOSE_URL="https://github.com/aaif-goose/goose/releases/download/\${GOOSE_TAG}/goose-\${GOOSE_ARCH}-unknown-linux-gnu.tar.bz2" \\
    && echo "Downloading goose \${GOOSE_TAG} (\${GOOSE_ARCH})..." \\
    && curl -fsSL --retry 5 --retry-all-errors --retry-delay 5 -o /tmp/goose.tar.bz2 "$GOOSE_URL" \\
    && mkdir -p /tmp/goose-extract \\
    && tar -xjf /tmp/goose.tar.bz2 -C /tmp/goose-extract \\
    && install -m 0755 /tmp/goose-extract/goose "$HOME/.local/bin/goose" \\
    && "$HOME/.local/bin/goose" --version \\
    && rm -rf /tmp/goose.tar.bz2 /tmp/goose-extract

# Add uv tools and goose to PATH for the non-root user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

RUN mkdir -p $HOME/.wrangler

USER root

# Ensure zsh is the default shell for the node user
RUN chsh -s /usr/bin/zsh node

COPY --chown=node:node .zshrc .p10k.zsh /home/node/

# Create the .ssh directory
RUN mkdir -p /home/node/.ssh

# Dynamically pull all your public keys from GitHub
RUN curl -fsSL https://github.com/nickbrett1.keys > /home/node/.ssh/authorized_keys

# Set permissions
RUN chown -R node:node /home/node/.ssh \\
    && chmod 700 /home/node/.ssh \\
    && chmod 600 /home/node/.ssh/authorized_keys

USER node
`;

const dopplerYamlTemplateContent = `setup:
  project: {{projectName}}
  config: dev
`;

const vscodeTasksJsonTemplateContent = `{
  // See https://go.microsoft.com/fwlink/?LinkId=733558
  // for the documentation about the tasks.json format
  "version": "2.0.0",
  "presentation": {
    "echo": true,
    "reveal": "always",
    "focus": false,
    "panel": "dedicated",
    "showReuseMessage": false
  },
  "tasks": [
    {
      "label": "Run all build tasks",
      "dependsOn": ["svelte dev", "new terminal", "test vitest"],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": []
    },
    {
      "type": "npm",
      "script": "dev",
      "path": ".",
      "problemMatcher": [],
      "label": "svelte dev",
      "detail": "svelte dev",
      "group": "build",
      "presentation": {
        "group": "build-group",
        "panel": "shared"
      }
    },
    {
      "type": "npm",
      "script": "test",
      "path": ".",
      "problemMatcher": [],
      "label": "test vitest",
      "detail": "test vitest",
      "group": "build",
      "presentation": {
        "group": "build-group",
        "panel": "shared"
      }
    },
    {
      "label": "new terminal",
      "type": "shell",
      "group": "build",
      "command": "zsh",
      "args": ["-i"],
      "problemMatcher": [],
      "detail": "new terminal",
      "presentation": {
        "group": "build-group",
        "panel": "shared"
      },
      "options": {
        "cwd": "/workspaces/{{projectName}}"
      }
    }
  ]
}
`;

describe('TemplateEngine', () => {
	let engine;

	beforeEach(async () => {
		engine = new TemplateEngine();
		await engine.initialize();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('initializes successfully and loads template strings', () => {
		expect(engine.initialized).toBe(true);
		expect(engine.templates.has('devcontainer-node-json')).toBe(true);
		expect(typeof engine.templates.get('devcontainer-node-json')).toBe('string');
	});

	it('retrieves template strings', () => {
		const template = engine.getTemplate('devcontainer-node-json');
		expect(template).toBe(nodeJsonTemplateContent);

		const nonExistent = engine.getTemplate('non-existent');
		expect(nonExistent).toBeNull();
	});

	it('replaces variables in template string', () => {
		const result = engine.compileTemplate('Hello {{name}} and {{nested.prop}}', {
			name: 'world',
			nested: { prop: 'value' }
		});
		expect(result).toBe('Hello world and value');
	});

	it('replaces variables from a real template file', () => {
		const template = engine.getTemplate('devcontainer-java-dockerfile');
		// Previously tested replacement, now verifies content is static/correct
		const result = engine.compileTemplate(template, {});
		expect(result).toBe(javaDockerfileTemplateContent);
	});

	it('replaces variables from node dockerfile template', () => {
		const template = engine.getTemplate('devcontainer-node-dockerfile');
		// Previously tested replacement, now verifies content is static/correct
		const result = engine.compileTemplate(template, {});
		expect(result).toBe(nodeDockerfileTemplateContent);
	});

	it('replaces variables from python dockerfile template', () => {
		const template = engine.getTemplate('devcontainer-python-dockerfile');
		// Previously tested replacement, now verifies content is static/correct
		const result = engine.compileTemplate(template, {});
		expect(result).toBe(pythonDockerfileTemplateContent);
	});

	it('generates .sonarcloud.properties with correct variables', () => {
		const data = {
			projectName: 'my-project',
			organization: 'my-org',
			sonarLanguageSettings: 'sonar.foo=bar'
		};
		const content = engine.generateFile('.sonarcloud.properties', data);
		expect(content).toContain('sonar.projectKey=nickbrett1_my-project');
		expect(content).toContain('sonar.projectName=my-project');
		expect(content).toContain('sonar.organization=my-org');
		expect(content).toContain('sonar.foo=bar');
	});

	it('generates files and handles missing templates', () => {
		const content = engine.generateFile('devcontainer-java-dockerfile', {
			capabilityConfig: { javaVersion: '17' } // This config should be ignored now
		});
		expect(content).toBe(javaDockerfileTemplateContent);

		expect(() => engine.generateFile('missing', {})).toThrow('Template not found');
	});

	it('generates doppler.yaml correctly', () => {
		const content = engine.generateFile('doppler-yaml', { projectName: 'test-project' });
		expect(content).toBe(dopplerYamlTemplateContent.replace('{{projectName}}', 'test-project'));
	});

	it('generates vscode-tasks.json correctly', () => {
		const content = engine.generateFile('vscode-tasks-json', { projectName: 'test-project' });
		expect(content).toBe(vscodeTasksJsonTemplateContent.replace('{{projectName}}', 'test-project'));
	});

	it('generates multiple files collecting errors', () => {
		const results = engine.generateFiles([
			{
				templateId: 'devcontainer-java-dockerfile',
				filePath: '/tmp/ok.txt',
				data: { capabilityConfig: { javaVersion: '17' } }
			},
			{ templateId: 'missing', filePath: '/tmp/missing.txt', data: {} }
		]);

		const success = results.find((entry) => entry.templateId === 'devcontainer-java-dockerfile');
		const failure = results.find((entry) => entry.templateId === 'missing');

		expect(success).toBeDefined();
		expect(success.success).toBe(true);
		expect(success.content).toBe(javaDockerfileTemplateContent);
		expect(failure.success).toBe(false);
		expect(failure.error).toContain('Template not found');
	});

	it('should generate CircleCI config with Cloudflare deployment steps when cloudflare-wrangler capability is present', () => {
		const selectedCapabilities = ['circleci', 'cloudflare-wrangler'];
		const capabilitiesConfig = {};
		const projectMetadata = { name: 'test-project' };
		const context = {
			capabilities: selectedCapabilities,
			configuration: capabilitiesConfig,
			projectMetadata: projectMetadata
		};

		const templateData = getCapabilityTemplateData('circleci', context);
		const content = engine.generateFile('circleci-config', templateData);

		expect(content).toContain('deploy-to-cloudflare');
		expect(content).toContain('npx wrangler deploy');
	});

	it('should generate CircleCI config with Doppler and Cloudflare secret sync step when both are present', () => {
		const selectedCapabilities = ['circleci', 'cloudflare-wrangler', 'doppler'];
		const capabilitiesConfig = {};
		const projectMetadata = { name: 'test-project' };
		const context = {
			capabilities: selectedCapabilities,
			configuration: capabilitiesConfig,
			projectMetadata: projectMetadata
		};

		const templateData = getCapabilityTemplateData('circleci', context);
		const content = engine.generateFile('circleci-config', templateData);

		expect(content).not.toContain('doppler: conpago/doppler@1.3.5');
		expect(content).toContain('install_doppler:');
		expect(content).toContain('deploy-to-cloudflare:');
		expect(content).toContain('parameters:');
		expect(content).toContain('environment:');
		expect(content).toContain('install_doppler');
		expect(content).toContain('Sync Doppler Secrets to Cloudflare');
		expect(content).toContain(
			'./scripts/sync-doppler-secrets.sh --config "$DOPPLER_CONFIG" --env "$CLOUDFLARE_ENV"'
		);
		expect(content).toContain('npx wrangler deploy --env "$ENV_VAL"');
		expect(content).toContain('only: main');
		expect(content).toContain('ignore: main');
		expect(content).toContain('name: deploy-to-cloudflare-preview');
	});

	it('should NOT generate CircleCI config with Cloudflare deployment steps when cloudflare-wrangler capability is NOT present', () => {
		const selectedCapabilities = ['circleci'];
		const capabilitiesConfig = {};
		const projectMetadata = { name: 'test-project' };
		const context = {
			capabilities: selectedCapabilities,
			configuration: capabilitiesConfig,
			projectMetadata: projectMetadata
		};

		const templateData = getCapabilityTemplateData('circleci', context);
		const content = engine.generateFile('circleci-config', templateData);

		expect(content).not.toContain('deploy-to-cloudflare');
		expect(content).not.toContain('command: npx wrangler deploy');
	});

	it('should include agy-dev alias in .zshrc when Doppler capability is present in generateAllFiles', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node', 'doppler'],
			configuration: {
				'devcontainer-node': {} // No version needed anymore
			}
		};

		const files = await generateAllFiles(context);
		const zshrc = files.find((f) => f.filePath.endsWith('.zshrc'));

		expect(zshrc).toBeDefined();
		expect(zshrc.content).toContain('agy-dev()');
		expect(zshrc.content).toContain('doppler run');
		expect(zshrc.content).toContain('--project common');
		expect(zshrc.content).toContain('--project test-project');
		expect(zshrc.content).not.toContain('{{projectName}}');
	});

	it('should NOT include agy-dev alias in .zshrc when Doppler capability is NOT present in generateAllFiles', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node'],
			configuration: {
				'devcontainer-node': {}
			}
		};

		const files = await generateAllFiles(context);
		const zshrc = files.find((f) => f.filePath.endsWith('.zshrc'));

		expect(zshrc).toBeDefined();
		expect(zshrc.content).not.toContain('agy-dev()');
		expect(zshrc.content).not.toContain('doppler run');
	});

	it('agy-dev alias content should match expected constant', () => {
		expect(AGY_DEV_ALIAS).toContain('agy-dev()');
		expect(AGY_DEV_ALIAS).toContain('--project common --config dev');
		expect(AGY_DEV_ALIAS).toContain(
			'doppler run --forward-signals --project {{projectName}} --config dev -- agy "$@"'
		);
	});

	it('should include .antigravitycli in generated .gitignore file', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node'],
			configuration: {
				'devcontainer-node': {}
			}
		};

		const files = await generateAllFiles(context);
		const gitignore = files.find((f) => f.filePath === '.gitignore');

		expect(gitignore).toBeDefined();
		expect(gitignore.content).toContain('.antigravitycli');
	});

	it('should include agent rules files under .agents/.rules in generated project files', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node'],
			configuration: {
				'devcontainer-node': {}
			}
		};

		const files = await generateAllFiles(context);

		const gitGuidelines = files.find((f) => f.filePath === '.agents/.rules/git_guidelines.md');
		const testingGuidelines = files.find(
			(f) => f.filePath === '.agents/.rules/testing_guidelines.md'
		);

		expect(gitGuidelines).toBeDefined();
		expect(gitGuidelines.content).toContain('# Git, Code Review, and Deployment Rules');

		expect(testingGuidelines).toBeDefined();
		expect(testingGuidelines.content).toContain('# Testing Guidelines');
	});
});
