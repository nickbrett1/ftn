export function getCapabilityTemplateData(capabilityId, context) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');

	if (capabilityId === 'circleci') {
		if (hasLighthouse) {
			return {
				lighthouseJobDefinition: `
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
          command: npm install -g @lhci/cli && lhci autorun`,
				lighthouseWorkflowJob: `
      - lighthouse:
          requires:
            - build`
			};
		} else {
			return {
				lighthouseJobDefinition: '',
				lighthouseWorkflowJob: ''
			};
		}
	}

	return {};
}
