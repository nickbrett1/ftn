export function getCapabilityTemplateData(capabilityId, context) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	// Retrieve the configuration for the specific capability if it exists
	// The context object structure passed from file-generator.js has 'configuration' property, not 'config'
	const capabilityConfig = context.configuration?.[capabilityId] || {};
	const deployTarget = capabilityConfig.deployTarget;

	if (capabilityId === 'coding-agents') {
		const hasSonarQube = context.capabilities.includes('sonarcloud');
		const hasCircleCI = context.capabilities.includes('circleci');

		let sonarQubeMcpConfig = '';
		if (hasSonarQube) {
			sonarQubeMcpConfig = `,
    "sonarqube": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--name",
        "sonarqube-mcp-server",
        "sonarqube-mcp-server"
      ],
      "env": {
        "SONAR_TOKEN": "$SONAR_TOKEN",
        "SONAR_HOST_URL": "$SONAR_HOST_URL"
      }
    }`;
		}

		let circleCiMcpConfig = '';
		if (hasCircleCI) {
			circleCiMcpConfig = `,
    "circleci": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-circleci"
      ],
      "env": {
        "CIRCLE_API_TOKEN": "$CIRCLE_API_TOKEN"
      }
    }`;
		}

		return {
			sonarQubeMcpConfig,
			circleCiMcpConfig
		};
	}

	if (capabilityId === 'sonarcloud') {
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
			organization: ''
		};
	}

	if (capabilityId === 'circleci') {
		let data = {
			preBuildSteps: '',
			lighthouseJobDefinition: '',
			lighthouseWorkflowJob: '',
			deployJobDefinition: '',
			deployWorkflowJob: ''
		};

		if (
			context.capabilities.includes('cloudflare-wrangler') &&
			context.capabilities.includes('doppler')
		) {
			data.preBuildSteps = `
      - run:
          name: Setup Wrangler Config
          command: |
            chmod +x scripts/setup-wrangler-config.sh
            ./scripts/setup-wrangler-config.sh`;
		}

		if (hasLighthouse) {
			data.lighthouseJobDefinition = `
  lighthouse:
    executor: node/default
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Build
          command: npm run build
      - run:
          name: Run Lighthouse CI
          command: npm install -g @lhci/cli && lhci autorun`;
			data.lighthouseWorkflowJob = `
      - lighthouse:
          requires:
            - build`;
		}

		// Check if wrangler capability is present which implies cloudflare deployment
		if (context.capabilities.includes('cloudflare-wrangler')) {
			data.deployJobDefinition = `
  deploy-to-cloudflare:
    executor: node/default
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Build
          command: npm run build
      - run:
          name: Deploy to Cloudflare Workers
          command: npx wrangler deploy
          environment:
            CLOUDFLARE_API_TOKEN: \${CLOUDFLARE_API_TOKEN}
            CLOUDFLARE_ACCOUNT_ID: \${CLOUDFLARE_ACCOUNT_ID}`;

			data.deployWorkflowJob = `
      - deploy-to-cloudflare:
          requires:
            - build`;
		}

		return data;
	}

	if (capabilityId === 'dependabot') {
		const config = context.configuration?.dependabot || {};
		const interval = config.updateSchedule || 'weekly';
		const updates = [];

		// Always add GitHub Actions
		updates.push(`
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "${interval}"`);

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

	return {};
}

export function applyDefaults(capability, config) {
	const finalConfig = { ...config };
	if (capability && capability.configurationSchema && capability.configurationSchema.properties) {
		for (const [key, prop] of Object.entries(capability.configurationSchema.properties)) {
			if (finalConfig[key] === undefined && prop.default !== undefined) {
				finalConfig[key] = prop.default;
			}
		}
	}
	return finalConfig;
}
