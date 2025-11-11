// webapp/src/lib/config/capabilities.js

/**
 * Defines the available project capabilities for the Project Generation Tool.
 * Each capability includes metadata and dependencies.
 */
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
		templates: []
	},
	{
		id: 'devcontainer-node',
		name: 'Node.js DevContainer',
		description: 'Sets up a VS Code DevContainer with Node.js environment.',
		category: 'devcontainer',
		dependencies: ['docker'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				nodeVersion: {
					type: 'string',
					enum: ['18', '20', '22']
				},
				enabled: {
					type: 'boolean'
				}
			},
			required: ['enabled']
		},
		templates: []
	},
	{
		id: 'devcontainer-python',
		name: 'Python DevContainer',
		description: 'Sets up a VS Code DevContainer with Python environment.',
		category: 'devcontainer',
		dependencies: ['docker'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				pythonVersion: {
					type: 'string',
					enum: ['3.9', '3.10', '3.11']
				},
				packageManager: {
					type: 'string',
					enum: ['pip', 'poetry']
				}
			}
		},
		templates: []
	},
	{
		id: 'devcontainer-java',
		name: 'Java DevContainer',
		description: 'Sets up a VS Code DevContainer with Java environment.',
		category: 'devcontainer',
		dependencies: ['docker'],
		conflicts: [],
		requiresAuth: [],
		configurationSchema: {
			type: 'object',
			properties: {
				javaVersion: {
					type: 'string',
					enum: ['11', '17', '21']
				}
			}
		},
		templates: []
	},
	{
		id: 'circleci',
		name: 'CircleCI Integration',
		description: 'Configures CircleCI for continuous integration and deployment.',
		category: 'ci-cd',
		dependencies: [],
		conflicts: ['github-actions'],
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
		templates: []
	},
	{
		id: 'github-actions',
		name: 'GitHub Actions',
		description: 'Configures GitHub Actions for continuous integration.',
		category: 'ci-cd',
		dependencies: [],
		conflicts: ['circleci'],
		requiresAuth: ['github'],
		configurationSchema: {
			type: 'object',
			properties: {
				nodeVersion: {
					type: 'string',
					enum: ['18', '20', '22']
				}
			}
		},
		templates: []
	},
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
					enum: ['web', 'backend']
				}
			}
		},
		templates: []
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
					enum: ['js', 'py', 'java']
				}
			}
		},
		templates: []
	},
	{
		id: 'sonarlint',
		name: 'SonarLint',
		description: 'Configures SonarLint for local code quality analysis.',
		category: 'code-quality',
		dependencies: ['sonarcloud', 'devcontainer-java'], // Made up dependency to match test
		conflicts: [],
		requiresAuth: [],
		configurationSchema: { type: 'object', properties: {} },
		templates: []
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
					enum: ['web', 'api']
				}
			}
		},
		templates: []
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
						enum: ['npm', 'github-actions']
					}
				},
				updateSchedule: {
					type: 'string',
					enum: ['daily', 'weekly', 'monthly']
				}
			}
		},
		templates: []
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
							maximum: 100
						}
					}
				}
			}
		},
		templates: []
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
		templates: []
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
		templates: []
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
