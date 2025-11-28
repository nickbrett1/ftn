export function getCapabilityTemplateData(capabilityId, context) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	// Retrieve the configuration for the specific capability if it exists
	// The context object structure passed from file-generator.js has 'configuration' property, not 'config'
	const capabilityConfig = context.configuration?.[capabilityId] || {};
	const deployTarget = capabilityConfig.deployTarget;

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

		// Check if explicit deploy target is set OR if wrangler capability is present which implies cloudflare deployment
		if (deployTarget === 'cloudflare' || context.capabilities.includes('cloudflare-wrangler')) {
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
