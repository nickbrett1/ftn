function getCodingAgentsTemplateData(context) {
	const hasSonarQube = context.capabilities.includes('sonarcloud');
	const hasCircleCI = context.capabilities.includes('circleci');
	const hasDoppler = context.capabilities.includes('doppler');
	const hasXcode = context.capabilities.includes('xcode-development');

	let sonarQubeMcpConfig = '';
	if (hasSonarQube) {
		if (hasDoppler) {
			sonarQubeMcpConfig = `,
    "sonarqube": {
      "command": "doppler",
      "args": [
        "run",
        "--",
        "npx",
        "-y",
        "sonarqube-mcp-server"
      ]
    }`;
		} else {
			sonarQubeMcpConfig = `,
    "sonarqube": {
      "command": "npx",
      "args": [
        "-y",
        "sonarqube-mcp-server"
      ],
      "env": {
        "SONAR_TOKEN": "$SONAR_TOKEN",
        "SONAR_HOST_URL": "$SONAR_HOST_URL"
      }
    }`;
		}
	}

	let circleCiMcpConfig = '';
	if (hasCircleCI) {
		if (hasDoppler) {
			circleCiMcpConfig = `,
    "circleci": {
      "command": "doppler",
      "args": [
        "run",
        "--",
        "npx",
        "-y",
        "@circleci/mcp-server-circleci"
      ]
    }`;
		} else {
			circleCiMcpConfig = `,
    "circleci": {
      "command": "npx",
      "args": [
        "-y",
        "@circleci/mcp-server-circleci"
      ],
      "env": {
        "CIRCLECI_TOKEN": "$CIRCLECI_TOKEN",
        "CIRCLE_API_TOKEN": "$CIRCLE_API_TOKEN"
      }
    }`;
		}
	}

	let githubMcpConfig = '';
	if (hasDoppler) {
		githubMcpConfig = `,
    "github": {
      "command": "doppler",
      "args": [
        "run",
        "--",
        "npx",
        "-y",
        "@modelcontextprotocol/server-github"
      ]
    }`;
	} else {
		githubMcpConfig = `,
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_PERSONAL_ACCESS_TOKEN"
      }
    }`;
	}

	let dopplerMcpConfig = '';
	if (hasDoppler) {
		dopplerMcpConfig = `,
    "doppler": {
      "command": "sh",
      "args": [
        "-c",
        "DOPPLER_TOKEN=$(doppler configure get token --plain) npx -y @dopplerhq/mcp-server"
      ]
    }`;
	}

	let xcodeNativeMcpConfig = '';
	if (hasXcode) {
		xcodeNativeMcpConfig = `,
    "xcode-native": {
      "command": "node",
      "args": [
        ".agents/mcp-sse-proxy.cjs",
        "http://mac-studio:9876/sse"
      ]
    }`;
	}

	return {
		sonarQubeMcpConfig,
		circleCiMcpConfig,
		githubMcpConfig,
		dopplerMcpConfig,
		xcodeNativeMcpConfig
	};
}

/**
 * Generates goose MCP server configuration YAML entries based on project capabilities.
 * Similar to the agy MCP config but for goose's ~/.config/goose/config.yaml format.
 * @param {object} context - The project generation context with capabilities
 * @returns {object} Object with goose YAML config parts for each optional MCP server
 */
function getGooseMcpConfig(context) {
	const hasSonarQube = context.capabilities.includes('sonarcloud');
	const hasCircleCI = context.capabilities.includes('circleci');
	const hasDoppler = context.capabilities.includes('doppler');
	const hasXcode = context.capabilities.includes('xcode-development');

	let sonarQubeGooseConfig = '';
	if (hasSonarQube) {
		sonarQubeGooseConfig = `
  sonarqube:
    type: stdio
    name: sonarqube
    enabled: true
    cmd: doppler
    args: ["run", "--", "npx", "-y", "sonarqube-mcp-server"]
    timeout: 300`;
	}

	let circleCiGooseConfig = '';
	if (hasCircleCI) {
		circleCiGooseConfig = `
  circleci:
    type: stdio
    name: circleci
    enabled: true
    cmd: doppler
    args: ["run", "--", "npx", "-y", "@circleci/mcp-server-circleci"]
    timeout: 300`;
	}

	let xcodeNativeGooseConfig = '';
	if (hasXcode) {
		xcodeNativeGooseConfig = `
  xcode-native:
    type: stdio
    name: xcode-native
    enabled: true
    cmd: node
    args: [".agents/mcp-sse-proxy.cjs", "http://mac-studio:9876/sse"]
    timeout: 300`;
	}

	return {
		sonarQubeGooseConfig,
		circleCiGooseConfig,
		xcodeNativeGooseConfig
	};
}

function getSonarCloudTemplateData(context) {
	const config = context.configuration?.sonarcloud || {};
	const language = config.language || 'JavaScript';
	let languageSettings = '';

	switch (language) {
		case 'JavaScript': {
			languageSettings = 'sonar.javascript.lcov.reportPaths=coverage/lcov.info';

			break;
		}
		case 'Python': {
			languageSettings = 'sonar.python.coverage.reportPaths=coverage.xml';
			if (context.capabilities?.includes('devcontainer-python')) {
				languageSettings += '\nsonar.python.version=3.12';
			}

			break;
		}
		case 'Java': {
			languageSettings = 'sonar.java.binaries=.';

			break;
		}
		// No default
	}

	const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
	const isRustWorker = wranglerConfig.workerType === 'rust';
	const sonarSources = isRustWorker ? 'worker/src' : 'src';

	return {
		sonarLanguageSettings: languageSettings,
		organization: config.organization || 'bem',
		sonarSources
	};
}

function _applyGitGuardianConfig(data, context, contextEnabled, contextName, buildJobContext) {
	if (context.capabilities.includes('gitguardian')) {
		data.orbs += `  ggshield: gitguardian/ggshield@1\n`;
		data.buildWorkflowJob = `      - ggshield/scan:
          name: ggshield-scan${contextEnabled ? `\n          context: ${contextName}` : ''}
          base_revision: << pipeline.git.base_revision >>
          revision: <<pipeline.git.revision>>
      - build:
          requires:
            - ggshield-scan${buildJobContext}`;
	} else if (contextEnabled) {
		data.buildWorkflowJob = `      - build:${buildJobContext}`;
	}
}

function _applyDopplerConfig(data, context) {
	if (context.capabilities.includes('doppler')) {
		data.commands += `  install_doppler:
    description: "Install Doppler CLI"
    steps:
      - run:
          name: Install Doppler CLI
          command: |
            if ! command -v doppler &> /dev/null; then
              (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sudo sh
            fi\n`;
	}

	if (
		context.capabilities.includes('cloudflare-wrangler') &&
		context.capabilities.includes('doppler')
	) {
		data.preBuildSteps = `
      - install_doppler
      - run:
          name: Setup Wrangler Config
          command: |
            chmod +x scripts/setup-wrangler-config.sh
            ./scripts/setup-wrangler-config.sh`;
	}
}

function _applyLighthouseConfig(data, context, contextEnabled, contextName) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	if (hasLighthouse) {
		data.lighthouseJobDefinition = `
  lighthouse:
    executor: node/default
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
          override-ci-command: |
            if [ -f package-lock.json ]; then
              npm ci
            else
              npm install
            fi
      - run:
          name: Build
          command: npm run build
      - run:
          name: Run Lighthouse CI
          command: npm install -g @lhci/cli && lhci autorun`;
		data.lighthouseWorkflowJob = `
      - lighthouse:${contextEnabled ? `\n          context: ${contextName}` : ''}
          requires:
            - build`;
	}
}

function _applyCloudflareConfig(data, context, contextEnabled, contextName) {
	if (context.capabilities.includes('cloudflare-wrangler')) {
		let setupWranglerStep = '';
		let syncSecretsStep = '';
		if (context.capabilities.includes('doppler')) {
			setupWranglerStep = `
      - install_doppler
      - run:
          name: Setup Wrangler Config
          environment:
            DOPPLER_CONFIG: << parameters.doppler_config >>
          command: |
            chmod +x scripts/setup-wrangler-config.sh
            ./scripts/setup-wrangler-config.sh "$DOPPLER_CONFIG"`;

			syncSecretsStep = `
      - run:
          name: Sync Doppler Secrets to Cloudflare
          environment:
            CLOUDFLARE_ENV: << parameters.environment >>
            DOPPLER_CONFIG: << parameters.doppler_config >>
          command: |
            chmod +x scripts/sync-doppler-secrets.sh
            if [ "$CLOUDFLARE_ENV" = "default" ] || [ -z "$CLOUDFLARE_ENV" ]; then
              ./scripts/sync-doppler-secrets.sh --config "$DOPPLER_CONFIG" --env "$CLOUDFLARE_ENV"
            else
              if ! ./scripts/sync-doppler-secrets.sh --config "$DOPPLER_CONFIG" --env "$CLOUDFLARE_ENV"; then
                echo "⚠️  Warning: Failed to sync secrets to Cloudflare preview."
              fi
            fi`;
		}

		const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
		const isRustWorker = wranglerConfig.workerType === 'rust';
		let rustJobDefinition = '';
		let rustWorkflowJob = '';
		let installRustStep = '';
		let requiresList = '\n            - build';

		if (isRustWorker) {
			rustJobDefinition = `
  test-rust:
    docker:
      - image: cimg/rust:1.90.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - cargo-cache-{{ checksum "worker/Cargo.toml" }}
            - cargo-cache-
      - run:
          name: Rust Toolchain Info
          command: rustc --version && cargo --version
      - run:
          name: Rust Test
          command: cd worker && cargo test
      - save_cache:
          paths:
            - ~/.cargo/registry
            - ~/.cargo/git
            - worker/target
          key: cargo-cache-{{ checksum "worker/Cargo.toml" }}\n`;

			rustWorkflowJob = `
      - test-rust:${contextEnabled ? `\n          context: ${contextName}` : ''}
          requires:
            - build`;

			installRustStep = `
      - run:
          name: Install Rust
          command: |
            if ! command -v cargo &> /dev/null; then
              curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
              echo 'source "$HOME/.cargo/env"' >> $BASH_ENV
            fi`;

			requiresList = `\n            - build\n            - test-rust`;
		}

		data.deployJobDefinition =
			rustJobDefinition +
			`
  deploy-to-cloudflare:
    executor: node/default
    parameters:
      environment:
        type: string
        default: "default"
      doppler_config:
        type: string
        default: "stg"
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-deps-{{ checksum "package.json" }}
            - v1-deps-
      - run:
          name: Install Packages
          command: |
            if [ -f package-lock.json ]; then
              npm ci
            else
              npm install
            fi
      - save_cache:
          paths:
            - node_modules
          key: v1-deps-{{ checksum "package.json" }}${setupWranglerStep}
      - run:
          name: Build
          command: npm run build${installRustStep}
      - run:
          name: Deploy to Cloudflare Workers
          command: |
            export PATH="$HOME/.cargo/bin:$PATH"
            ENV_VAL="<< parameters.environment >>"
            if [ -d worker ]; then cd worker; fi
            if [ "$ENV_VAL" = "default" ] || [ -z "$ENV_VAL" ]; then
              npx wrangler deploy
            else
              npx wrangler deploy --env "$ENV_VAL"
            fi${syncSecretsStep}`;

		data.deployWorkflowJob =
			rustWorkflowJob +
			`
      - deploy-to-cloudflare:${contextEnabled ? `\n          context: ${contextName}` : ''}
          environment: "default"
          doppler_config: "stg"
          requires:${requiresList}
          filters:
            branches:
              only: main
      - deploy-to-cloudflare:${contextEnabled ? `\n          context: ${contextName}` : ''}
          name: deploy-to-cloudflare-preview
          environment: "preview"
          doppler_config: "stg"
          requires:${requiresList}
          filters:
            branches:
              ignore: main`;
	}
}

function _applyEslintSonarjsConfig(data, context) {
	if (
		context.capabilities.includes('code-quality') ||
		context.capabilities.includes('devcontainer-node')
	) {
		data.testSteps += `      - run:
          name: Lint (ESLint + SonarJS)
          command: npm run lint\n`;
	}
}

const DOCKER_REGISTRY_PREFIXES = {
	ghcr: 'ghcr.io',
	dockerhub: 'docker.io',
	quay: 'quay.io'
};

const DOCKER_REGISTRY_CREDENTIAL_VARS = {
	ghcr: { user: 'GHCR_USERNAME', token: 'GHCR_TOKEN' },
	dockerhub: { user: 'DOCKERHUB_USERNAME', token: 'DOCKERHUB_TOKEN' },
	quay: { user: 'QUAY_ROBOT_USERNAME', token: 'QUAY_ROBOT_TOKEN' }
};

function getDockerRegistryPrefix(registry) {
	return DOCKER_REGISTRY_PREFIXES[registry] || DOCKER_REGISTRY_PREFIXES.ghcr;
}

/**
 * Builds template data for the docker-container deployment capability.
 * Provides language-aware Dockerfile fragments, compose fragments, and
 * registry metadata for generated deploy artifacts.
 * @param {Object} context - Generation context (capabilities, configuration, projectName)
 * @returns {Object} Data consumed by the docker-container templates
 */
function getDockerContainerTemplateData(context) {
	const config = context.configuration?.['docker-container'] || {};
	const registry = config.registry || 'ghcr';
	const networkMode = config.networkMode || 'bridge';
	const exposePort = config.exposePort ?? 3000;
	const watchtower = config.watchtower !== false;
	const homepage = config.homepage !== false;
	const projectName = context.projectName || 'my-project';
	const registryPrefix = getDockerRegistryPrefix(registry);

	const isPython = (context.capabilities || []).some((c) => c.startsWith('devcontainer-python'));
	const isNode = (context.capabilities || []).some(
		(c) => c === 'devcontainer-node' || c === 'sveltekit'
	);
	const dockerBaseImage = isPython ? 'python:3.12-slim' : 'node:22-alpine';

	const dockerSetupCommands = isPython
		? `RUN python -m venv /opt/venv\nENV PATH="/opt/venv/bin:$PATH"\nCOPY requirements.txt* ./\nRUN pip install --no-cache-dir -r requirements.txt`
		: `COPY package.json package-lock.json* ./\nRUN npm ci || npm install\nRUN npm run build`;

	const dockerHealthcheck = isPython
		? '# HEALTHCHECK skipped for python images by default (install curl/wget first)'
		: `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD wget -qO- http://127.0.0.1:${exposePort}/health || exit 1`;

	const dockerRunCommand = isPython
		? '# TODO: set your entrypoint, e.g.: CMD ["python", "main.py"]\nCMD ["python", "main.py"]'
		: '# TODO: adjust for your framework output, e.g. SvelteKit adapter-node: CMD ["node", "build/index.js"]\nCMD ["node", "build/index.js"]';

	const networkModeLine = networkMode === 'host' ? '    network_mode: host' : '';
	const portsConfig =
		networkMode === 'host' ? '' : `    ports:\n      - "${exposePort}:${exposePort}"`;

	const labels = [];
	if (watchtower || homepage) labels.push('    labels:');
	if (watchtower) labels.push('      - "com.centurylinklabs.watchtower.enable=true"');
	if (homepage) {
		labels.push(
			'      - "homepage.group=Services"',
			`      - "homepage.name=${projectName}"`,
			`      - "homepage.href=http://YOUR_NAS_HOST:${exposePort}/"`,
			'      - "homepage.widget.type=customapi"',
			`      - "homepage.widget.url=http://localhost:${exposePort}/health"`
		);
	}

	return {
		registryPrefix,
		dockerBaseImage,
		dockerSetupCommands,
		dockerHealthcheck,
		dockerRunCommand,
		exposePort: String(exposePort),
		networkMode,
		networkModeLine,
		portsConfig,
		composeLabels: labels.join('\n'),
		watchtower: String(watchtower),
		homepage: String(homepage)
	};
}

/**
 * Adds a docker-publish job to the CircleCI config data when the
 * docker-container deployment capability is selected.
 * @param {Object} data - CircleCI template data (mutated)
 * @param {Object} context - Generation context
 * @param {boolean} contextEnabled - Whether the CircleCI context is enabled
 * @param {string} contextName - CircleCI context name
 */
function _applyDockerContainerConfig(data, context, contextEnabled, contextName) {
	if (!context.capabilities.includes('docker-container')) {
		return;
	}

	const config = context.configuration?.['docker-container'] || {};
	const registry = config.registry || 'ghcr';
	const registryPrefix = getDockerRegistryPrefix(registry);
	const projectName = context.projectName || 'my-project';
	const imageRef = `${registryPrefix}/OWNER/${projectName}`;
	const credentialVars =
		DOCKER_REGISTRY_CREDENTIAL_VARS[registry] || DOCKER_REGISTRY_CREDENTIAL_VARS.ghcr;

	data.deployJobDefinition = `
  docker-publish:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - setup_remote_docker
      - run:
          name: Login to Container Registry
          command: |
            echo "$${credentialVars.token}" | docker login ${registryPrefix} -u "$${credentialVars.user}" --password-stdin
      - run:
          name: Build and Push Docker Image
          command: |
            docker build -t ${imageRef}:$CIRCLE_SHA1 -t ${imageRef}:latest .
            docker push ${imageRef}:$CIRCLE_SHA1
            docker push ${imageRef}:latest`;

	data.deployWorkflowJob = `
      - docker-publish:${contextEnabled ? `\n          context: ${contextName}` : ''}
          requires:
            - build
          filters:
            branches:
              only: main`;
}

function getCircleCiTemplateData(context) {
	const data = {
		preBuildSteps: '',
		testSteps: '',
		lighthouseJobDefinition: '',
		lighthouseWorkflowJob: '',
		deployJobDefinition: '',
		deployWorkflowJob: '',
		orbs: '',
		commands: '',
		additionalWorkflowJobs: '',
		buildWorkflowJob: '      - build',
		jobEnvironment: ''
	};

	const contextConfig = context.configuration?.circleci?.context;
	// Default enabled is true, default name is 'common'
	const contextEnabled = contextConfig?.enabled ?? true;
	const contextName = contextConfig?.name || 'common';

	const buildJobContext = contextEnabled ? `\n          context: ${contextName}` : '';

	_applyGitGuardianConfig(data, context, contextEnabled, contextName, buildJobContext);
	_applyDopplerConfig(data, context);
	_applyLighthouseConfig(data, context, contextEnabled, contextName);
	_applyCloudflareConfig(data, context, contextEnabled, contextName);
	_applyDockerContainerConfig(data, context, contextEnabled, contextName);

	if (
		context.capabilities.includes('devcontainer-node') &&
		context.capabilities.includes('circleci')
	) {
		data.testSteps += `      - run:
          name: Test with Coverage
          command: npx vitest --coverage\n`;
	}

	_applyEslintSonarjsConfig(data, context);

	if (data.commands) {
		data.commands = `commands:\n${data.commands}`;
	}

	return data;
}

function getDependabotTemplateData(context) {
	const config = context.configuration?.dependabot || {};
	const interval = config.updateSchedule || 'weekly';
	const updates = [
		`
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "${interval}"`
	];

	// Always add GitHub Actions

	if (context.capabilities.includes('devcontainer-node')) {
		updates.push(`
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "${interval}"`);
	}

	if (context.capabilities.some((c) => c.startsWith('devcontainer-python'))) {
		updates.push(`
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "${interval}"`);
	}

	// Java support
	if (context.capabilities.some((c) => c.startsWith('devcontainer-java'))) {
		updates.push(`
  - package-ecosystem: "maven"
    directory: "/"
    schedule:
      interval: "${interval}"`);
	}

	// Rust support (devcontainer-rust or cloudflare-wrangler with workerType: rust)
	const hasRustDevcontainer = context.capabilities.some((c) => c.startsWith('devcontainer-rust'));
	const hasRustWorker =
		context.capabilities.includes('cloudflare-wrangler') &&
		context.configuration?.['cloudflare-wrangler']?.workerType === 'rust';
	if (hasRustDevcontainer || hasRustWorker) {
		const directory = hasRustWorker ? '/worker' : '/';
		updates.push(`
  - package-ecosystem: "cargo"
    directory: "${directory}"
    schedule:
      interval: "${interval}"`);
	}

	return {
		dependabotUpdates: updates.join('')
	};
}

export { getGooseMcpConfig };

export function getCapabilityTemplateData(capabilityId, context) {
	const dataGenerators = {
		'coding-agents': getCodingAgentsTemplateData,
		sonarcloud: getSonarCloudTemplateData,
		circleci: getCircleCiTemplateData,
		dependabot: getDependabotTemplateData,
		'docker-container': getDockerContainerTemplateData
	};

	const generator = dataGenerators[capabilityId];
	return generator ? generator(context) : {};
}

export function applyDefaults(capability, config) {
	const finalConfig = { ...config };
	if (capability?.configurationSchema?.properties) {
		for (const [key, property] of Object.entries(capability.configurationSchema.properties)) {
			if (finalConfig[key] === undefined && property.default !== undefined) {
				finalConfig[key] = property.default;
			}
		}
	}
	return finalConfig;
}
