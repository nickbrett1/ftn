// webapp/src/lib/config/capabilities.js

/**
 * Defines the available project capabilities for the Project Generation Tool.
 * Each capability includes metadata and dependencies.
 */

// Common constants to reduce duplication
const CATEGORY_CORE = 'core';
const CATEGORY_DEVCONTAINER = 'devcontainer';
const CATEGORY_CODE_QUALITY = 'code-quality';
const CATEGORY_PROJECT_STRUCTURE = 'project-structure';
const CATEGORY_SECRETS = 'secrets';
const CATEGORY_DEPLOYMENT = 'deployment';
const CATEGORY_MONITORING = 'monitoring';
const CATEGORY_CI_CD = 'ci-cd';

const REQ_DOCKER = ['docker'];
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const CONFIG_SCHEMA_EMPTY = { type: 'object', properties: EMPTY_OBJECT };

/**
 * Helper to create a standard external service configuration
 * @param {string} type Service type
 * @param {string} name Service name
 * @param {string} createDesc Description for create action
 * @param {string} configDesc Description for configure action
 * @returns {Array} External services array
 */
function createExternalServiceConfig(type, name, createDesc, configDesc) {
	return [
		{
			type,
			name,
			actions: [
				{ type: 'create', description: createDesc },
				{ type: 'configure', description: configDesc }
			],
			requiresAuth: true
		}
	];
}

/**
 * Creates a devcontainer capability object.
 * @param {string} id - The unique identifier for the capability.
 * @param {string} name - The display name of the capability.
 * @param {string} description - A brief description of the capability.
 * @param {object} configurationSchema - The schema for configuring the capability.
 * @returns {object} A devcontainer capability object.
 */
function createDevContainerCapability(id, name, description, configurationSchema) {
	const lang = id.split('-')[1]; // e.g., 'node', 'python', 'java'
	const capName = lang.charAt(0).toUpperCase() + lang.slice(1);
	return {
		id,
		name,
		description,
		category: CATEGORY_DEVCONTAINER,
		dependencies: REQ_DOCKER,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema,
		benefits: [
			'Instant development environment setup for new contributors',
			`Pre-configured ${capName} runtime and VS Code extensions`,
			'Consistent tooling across the entire engineering team'
		],
		templates: [
			{
				id: 'devcontainer-json',
				filePath: '.devcontainer/devcontainer.json',
				templateId: `devcontainer-${lang}-json`
			},
			{
				id: 'dockerfile',
				filePath: '.devcontainer/Dockerfile',
				templateId: `devcontainer-${lang}-dockerfile`
			},
			{ id: 'zshrc', filePath: '.devcontainer/.zshrc', templateId: 'devcontainer-zshrc-full' },
			{ id: 'p10k', filePath: '.devcontainer/.p10k.zsh', templateId: 'devcontainer-p10k-zsh-full' },
			{
				id: 'setup-sh',
				filePath: '.devcontainer/post-create-setup.sh',
				templateId: 'devcontainer-post-create-setup-sh',
				isExecutable: true
			}
		],
		website: 'https://code.visualstudio.com/docs/devcontainers/containers'
	};
}

export const capabilities = [
	{
		id: 'coding-agents',
		name: 'AI Coding Agents',
		description: 'Gemini CLI, Cursor CLI, and Svelte MCP integration.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Gemini CLI pre-installed',
			'Cursor CLI pre-installed',
			'Svelte MCP for context-aware AI'
		],
		templates: EMPTY_ARRAY,
		links: [
			{ label: 'Gemini', url: 'https://ai.google.dev/gemini-api/docs/quickstart' },
			{ label: 'Cursor', url: 'https://cursor.sh' },
			{ label: 'Svelte MCP', url: 'https://mcp.svelte.dev/' }
		]
	},
	{
		id: 'editor-tools',
		name: 'Editor Configuration',
		description: 'Standard VS Code extensions and settings.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'ESLint & Prettier configured',
			'Svelte VS Code extension',
			'Consistent workspace settings'
		],
		templates: EMPTY_ARRAY
	},
	{
		id: 'shell-tools',
		name: 'Shell & Terminal',
		description: 'Zsh with Powerlevel10k and productivity plugins.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: ['Oh My Zsh', 'Powerlevel10k Theme', 'Syntax Highlighting & Autosuggestions'],
		templates: EMPTY_ARRAY,
		website: 'https://github.com/romkatv/powerlevel10k'
	},
	{
		id: 'spec-kit',
		name: 'SpecKit',
		description: 'Project specification tools by GitHub.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Define your project specifications as code',
			'Generate documentation automatically from specs',
			'Ensure project alignment with requirements'
		],
		templates: EMPTY_ARRAY,
		website: 'https://github.com/github/spec-kit'
	},
	{
		id: 'docker',
		name: 'Docker',
		description: 'Docker support for the project.',
		category: 'internal',
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Containerize your application for consistent execution',
			'Eliminate "works on my machine" issues',
			'Simplify dependency management and isolation'
		],
		templates: EMPTY_ARRAY,
		website: 'https://www.docker.com/'
	},
	createDevContainerCapability(
		'devcontainer-node',
		'Node.js DevContainer',
		'Sets up a VS Code DevContainer with Node.js environment.',
		{
			type: 'object',
			properties: {
				nodeVersion: { type: 'string', enum: ['18', '20', '22'], default: '22' }
			},
			required: EMPTY_ARRAY
		}
	),
	createDevContainerCapability(
		'devcontainer-python',
		'Python DevContainer',
		'Sets up a VS Code DevContainer with Python environment.',
		{
			type: 'object',
			properties: {
				pythonVersion: { type: 'string', enum: ['3.9', '3.10', '3.11'], default: '3.11' },
				packageManager: { type: 'string', enum: ['pip'] }
			}
		}
	),
	createDevContainerCapability(
		'devcontainer-java',
		'Java DevContainer',
		'Sets up a VS Code DevContainer with Java environment.',
		{
			type: 'object',
			properties: {
				javaVersion: { type: 'string', enum: ['11', '17', '21'], default: '21' }
			}
		}
	),
	{
		id: 'circleci',
		name: 'CircleCI Integration',
		description: 'Configures CircleCI for continuous integration and deployment.',
		category: CATEGORY_CI_CD,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		externalServices: createExternalServiceConfig(
			'circleci',
			'CircleCI',
			'Create new project in CircleCI',
			'Set up environment variables'
		),
		configurationSchema: {
			type: 'object',
			properties: {
				deployTarget: {
					type: 'string',
					enum: ['none', 'cloudflare']
				}
			}
		},
		benefits: [
			'Automate testing and deployment pipelines',
			'Gain insights with visual build logs and test results',
			'Ensure code quality before merging changes'
		],
		templates: [
			{
				id: 'circleci-config',
				filePath: '.circleci/config.yml',
				templateId: 'circleci-config'
			}
		],
		website: 'https://circleci.com/'
	},
	{
		id: 'doppler',
		name: 'Doppler Secrets Management',
		description: 'Integrates Doppler for secure secrets management.',
		category: CATEGORY_SECRETS,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		externalServices: createExternalServiceConfig(
			'doppler',
			'Doppler',
			'Create new project in Doppler',
			'Configure service tokens'
		),
		configurationSchema: {
			type: 'object',
			properties: {
				projectType: {
					type: 'string',
					enum: ['web'],
					default: 'web'
				}
			}
		},
		benefits: [
			'Centralized secrets management across environments',
			'Eliminate .env files and risk of leaking secrets',
			'Inject secrets securely into your application at runtime'
		],
		templates: [
			{
				id: 'doppler-yaml',
				filePath: 'doppler.yaml',
				templateId: 'doppler-yaml'
			}
		],
		website: 'https://www.doppler.com/'
	},
	{
		id: 'sonarcloud',
		name: 'SonarCloud Code Quality',
		description: 'Sets up SonarCloud for static code analysis.',
		category: CATEGORY_CODE_QUALITY,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		externalServices: createExternalServiceConfig(
			'sonarcloud',
			'SonarCloud',
			'Create new project in SonarCloud',
			'Configure analysis parameters'
		),
		configurationSchema: {
			type: 'object',
			properties: {
				language: {
					type: 'string',
					enum: ['JavaScript', 'Python', 'Java']
				}
			}
		},
		benefits: [
			'Automatic detection of bugs, vulnerabilities, and code smells',
			'Track technical debt and code coverage over time',
			'Enforce quality gates on pull requests'
		],
		templates: [
			{
				id: 'sonar-project-properties',
				filePath: 'sonar-project.properties',
				templateId: 'sonar-project-properties'
			}
		],
		website: 'https://sonarcloud.io/'
	},
	{
		id: 'sonarlint',
		name: 'SonarLint',
		description: 'Configures SonarLint for local code quality analysis.',
		category: CATEGORY_CODE_QUALITY,
		dependencies: ['sonarcloud', 'devcontainer-java'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Real-time code quality feedback in your IDE',
			'Fix issues before they are committed to the repository',
			'Sync rules with SonarCloud for consistent analysis'
		],
		templates: EMPTY_ARRAY,
		website: 'https://www.sonarsource.com/products/sonarlint/'
	},
	{
		id: 'cloudflare-wrangler',
		name: 'Cloudflare Wrangler',
		description: 'Configures project for deployment to Cloudflare Workers.',
		category: CATEGORY_DEPLOYMENT,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				workerType: {
					type: 'string',
					enum: ['web'],
					default: 'web'
				}
			}
		},
		benefits: [
			'Deploy serverless applications to the global edge network',
			'Local emulation for fast development cycles',
			'Scalable and performant runtime for modern apps'
		],
		templates: EMPTY_ARRAY,
		website: 'https://developers.cloudflare.com/workers/wrangler/'
	},
	{
		id: 'dependabot',
		name: 'Dependabot',
		description: 'Configures Dependabot for automated dependency updates.',
		category: CATEGORY_PROJECT_STRUCTURE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				ecosystems: {
					type: 'array',
					items: {
						type: 'string',
						enum: ['npm']
					}
				},
				updateSchedule: {
					type: 'string',
					enum: ['daily', 'weekly', 'monthly']
				}
			}
		},
		benefits: [
			'Automatically keep dependencies up to date',
			'Receive security alerts for vulnerable packages',
			'Reduce technical debt with regular maintenance PRs'
		],
		templates: EMPTY_ARRAY,
		website: 'https://docs.github.com/en/code-security/dependabot/dependabot-overview'
	},
	{
		id: 'lighthouse-ci',
		name: 'Lighthouse CI',
		description: 'Configures Lighthouse CI for performance monitoring.',
		category: CATEGORY_MONITORING,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				thresholds: {
					type: 'object',
					properties: {
						performance: {
							type: 'number',
							minimum: 0,
							maximum: 100,
							default: 90
						}
					}
				}
			}
		},
		benefits: [
			'Monitor performance, accessibility, and SEO metrics',
			'Catch regressions in web vitals before deployment',
			'Maintain high standards for user experience'
		],
		templates: [
			{
				id: 'lighthouse-ci-config',
				filePath: '.lighthouse.cjs',
				templateId: 'lighthouse-ci-config'
			}
		],
		website: 'https://github.com/GoogleChrome/lighthouse-ci'
	},
	{
		id: 'playwright',
		name: 'Playwright',
		description: 'Configures Playwright for end-to-end testing.',
		category: CATEGORY_PROJECT_STRUCTURE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				browsers: {
					type: 'array',
					items: {
						type: 'string',
						enum: ['chromium', 'firefox', 'webkit']
					}
				}
			}
		},
		benefits: [
			'Reliable end-to-end testing for modern web apps',
			'Test across Chromium, Firefox, and WebKit',
			'Powerful tooling for debugging and test generation'
		],
		templates: EMPTY_ARRAY,
		website: 'https://playwright.dev/'
	}
];

/**
 * Gets a capability by its ID.
 * @param {string} id The ID of the capability.
 * @returns {object | undefined} The capability object or undefined if not found.
 */
export function getCapabilityById(id) {
	return capabilities.find((c) => c.id === id);
}

/**
 * Gets all capabilities in a given category.
 * @param {string} category The category to filter by.
 * @returns {object[]} An array of capability objects.
 */
export function getCapabilitiesByCategory(category) {
	return capabilities.filter((c) => c.category === category);
}

function checkDependencies(capability, selectedSet, missing) {
	for (const depId of capability.dependencies) {
		if (!selectedSet.has(depId)) {
			missing.push({ capability: capability.id, dependency: depId });
		}
	}
}

function checkConflicts(capability, selectedSet, conflicts) {
	for (const conflictId of capability.conflicts) {
		if (selectedSet.has(conflictId)) {
			// Add conflict only once
			const alreadyExists = conflicts.some(
				(c) =>
					(c.capability1 === capability.id && c.capability2 === conflictId) ||
					(c.capability1 === conflictId && c.capability2 === capability.id)
			);
			if (!alreadyExists) {
				conflicts.push({ capability1: capability.id, capability2: conflictId });
			}
		}
	}
}

/**
 * Validates the dependencies and conflicts of a selection of capabilities.
 * @param {string[]} selectedIds An array of selected capability IDs.
 * @returns {{valid: boolean, missing: {capability: string, dependency: string}[], conflicts: {capability1: string, capability2: string}[]}}
 */
export function validateCapabilityDependencies(selectedIds) {
	const missing = [];
	const conflicts = [];
	const selectedSet = new Set(selectedIds);

	for (const id of selectedIds) {
		const capability = getCapabilityById(id);
		if (capability) {
			checkDependencies(capability, selectedSet, missing);
			checkConflicts(capability, selectedSet, conflicts);
		}
	}

	return {
		valid: missing.length === 0 && conflicts.length === 0,
		missing,
		conflicts
	};
}

/**
 * Gets a unique list of required authentication services for a selection of capabilities.
 * @param {string[]} selectedIds An array of selected capability IDs.
 * @returns {string[]} A unique array of auth service names.
 */
export function getRequiredAuthServices(selectedIds) {
	const services = new Set();
	for (const id of selectedIds) {
		const capability = getCapabilityById(id);
		if (capability && capability.requiresAuth) {
			for (const service of capability.requiresAuth) {
				services.add(service);
			}
		}
	}
	return Array.from(services);
}
