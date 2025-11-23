export function getCapabilityTemplateData(capabilityId, context) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	// Retrieve the configuration for the specific capability if it exists
	const capabilityConfig = context.config?.[capabilityId] || {};
	const deployTarget = capabilityConfig.deployTarget;

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
