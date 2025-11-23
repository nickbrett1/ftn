export function getCapabilityTemplateData(capabilityId, context) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	// Retrieve the configuration for the specific capability if it exists
	const capabilityConfig = context.config?.[capabilityId] || {};
	const deployTarget = capabilityConfig.deployTarget;

	if (capabilityId === 'sonarcloud') {
		const config = context.configuration?.sonarcloud || {};
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
		return hasLighthouse
			? {
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
				}
			: {
					lighthouseJobDefinition: '',
					lighthouseWorkflowJob: ''
				};
	}

	return {};
}
