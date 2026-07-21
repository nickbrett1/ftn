function getCodingAgentsTemplateData(context) {
	const hasSonarQube = context.capabilities.includes('sonarcloud');
	const hasCircleCI = context.capabilities.includes('circleci');
	const hasDoppler = context.capabilities.includes('doppler');

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

	return {
		sonarQubeMcpConfig,
		circleCiMcpConfig,
		githubMcpConfig,
		dopplerMcpConfig
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

	return {
		sonarLanguageSettings: languageSettings,
		organization: config.organization || 'bem'
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
      - image: cimg/rust:1.86.0
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

		data.deployJobDefinition = rustJobDefinition + `
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
          key: v1-deps-{{ checksum "package.json" }}${setupWranglerStep}${syncSecretsStep}
      - run:
          name: Build
          command: npm run build${installRustStep}
      - run:
          name: Deploy to Cloudflare Workers
          command: |
            ENV_VAL="<< parameters.environment >>"
            if [ "$ENV_VAL" = "default" ] || [ -z "$ENV_VAL" ]; then
              npx wrangler deploy
            else
              npx wrangler deploy --env "$ENV_VAL"
            fi`;

		data.deployWorkflowJob = rustWorkflowJob + `
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

function _applySonarCloudConfig(data, context) {
	if (context.capabilities.includes('sonarcloud')) {
		data.orbs += `  sonarcloud: sonarsource/sonarcloud@4.0.0\n`;
		data.preBuildSteps += String.raw`
      - run:
          name: Export SonarCloud Token
          command: echo "export SONAR_TOKEN=\$SONARQUBE_TOKEN" >> $BASH_ENV`;

		data.testSteps += `      - sonarcloud/scan\n`;
	}
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

	if (
		context.capabilities.includes('devcontainer-node') &&
		context.capabilities.includes('circleci')
	) {
		if (context.capabilities.includes('sonarcloud')) {
			data.testSteps += `      - run:
          name: Test with Coverage
          command: npx vitest --coverage\n`;
		} else {
			data.testSteps += `      - run:
          name: Test
          command: npm run test\n`;
		}
	}

	_applySonarCloudConfig(data, context);

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

	return {
		dependabotUpdates: updates.join('')
	};
}

export function getCapabilityTemplateData(capabilityId, context) {
	const dataGenerators = {
		'coding-agents': getCodingAgentsTemplateData,
		sonarcloud: getSonarCloudTemplateData,
		circleci: getCircleCiTemplateData,
		dependabot: getDependabotTemplateData
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
