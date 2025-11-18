// webapp/src/lib/config/capabilities.js

/**
 * Defines the available project capabilities for the Project Generation Tool.
 * Each capability includes metadata and dependencies.
 */

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
	return {
		id,
		name,
		description,
		category: 'devcontainer',
		dependencies: ['docker'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema,
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
			{ id: 'zshrc', filePath: '.devcontainer/.zshrc', templateId: 'devcontainer-zshrc' },
			{ id: 'p10k', filePath: '.devcontainer/.p10k.zsh', templateId: 'devcontainer-p10k-zsh' },
			{
				id: 'setup-sh',
				filePath: '.devcontainer/setup.sh',
				templateId: 'devcontainer-setup-sh',
				isExecutable: true
			}
		],
		website: 'https://code.visualstudio.com/docs/devcontainers/containers'
	};
}

export const capabilities = [
	{
		id: 'docker',
		name: 'Docker',
		description: 'Docker support for the project.',
		category: 'internal',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: { type: 'object', properties: {} },
		templates: [],
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
			required: []
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
		category: 'ci-cd',
		dependencies: [],
		conflicts: [], // Removed 'github-actions' from conflicts
		requiresAuth: ['circleci'],
		configurationSchema: {
			type: 'object',
			properties: {
				deployTarget: {
					type: 'string',
					enum: ['none', 'cloudflare']
				}
			}
		},
		templates: [],
		website: 'https://circleci.com/'
	},
	// Removed 'github-actions' capability
	{
		id: 'doppler',
		name: 'Doppler Secrets Management',
		description: 'Integrates Doppler for secure secrets management.',
		category: 'secrets',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['doppler'],
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
		templates: [],
		website: 'https://www.doppler.com/'
	},
	{
		id: 'sonarcloud',
		name: 'SonarCloud Code Quality',
		description: 'Sets up SonarCloud for static code analysis.',
		category: 'code-quality',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['sonarcloud'],
		configurationSchema: {
			type: 'object',
			properties: {
				language: {
					type: 'string',
					enum: ['JavaScript', 'Python', 'Java']
				}
			}
		},
		templates: [],
		website: 'https://sonarcloud.io/'
	},
	{
		id: 'sonarlint',
		name: 'SonarLint',
		description: 'Configures SonarLint for local code quality analysis.',
		category: 'code-quality',
		dependencies: ['sonarcloud', 'devcontainer-java'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: { type: 'object', properties: {} },
		templates: [],
		website: 'https://www.sonarsource.com/products/sonarlint/'
	},
	{
		id: 'cloudflare-wrangler',
		name: 'Cloudflare Wrangler',
		description: 'Configures project for deployment to Cloudflare Workers.',
		category: 'deployment',
		dependencies: [],
		conflicts: [],
		requiresAuth: ['cloudflare'],
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
		templates: [],
		website: 'https://developers.cloudflare.com/workers/wrangler/'
	},
	{
		id: 'dependabot',
		name: 'Dependabot',
		description: 'Configures Dependabot for automated dependency updates.',
		category: 'project-structure',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				ecosystems: {
					type: 'array',
					items: {
						type: 'string',
						enum: ['npm'] // Removed 'github-actions' from enum
					}
				},
				updateSchedule: {
					type: 'string',
					enum: ['daily', 'weekly', 'monthly']
				}
			}
		},
		templates: [],
		website: 'https://docs.github.com/en/code-security/dependabot/dependabot-overview'
	},
	{
		id: 'lighthouse-ci',
		name: 'Lighthouse CI',
		description: 'Configures Lighthouse CI for performance monitoring.',
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
						performance: {
							type: 'number',
							minimum: 0,
							maximum: 100,
							default: 90 // Changed default to 90
						}
					}
				}
			}
		},
		templates: [],
		website: 'https://github.com/GoogleChrome/lighthouse-ci'
	},
	{
		id: 'playwright',
		name: 'Playwright',
		description: 'Configures Playwright for end-to-end testing.',
		category: 'project-structure',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
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
		templates: [],
		website: 'https://playwright.dev/'
	},
	{
		id: 'spec-kit',
		name: 'Spec-Kit',
		description: 'Configures Spec-Kit for project specification.',
		category: 'project-structure',
		dependencies: [],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				specFormat: {
					type: 'string',
					enum: ['md', 'yaml']
				}
			}
		},
		templates: [],
		website: 'https://www.speckit.app/'
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
			// Check dependencies
			for (const depId of capability.dependencies) {
				if (!selectedSet.has(depId)) {
					missing.push({ capability: id, dependency: depId });
				}
			}

			// Check conflicts
			for (const conflictId of capability.conflicts) {
				if (selectedSet.has(conflictId)) {
					// Add conflict only once
					if (
						!conflicts.some(
							(c) =>
								(c.capability1 === id && c.capability2 === conflictId) ||
								(c.capability1 === conflictId && c.capability2 === id)
						)
					) {
						conflicts.push({ capability1: id, capability2: conflictId });
					}
				}
			}
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
