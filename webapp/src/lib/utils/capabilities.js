/**
 * Capability Definitions Configuration
 *
 * Central configuration for all available project capabilities, their dependencies,
 * and configuration options in the genproj tool.
 *
 * @fileoverview Universal capability definitions configuration
 */

/**
 * @typedef {Object} CapabilityDefinition
 * @property {string} id - Capability ID
 * @property {string} name - Capability display name
 * @property {string} description - Capability description
 * @property {string} category - Capability category
 * @property {string[]} dependencies - Required capabilities
 * @property {string[]} conflicts - Conflicting capabilities
 * @property {Object} configuration - Default configuration options
 * @property {boolean} requiresAuth - Whether capability requires authentication
 * @property {string} authService - Required authentication service
 * @property {string} icon - Icon identifier for UI display
 * @property {string[]} tags - Tags for filtering and search
 */

/**
 * All available project capabilities
 */
export const CAPABILITIES = {
	// Core Framework Capabilities
	sveltekit: {
		id: 'sveltekit',
		name: 'SvelteKit',
		description:
			'Modern web framework for building fast, reactive applications with server-side rendering',
		category: 'framework',
		dependencies: [],
		conflicts: [],
		configuration: {
			adapter: 'auto',
			typescript: false,
			preprocess: true
		},
		requiresAuth: false,
		authService: null,
		icon: 'svelte',
		tags: ['framework', 'web', 'ssr', 'reactive']
	},

	typescript: {
		id: 'typescript',
		name: 'TypeScript',
		description: 'Add TypeScript support for type safety and better development experience',
		category: 'language',
		dependencies: [],
		conflicts: [],
		configuration: {
			strict: true,
			target: 'ES2022',
			module: 'ESNext',
			moduleResolution: 'bundler'
		},
		requiresAuth: false,
		authService: null,
		icon: 'typescript',
		tags: ['language', 'types', 'development']
	},

	// Styling Capabilities
	tailwindcss: {
		id: 'tailwindcss',
		name: 'TailwindCSS',
		description: 'Utility-first CSS framework for rapid UI development with responsive design',
		category: 'styling',
		dependencies: [],
		conflicts: [],
		configuration: {
			plugins: [],
			purge: true,
			darkMode: 'class',
			content: ['./src/**/*.{html,js,svelte,ts}']
		},
		requiresAuth: false,
		authService: null,
		icon: 'tailwind',
		tags: ['css', 'styling', 'utility', 'responsive']
	},

	// Development Environment Capabilities
	devcontainer: {
		id: 'devcontainer',
		name: 'DevContainer',
		description:
			'Consistent development environment using Docker containers with VS Code integration',
		category: 'development',
		dependencies: [],
		conflicts: [],
		configuration: {
			image: 'mcr.microsoft.com/devcontainers/javascript-node:20',
			features: ['common-utils', 'git'],
			extensions: [
				'svelte.svelte-vscode',
				'bradlc.vscode-tailwindcss',
				'esbenp.prettier-vscode',
				'ms-vscode.vscode-typescript-next'
			],
			postCreateCommand: 'npm install'
		},
		requiresAuth: false,
		authService: null,
		icon: 'docker',
		tags: ['development', 'docker', 'vscode', 'environment']
	},

	java: {
		id: 'java',
		name: 'Java',
		description: 'Add Java development support with Gradle build system',
		category: 'language',
		dependencies: [],
		conflicts: [],
		configuration: {
			version: '17',
			buildTool: 'gradle',
			packageManager: 'gradle'
		},
		requiresAuth: false,
		authService: null,
		icon: 'java',
		tags: ['language', 'jvm', 'enterprise']
	},

	python: {
		id: 'python',
		name: 'Python',
		description: 'Add Python development support with pip package management',
		category: 'language',
		dependencies: [],
		conflicts: [],
		configuration: {
			version: '3.11',
			packageManager: 'pip',
			virtualEnv: true
		},
		requiresAuth: false,
		authService: null,
		icon: 'python',
		tags: ['language', 'scripting', 'data-science']
	},

	// Testing Capabilities
	testing: {
		id: 'testing',
		name: 'Testing',
		description: 'Unit and integration testing with Vitest and Testing Library',
		category: 'testing',
		dependencies: [],
		conflicts: [],
		configuration: {
			framework: 'vitest',
			coverage: true,
			threshold: 85,
			reporters: ['default', 'html']
		},
		requiresAuth: false,
		authService: null,
		icon: 'test',
		tags: ['testing', 'unit', 'integration', 'coverage']
	},

	playwright: {
		id: 'playwright',
		name: 'Playwright',
		description: 'End-to-end testing with Playwright for cross-browser automation',
		category: 'testing',
		dependencies: [],
		conflicts: [],
		configuration: {
			browsers: ['chromium', 'firefox', 'webkit'],
			headed: false,
			parallel: true,
			workers: 4
		},
		requiresAuth: false,
		authService: null,
		icon: 'playwright',
		tags: ['testing', 'e2e', 'automation', 'browser']
	},

	// Code Quality Capabilities
	sonarlint: {
		id: 'sonarlint',
		name: 'SonarLint',
		description: 'Code quality analysis with SonarLint for real-time feedback',
		category: 'quality',
		dependencies: ['java'],
		conflicts: [],
		configuration: {
			rules: 'recommended',
			javaHome: '/usr/local/sdkman/candidates/java/current',
			qualityProfile: 'Sonar way'
		},
		requiresAuth: false,
		authService: null,
		icon: 'sonar',
		tags: ['quality', 'analysis', 'linting', 'java']
	},

	// CI/CD Capabilities
	circleci: {
		id: 'circleci',
		name: 'CircleCI',
		description: 'Continuous integration and deployment with CircleCI pipelines',
		category: 'cicd',
		dependencies: [],
		conflicts: [],
		configuration: {
			nodeVersion: '20',
			cache: true,
			parallelism: 1,
			workflows: ['build-test-deploy']
		},
		requiresAuth: true,
		authService: 'circleci',
		icon: 'circleci',
		tags: ['cicd', 'ci', 'cd', 'automation']
	},

	// Secrets Management Capabilities
	doppler: {
		id: 'doppler',
		name: 'Doppler',
		description: 'Secrets management and environment variable management with encryption',
		category: 'secrets',
		dependencies: [],
		conflicts: [],
		configuration: {
			environments: ['dev', 'staging', 'prod'],
			syncMode: 'cli',
			encryption: true
		},
		requiresAuth: true,
		authService: 'doppler',
		icon: 'doppler',
		tags: ['secrets', 'environment', 'security', 'config']
	},

	// Code Quality Cloud Capabilities
	sonarcloud: {
		id: 'sonarcloud',
		name: 'SonarCloud',
		description: 'Cloud-based code quality analysis and security scanning',
		category: 'quality',
		dependencies: [],
		conflicts: [],
		configuration: {
			organization: 'default',
			qualityGate: 'Sonar way',
			coverage: true,
			security: true
		},
		requiresAuth: true,
		authService: 'sonarcloud',
		icon: 'sonarcloud',
		tags: ['quality', 'cloud', 'security', 'analysis']
	},

	// Cloudflare Capabilities
	cloudflare: {
		id: 'cloudflare',
		name: 'Cloudflare',
		description: 'Cloudflare Workers and Pages deployment with edge computing',
		category: 'deployment',
		dependencies: [],
		conflicts: [],
		configuration: {
			workers: false,
			pages: true,
			kv: false,
			r2: false
		},
		requiresAuth: false,
		authService: null,
		icon: 'cloudflare',
		tags: ['deployment', 'edge', 'workers', 'cdn']
	},

	// Additional Tools
	dependabot: {
		id: 'dependabot',
		name: 'Dependabot',
		description: 'Automated dependency updates with security vulnerability scanning',
		category: 'maintenance',
		dependencies: [],
		conflicts: [],
		configuration: {
			schedule: 'weekly',
			openPullRequestsLimit: 5,
			security: true,
			versioning: 'semver'
		},
		requiresAuth: false,
		authService: null,
		icon: 'dependabot',
		tags: ['maintenance', 'security', 'dependencies', 'automation']
	},

	lighthouse: {
		id: 'lighthouse',
		name: 'Lighthouse',
		description: 'Performance and accessibility auditing with Lighthouse CI',
		category: 'performance',
		dependencies: [],
		conflicts: [],
		configuration: {
			categories: ['performance', 'accessibility', 'best-practices', 'seo'],
			threshold: 90,
			ci: true,
			report: 'html'
		},
		requiresAuth: false,
		authService: null,
		icon: 'lighthouse',
		tags: ['performance', 'accessibility', 'audit', 'ci']
	}
};

/**
 * Capability categories for organization
 */
export const CAPABILITY_CATEGORIES = {
	framework: {
		name: 'Framework',
		description: 'Core application frameworks and libraries',
		icon: 'framework',
		color: 'blue'
	},
	language: {
		name: 'Language',
		description: 'Programming languages and type systems',
		icon: 'language',
		color: 'green'
	},
	styling: {
		name: 'Styling',
		description: 'CSS frameworks and styling solutions',
		icon: 'styling',
		color: 'purple'
	},
	development: {
		name: 'Development',
		description: 'Development environment and tooling',
		icon: 'development',
		color: 'orange'
	},
	testing: {
		name: 'Testing',
		description: 'Testing frameworks and tools',
		icon: 'testing',
		color: 'red'
	},
	quality: {
		name: 'Code Quality',
		description: 'Code analysis and quality assurance',
		icon: 'quality',
		color: 'yellow'
	},
	cicd: {
		name: 'CI/CD',
		description: 'Continuous integration and deployment',
		icon: 'cicd',
		color: 'indigo'
	},
	secrets: {
		name: 'Secrets',
		description: 'Secrets and configuration management',
		icon: 'secrets',
		color: 'pink'
	},
	deployment: {
		name: 'Deployment',
		description: 'Deployment platforms and services',
		icon: 'deployment',
		color: 'teal'
	},
	maintenance: {
		name: 'Maintenance',
		description: 'Project maintenance and automation',
		icon: 'maintenance',
		color: 'gray'
	},
	performance: {
		name: 'Performance',
		description: 'Performance monitoring and optimization',
		icon: 'performance',
		color: 'emerald'
	}
};

/**
 * Gets all capabilities
 * @returns {Object} All capability definitions
 */
export function getAllCapabilities() {
	return CAPABILITIES;
}

/**
 * Gets capabilities by category
 * @param {string} category - Category name
 * @returns {Object} Capabilities in the specified category
 */
export function getCapabilitiesByCategory(category) {
	return Object.fromEntries(
		Object.entries(CAPABILITIES).filter(([, cap]) => cap.category === category)
	);
}

/**
 * Gets a specific capability
 * @param {string} capabilityId - Capability ID
 * @returns {CapabilityDefinition|null} Capability definition or null if not found
 */
export function getCapability(capabilityId) {
	return CAPABILITIES[capabilityId] || null;
}

/**
 * Gets all capability categories
 * @returns {Object} All category definitions
 */
export function getAllCategories() {
	return CAPABILITY_CATEGORIES;
}

/**
 * Gets capabilities that require authentication
 * @param {string[]} capabilities - Array of capability IDs
 * @returns {string[]} Capabilities that require authentication
 */
export function getCapabilitiesRequiringAuth(capabilities) {
	return capabilities.filter((capId) => {
		const capability = CAPABILITIES[capId];
		return capability?.requiresAuth;
	});
}

/**
 * Gets required authentication services for capabilities
 * @param {string[]} capabilities - Array of capability IDs
 * @returns {string[]} Required authentication services
 */
export function getRequiredAuthServices(capabilities) {
	const services = new Set();
	for (const capId of capabilities) {
		const capability = CAPABILITIES[capId];
		if (capability?.authService) {
			services.add(capability.authService);
		}
	}
	return [...services];
}

/**
 * Searches capabilities by tags
 * @param {string[]} tags - Tags to search for
 * @returns {Object} Matching capabilities
 */
export function searchCapabilitiesByTags(tags) {
	return Object.fromEntries(
		Object.entries(CAPABILITIES).filter(([, cap]) => tags.some((tag) => cap.tags.includes(tag)))
	);
}
