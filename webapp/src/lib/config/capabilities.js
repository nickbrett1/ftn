/**
 * @fileoverview Project capability definitions for the genproj tool
 * @description Defines all available project capabilities with their requirements and dependencies
 */

/**
 * @typedef {Object} CapabilityDefinition
 * @property {string} id - Unique capability identifier
 * @property {string} name - Human-readable name
 * @property {string} description - Detailed description
 * @property {'devcontainer'|'ci-cd'|'code-quality'|'secrets'|'deployment'|'monitoring'|'project-structure'} category
 * @property {string} [url] - URL to official documentation or project page
 * @property {string[]} dependencies - Required capabilities
 * @property {string[]} conflicts - Conflicting capabilities
 * @property {string[]} requiresAuth - Required authentication services
 * @property {Object} configurationSchema - Configuration validation schema
 * @property {TemplateReference[]} templates - Associated file templates
 * @property {Object} [externalService] - External service configuration
 */

/**
 * @typedef {Object} TemplateReference
 * @property {string} id - Template identifier
 * @property {string} filePath - Target file path in repository
 * @property {string} templateId - Source template identifier
 * @property {Object} [variables] - Template variables
 */

const devcontainerBase = {
	category: 'devcontainer',
	dependencies: [],
	conflicts: [],
	requiresAuth: [],
	templates: [
		{
			id: 'devcontainer-json',
			filePath: '.devcontainer/devcontainer.json'
		},
		{
			id: 'dockerfile',
			filePath: '.devcontainer/Dockerfile'
		},
		{
			id: 'zshrc',
			filePath: '.devcontainer/.zshrc',
			templateId: 'devcontainer-zshrc'
		},
		{
			id: 'p10k',
			filePath: '.devcontainer/.p10k.zsh',
			templateId: 'devcontainer-p10k-zsh'
		},
		{
			id: 'setup-sh',
			filePath: '.devcontainer/setup.sh',
			templateId: 'devcontainer-setup-sh',
			isExecutable: true
		}
	]
};

/**
 * Available project capabilities
 * @type {CapabilityDefinition[]}
 */
export const capabilities = [
	{
		...devcontainerBase,
		id: 'devcontainer-node',
		name: 'Node.js DevContainer Support',
		description: 'Adds Node.js runtime and npm to your development container',
		url: 'https://code.visualstudio.com/docs/devcontainers/containers-overview',
		configurationSchema: {
			type: 'object',
			properties: {
				nodeVersion: { type: 'string', enum: ['22', '20', '18'], default: '22' }
			}
		},
		templates: devcontainerBase.templates.map((t) => {
			if (t.id === 'devcontainer-json') {
				return { ...t, templateId: 'devcontainer-node-json' };
			}
			if (t.id === 'dockerfile') {
				return { ...t, templateId: 'devcontainer-node-dockerfile' };
			}
			return t;
		})
	},
	{
		...devcontainerBase,
		id: 'devcontainer-python',
		name: 'Python DevContainer Support',
		description: 'Adds Python runtime and pip to your development container',
		url: 'https://code.visualstudio.com/docs/devcontainers/containers-overview',
		configurationSchema: {
			type: 'object',
			properties: {
				pythonVersion: { type: 'string', enum: ['3.12', '3.11', '3.10', '3.9'], default: '3.12' }
			}
		},
		templates: devcontainerBase.templates.map((t) => {
			if (t.id === 'devcontainer-json') {
				return { ...t, templateId: 'devcontainer-python-json' };
			}
			if (t.id === 'dockerfile') {
				return { ...t, templateId: 'devcontainer-python-dockerfile' };
			}
			return t;
		})
	},
	{
		...devcontainerBase,
		id: 'devcontainer-java',
		name: 'Java DevContainer Support',
		description: 'Adds Java runtime to your development container',
		url: 'https://code.visualstudio.com/docs/devcontainers/containers-overview',
		configurationSchema: {
			type: 'object',
			properties: {
				javaVersion: { type: 'string', enum: ['21', '17', '11'], default: '21' }
			}
		},
		templates: devcontainerBase.templates.map((t) => {
			if (t.id === 'devcontainer-json') {
				return { ...t, templateId: 'devcontainer-java-json' };
			}
			if (t.id === 'dockerfile') {
				return { ...t, templateId: 'devcontainer-java-dockerfile' };
			}
			return t;
		})
	},
	{
		id: 'circleci',
		name: 'CircleCI CI/CD',
		description: 'Continuous integration and deployment with CircleCI',
		url: 'https://circleci.com',
		category: 'ci-cd',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['circleci'],
		configurationSchema: {
			type: 'object',
			properties: {}
		},
		templates: [
			{ id: 'circleci-config', filePath: '.circleci/config.yml', templateId: 'circleci-config' }
		],
		externalService: {
			service: 'circleci',
			projectCreation: true,
			fallbackInstructions:
				'Create a CircleCI project manually and connect it to your GitHub repository'
		}
	},
	{
		id: 'sonarcloud',
		name: 'SonarCloud Code Quality',
		description: 'Code quality analysis and security scanning with SonarCloud',
		url: 'https://sonarcloud.io',
		category: 'code-quality',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['sonarcloud'],
		configurationSchema: {
			type: 'object',
			properties: {
				languages: {
					type: 'array',
					items: { type: 'string', enum: ['javascript', 'typescript', 'python', 'java'] },
					default: ['javascript']
				},
				qualityGate: { type: 'string', enum: ['default', 'strict'], default: 'default' }
			}
		},
		templates: [
			{ id: 'sonar-config', filePath: 'sonar-project.properties', templateId: 'sonarcloud-config' }
		],
		externalService: {
			service: 'sonarcloud',
			projectCreation: true,
			fallbackInstructions:
				'Create a SonarCloud project manually and configure it for your repository'
		}
	},
	{
		id: 'sonarlint',
		name: 'SonarLint for VS Code',
		description: 'VS Code extension configuration for SonarLint code quality analysis',
		url: 'https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarlint-vscode',
		category: 'code-quality',
		dependencies: ['sonarcloud', 'devcontainer-java'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {}
		},
		templates: [
			{
				id: 'sonarlint-config',
				filePath: '.vscode/settings.json',
				templateId: 'sonarlint-vscode-config'
			}
		]
	},
	{
		id: 'doppler',
		name: 'Doppler Secrets Management',
		description: 'Secure secrets management for web projects',
		url: 'https://doppler.com',
		category: 'secrets',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['doppler'],
		configurationSchema: {
			type: 'object',
			properties: {
				environments: {
					type: 'array',
					items: { type: 'string' },
					default: ['dev', 'staging', 'prod']
				}
			}
		},
		templates: [{ id: 'doppler-config', filePath: 'doppler.yaml', templateId: 'doppler-config' }],
		externalService: {
			service: 'doppler',
			projectCreation: true,
			fallbackInstructions: 'Create a Doppler project manually and configure environment variables'
		}
	},
	{
		id: 'cloudflare-wrangler',
		name: 'Cloudflare Wrangler',
		description: 'Cloudflare Workers development and deployment configuration',
		url: 'https://developers.cloudflare.com/workers',
		category: 'deployment',
		dependencies: ['devcontainer-node'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {}
		},
		templates: [
			{ id: 'wrangler-config', filePath: 'wrangler.jsonc', templateId: 'wrangler-config' }
		]
	},
	{
		id: 'dependabot',
		name: 'Dependabot',
		description: 'Automated dependency updates and security alerts',
		url: 'https://github.com/dependabot',
		category: 'monitoring',
		dependencies: ['devcontainer-node'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {}
		},
		templates: [
			{
				id: 'dependabot-config',
				filePath: '.github/dependabot.yml',
				templateId: 'dependabot-config'
			}
		]
	},
	{
		id: 'lighthouse-ci',
		name: 'Lighthouse CI',
		description: 'Automated performance and accessibility testing',
		url: 'https://github.com/GoogleChrome/lighthouse-ci',
		category: 'monitoring',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				thresholds: {
					type: 'object',
					properties: {
						performance: { type: 'number', minimum: 0, maximum: 100, default: 90 },
						accessibility: { type: 'number', minimum: 0, maximum: 100, default: 90 },
						bestPractices: { type: 'number', minimum: 0, maximum: 100, default: 90 },
						seo: { type: 'number', minimum: 0, maximum: 100, default: 90 }
					}
				}
			}
		},
		templates: [
			{ id: 'lighthouse-config', filePath: '.lighthouse.cjs', templateId: 'lighthouse-ci-config' }
		]
	},
	{
		id: 'playwright',
		name: 'Playwright Testing',
		description: 'End-to-end testing with Playwright',
		url: 'https://playwright.dev',
		category: 'monitoring',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				testDir: { type: 'string', default: 'tests/e2e' }
			}
		},
		templates: [
			{ id: 'playwright-config', filePath: 'playwright.config.js', templateId: 'playwright-config' }
		]
	},
	{
		id: 'spec-kit',
		name: 'Spec Kit',
		description: 'Specification-driven development toolkit with templates and workflows',
		url: 'https://github.com/github/spec-kit',
		category: 'project-structure',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				includeConstitution: { type: 'boolean', default: true }
			}
		},
		templates: []
	}
];

/**
 * Get capability by ID
 * @param {string} id - Capability ID
 * @returns {CapabilityDefinition|undefined} Capability definition
 */
export function getCapabilityById(id) {
	return capabilities.find((cap) => cap.id === id);
}

/**
 * Get capabilities by category
 * @param {string} category - Capability category
 * @returns {CapabilityDefinition[]} Capabilities in category
 */
export function getCapabilitiesByCategory(category) {
	return capabilities.filter((cap) => cap.category === category);
}

/**
 * Validate capability dependencies
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {Object} Validation result with missing dependencies
 */
export function validateCapabilityDependencies(selectedCapabilities) {
	const missing = [];
	const conflicts = [];

	for (const capabilityId of selectedCapabilities) {
		const capability = getCapabilityById(capabilityId);
		if (!capability) continue;

		// Check dependencies
		for (const depId of capability.dependencies) {
			if (!selectedCapabilities.includes(depId)) {
				missing.push({ capability: capabilityId, dependency: depId });
			}
		}

		// Check conflicts
		for (const conflictId of capability.conflicts) {
			if (selectedCapabilities.includes(conflictId)) {
				conflicts.push({ capability: capabilityId, conflict: conflictId });
			}
		}
	}

	return { missing, conflicts, valid: missing.length === 0 && conflicts.length === 0 };
}

/**
 * Get required authentication services for selected capabilities
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {string[]} Required authentication service IDs
 */
export function getRequiredAuthServices(selectedCapabilities) {
	const required = new Set();

	for (const capabilityId of selectedCapabilities) {
		const capability = getCapabilityById(capabilityId);
		if (capability) {
			for (const service of capability.requiresAuth) {
				required.add(service);
			}
		}
	}

	return Array.from(required);
}
