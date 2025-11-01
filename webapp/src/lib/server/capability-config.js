/**
 * Capability Configuration Service
 *
 * Manages capability definitions, dependencies, and configuration options
 * for the genproj tool.
 *
 * @fileoverview Server-side capability configuration management service
 */

/**
 * @typedef {Object} CapabilityDefinition
 * @property {string} id - Capability ID
 * @property {string} name - Capability display name
 * @property {string} description - Capability description
 * @property {string} category - Capability category
 * @property {string[]} dependencies - Required capabilities
 * @property {string[]} conflicts - Conflicting capabilities
 * @property {Object} configuration - Configuration options
 * @property {boolean} requiresAuth - Whether capability requires authentication
 * @property {string} authService - Required authentication service
 */

/**
 * Capability Configuration service class
 */
export class CapabilityConfigurationService {
	/**
	 * Creates a new Capability Configuration service instance
	 */
	constructor() {
		this.capabilities = this.initializeCapabilities();
	}

	/**
	 * Initializes all available capabilities
	 * @returns {Object} Capability definitions
	 */
	initializeCapabilities() {
		return {
			// Core Framework Capabilities
			sveltekit: {
				id: 'sveltekit',
				name: 'SvelteKit',
				description: 'Modern web framework for building fast, reactive applications',
				category: 'framework',
				dependencies: [],
				conflicts: [],
				configuration: {
					adapter: 'auto',
					typescript: false
				},
				requiresAuth: false,
				authService: null
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
					target: 'ES2022'
				},
				requiresAuth: false,
				authService: null
			},

			// Styling Capabilities
			tailwindcss: {
				id: 'tailwindcss',
				name: 'TailwindCSS',
				description: 'Utility-first CSS framework for rapid UI development',
				category: 'styling',
				dependencies: [],
				conflicts: [],
				configuration: {
					plugins: [],
					purge: true
				},
				requiresAuth: false,
				authService: null
			},

			// Development Environment Capabilities
			devcontainer: {
				id: 'devcontainer',
				name: 'DevContainer',
				description: 'Consistent development environment using Docker containers',
				category: 'development',
				dependencies: [],
				conflicts: [],
				configuration: {
					image: 'node:20-alpine',
					features: ['common-utils', 'git'],
					extensions: ['svelte.svelte-vscode', 'bradlc.vscode-tailwindcss']
				},
				requiresAuth: false,
				authService: null
			},

			java: {
				id: 'java',
				name: 'Java',
				description: 'Add Java development support',
				category: 'language',
				dependencies: [],
				conflicts: [],
				configuration: {
					version: '17',
					buildTool: 'gradle'
				},
				requiresAuth: false,
				authService: null
			},

			python: {
				id: 'python',
				name: 'Python',
				description: 'Add Python development support',
				category: 'language',
				dependencies: [],
				conflicts: [],
				configuration: {
					version: '3.11',
					packageManager: 'pip'
				},
				requiresAuth: false,
				authService: null
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
					threshold: 85
				},
				requiresAuth: false,
				authService: null
			},

			playwright: {
				id: 'playwright',
				name: 'Playwright',
				description: 'End-to-end testing with Playwright',
				category: 'testing',
				dependencies: [],
				conflicts: [],
				configuration: {
					browsers: ['chromium', 'firefox', 'webkit'],
					headed: false
				},
				requiresAuth: false,
				authService: null
			},

			// Code Quality Capabilities
			sonarlint: {
				id: 'sonarlint',
				name: 'SonarLint',
				description: 'Code quality analysis with SonarLint',
				category: 'quality',
				dependencies: ['java'],
				conflicts: [],
				configuration: {
					rules: 'recommended',
					javaHome: '/usr/local/sdkman/candidates/java/current'
				},
				requiresAuth: false,
				authService: null
			},

			// CI/CD Capabilities
			circleci: {
				id: 'circleci',
				name: 'CircleCI',
				description: 'Continuous integration and deployment with CircleCI',
				category: 'cicd',
				dependencies: [],
				conflicts: [],
				configuration: {
					nodeVersion: '20',
					cache: true,
					parallelism: 1
				},
				requiresAuth: true,
				authService: 'circleci'
			},

			// Secrets Management Capabilities
			doppler: {
				id: 'doppler',
				name: 'Doppler',
				description: 'Secrets management and environment variable management',
				category: 'secrets',
				dependencies: [],
				conflicts: [],
				configuration: {
					environments: ['dev', 'staging', 'prod'],
					syncMode: 'cli'
				},
				requiresAuth: true,
				authService: 'doppler'
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
					qualityGate: 'Sonar way'
				},
				requiresAuth: true,
				authService: 'sonarcloud'
			},

			// Cloudflare Capabilities
			cloudflare: {
				id: 'cloudflare',
				name: 'Cloudflare',
				description: 'Cloudflare Workers and Pages deployment',
				category: 'deployment',
				dependencies: [],
				conflicts: [],
				configuration: {
					workers: false,
					pages: true,
					kv: false
				},
				requiresAuth: false,
				authService: null
			},

			// Additional Tools
			dependabot: {
				id: 'dependabot',
				name: 'Dependabot',
				description: 'Automated dependency updates with Dependabot',
				category: 'maintenance',
				dependencies: [],
				conflicts: [],
				configuration: {
					schedule: 'weekly',
					openPullRequestsLimit: 5
				},
				requiresAuth: false,
				authService: null
			},

			lighthouse: {
				id: 'lighthouse',
				name: 'Lighthouse',
				description: 'Performance and accessibility auditing with Lighthouse',
				category: 'performance',
				dependencies: [],
				conflicts: [],
				configuration: {
					categories: ['performance', 'accessibility', 'best-practices', 'seo'],
					threshold: 90
				},
				requiresAuth: false,
				authService: null
			}
		};
	}

	/**
	 * Gets all available capabilities
	 * @returns {Object} All capability definitions
	 */
	getAllCapabilities() {
		return this.capabilities;
	}

	/**
	 * Gets capabilities by category
	 * @param {string} category - Category name
	 * @returns {Object} Capabilities in the specified category
	 */
	getCapabilitiesByCategory(category) {
		return Object.fromEntries(
			Object.entries(this.capabilities).filter(([, cap]) => cap.category === category)
		);
	}

	/**
	 * Gets a specific capability definition
	 * @param {string} capabilityId - Capability ID
	 * @returns {CapabilityDefinition|null} Capability definition or null if not found
	 */
	getCapability(capabilityId) {
		return this.capabilities[capabilityId] || null;
	}

	/**
	 * Validates capability selection and resolves dependencies
	 * @param {string[]} selectedCapabilities - Array of selected capability IDs
	 * @returns {Object} Validation result with resolved capabilities
	 */
	validateCapabilitySelection(selectedCapabilities) {
		const resolved = new Set();
		const errors = [];
		const warnings = [];

		// Add explicit dependencies
		const addDependencies = (capabilityId) => {
			const capability = this.capabilities[capabilityId];
			if (!capability) {
				errors.push(`Unknown capability: ${capabilityId}`);
				return;
			}

			// Add dependencies first
			for (const dependency of capability.dependencies) {
				if (!resolved.has(dependency)) {
					addDependencies(dependency);
				}
			}

			// Add the capability itself
			resolved.add(capabilityId);
		};

		// Process all selected capabilities
		for (const capabilityId of selectedCapabilities) {
			addDependencies(capabilityId);
		}

		// Check for conflicts
		for (const capabilityId of resolved) {
			const capability = this.capabilities[capabilityId];
			for (const conflict of capability.conflicts) {
				if (resolved.has(conflict)) {
					errors.push(
						`Capability '${capability.name}' conflicts with '${this.capabilities[conflict].name}'`
					);
				}
			}
		}

		// Check for missing dependencies
		const missingDependencies = [];
		for (const capabilityId of selectedCapabilities) {
			const capability = this.capabilities[capabilityId];
			if (!capability) {
				continue;
			}
			for (const dependency of capability.dependencies) {
				if (!selectedCapabilities.includes(dependency)) {
					missingDependencies.push({
						capability: capability.name,
						dependency: this.capabilities[dependency]?.name || dependency
					});
				}
			}
		}

		if (missingDependencies.length > 0) {
			warnings.push('Some dependencies will be automatically added');
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings,
			resolvedCapabilities: Array.from(resolved),
			missingDependencies
		};
	}

	/**
	 * Gets capabilities that require authentication
	 * @param {string[]} capabilities - Array of capability IDs
	 * @returns {string[]} Capabilities that require authentication
	 */
	getCapabilitiesRequiringAuth(capabilities) {
		return capabilities.filter((capId) => {
			const capability = this.capabilities[capId];
			return capability?.requiresAuth;
		});
	}

	/**
	 * Gets required authentication services for capabilities
	 * @param {string[]} capabilities - Array of capability IDs
	 * @returns {string[]} Required authentication services
	 */
	getRequiredAuthServices(capabilities) {
		const services = new Set();
		for (const capId of capabilities) {
			const capability = this.capabilities[capId];
			if (capability?.authService) {
				services.add(capability.authService);
			}
		}
		return Array.from(services);
	}

	/**
	 * Gets capability configuration schema
	 * @param {string} capabilityId - Capability ID
	 * @returns {Object|null} Configuration schema or null if not found
	 */
	getCapabilityConfigurationSchema(capabilityId) {
		const capability = this.capabilities[capabilityId];
		return capability ? capability.configuration : null;
	}

	/**
	 * Validates capability configuration
	 * @param {string} capabilityId - Capability ID
	 * @param {Object} configuration - Configuration to validate
	 * @returns {Object} Validation result
	 */
	validateCapabilityConfiguration(capabilityId, configuration) {
		const capability = this.capabilities[capabilityId];
		if (!capability) {
			return {
				isValid: false,
				errors: [`Unknown capability: ${capabilityId}`],
				warnings: []
			};
		}

		const errors = [];
		const warnings = [];

		// Basic validation - can be extended with more sophisticated schema validation
		for (const [key] of Object.entries(configuration)) {
			if (!(key in capability.configuration)) {
				warnings.push(`Unknown configuration option: ${key}`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors,
			warnings
		};
	}
}
