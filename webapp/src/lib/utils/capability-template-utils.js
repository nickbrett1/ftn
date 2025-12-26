function getCodingAgentsTemplateData(context) {
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

function getCircleCiTemplateData(context) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	const data = {
		preBuildSteps: '',
		lighthouseJobDefinition: '',
		lighthouseWorkflowJob: '',
		deployJobDefinition: '',
		deployWorkflowJob: '',
		orbs: '',
		additionalWorkflowJobs: '',
		buildWorkflowJob: '      - build'
	};

	const contextConfig = context.configuration?.circleci?.context;
	// Default enabled is true, default name is 'common'
	const contextEnabled = contextConfig?.enabled ?? true;
	const contextName = contextConfig?.name || 'common';

	if (contextEnabled) {
		data.buildWorkflowJob = `      - build:
          context: ${contextName}`;
	}

	if (context.capabilities.includes('gitguardian')) {
		data.orbs += `  ggshield: gitguardian/ggshield@1\n`;
		data.additionalWorkflowJobs += `
      - ggshield/scan:
          name: ggshield-scan${contextEnabled ? `\n          context: ${contextName}` : ''}
          base_revision: << pipeline.git.base_revision >>
          revision: <<pipeline.git.revision>>`;
	}

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
      - lighthouse:${contextEnabled ? `\n          context: ${contextName}` : ''}
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
      - deploy-to-cloudflare:${contextEnabled ? `\n          context: ${contextName}` : ''}
          requires:
            - build`;
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
