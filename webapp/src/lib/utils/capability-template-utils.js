import { capabilities } from '$lib/config/capabilities.js';

/**
 * Merges user configuration with capability defaults.
 * @param {string} capabilityId - The ID of the capability.
 * @param {Object} userConfig - The user-provided configuration.
 * @returns {Object} The merged configuration.
 */
export function getCapabilityConfig(capabilityId, userConfig) {
	const capability = capabilities.find((c) => c.id === capabilityId);
	const config = userConfig || {};

	if (!capability?.configurationSchema?.properties) {
		return config;
	}

	const defaults = {};
	for (const [key, prop] of Object.entries(capability.configurationSchema.properties)) {
		if (prop.default !== undefined) {
			defaults[key] = prop.default;
		}
	}

	return { ...defaults, ...config };
}

export function getCapabilityTemplateData(capabilityId, context) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	// Retrieve the configuration for the specific capability if it exists
	const capabilityConfig = getCapabilityConfig(capabilityId, context.config?.[capabilityId]);
	const deployTarget = capabilityConfig.deployTarget;

	if (capabilityId === 'sonarcloud') {
		const config = getCapabilityConfig('sonarcloud', context.configuration?.sonarcloud);
		const language = config.language || 'JavaScript';
		let languageSettings = '';

		if (language === 'JavaScript') {
			languageSettings = 'sonar.javascript.lcov.reportPaths=coverage/lcov.info';
		} else if (language === 'Python') {
			languageSettings = 'sonar.python.coverage.reportPaths=coverage.xml';
		} else if (language === 'Java') {
			languageSettings = 'sonar.java.binaries=.';
		}

		return {
			sonarLanguageSettings: languageSettings,
			organization: ''
		};
	}

	if (capabilityId === 'circleci') {
		let data = {
			lighthouseJobDefinition: '',
			lighthouseWorkflowJob: '',
			deployJobDefinition: '',
			deployWorkflowJob: ''
		};

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

		if (deployTarget === 'cloudflare') {
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

	return {};
}
