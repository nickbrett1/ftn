/**
 * Template Engine Service
 *
 * Provides template processing and file generation capabilities using Handlebars
 * for the genproj tool.
 *
 * @fileoverview Server-side template engine service
 */

/**
 * @typedef {Object} TemplateContext
 * @property {string} projectName - Project name
 * @property {string} [repositoryUrl] - Repository URL
 * @property {string[]} capabilities - Selected capabilities
 * @property {Object} configuration - Capability-specific configuration
 * @property {Object} metadata - Additional metadata
 */

/**
 * @typedef {Object} ProcessedTemplate
 * @property {string} path - File path
 * @property {string} content - Processed content
 * @property {string} [description] - File description
 */

/**
 * Template Engine service class
 */
export class TemplateEngineService {
	/**
	 * Creates a new Template Engine service instance
	 */
	constructor() {
		this.templates = new Map();
		this.helpers = this.initializeHelpers();
	}

	/**
	 * Initializes Handlebars helpers
	 * @returns {Object} Helper functions
	 */
	initializeHelpers() {
		return {
			// Helper to check if a capability is selected
			hasCapability: (capabilities, capabilityId) => {
				return capabilities.includes(capabilityId);
			},

			// Helper to get capability configuration
			getCapabilityConfig: (configuration, capabilityId, key) => {
				return configuration[capabilityId]?.[key] || '';
			},

			// Helper to format project name for different contexts
			formatProjectName: (projectName, format = 'kebab') => {
				switch (format) {
					case 'kebab':
						return projectName.toLowerCase().replaceAll(/[^a-z0-9]/g, '-');
					case 'camel':
						return projectName
							.replaceAll(/[^a-zA-Z0-9]/g, '')
							.replace(/^[a-z]/, (c) => c.toUpperCase());
					case 'snake':
						return projectName.toLowerCase().replaceAll(/[^a-z0-9]/g, '_');
					default:
						return projectName;
				}
			},

			// Helper to generate timestamp
			timestamp: () => {
				return new Date().toISOString();
			},

			// Helper to generate random string
			// Uses crypto.getRandomValues() for cryptographically secure random generation
			randomString: (length = 8) => {
				const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
				const randomBytes = new Uint8Array(length);
				crypto.getRandomValues(randomBytes);
				let result = '';
				for (let i = 0; i < length; i++) {
					result += chars.charAt(randomBytes[i] % chars.length);
				}
				return result;
			},

			// Helper to join array with custom separator
			join: (array, separator = ', ') => {
				return Array.isArray(array) ? array.join(separator) : '';
			},

			// Helper to capitalize first letter
			capitalize: (str) => {
				return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
			},

			// Helper to generate package.json dependencies
			generateDependencies: (capabilities) => {
				const dependencyMap = {
					sveltekit: {
						'@sveltejs/adapter-auto': '^3.0.0',
						'@sveltejs/kit': '^2.0.0',
						svelte: '^4.2.0',
						vite: '^5.0.0'
					},
					tailwindcss: {
						tailwindcss: '^3.4.0',
						autoprefixer: '^10.4.0',
						postcss: '^8.4.0'
					},
					typescript: {
						typescript: '^5.0.0',
						'@types/node': '^20.0.0'
					},
					testing: {
						vitest: '^1.0.0',
						'@testing-library/svelte': '^4.0.0',
						'@testing-library/jest-dom': '^6.0.0'
					},
					playwright: {
						'@playwright/test': '^1.40.0'
					}
				};

				const allDeps = {};
				for (const capability of capabilities) {
					if (dependencyMap[capability]) {
						Object.assign(allDeps, dependencyMap[capability]);
					}
				}

				return JSON.stringify(allDeps, null, 2);
			},

			// Helper to generate devDependencies
			generateDevDependencies: (capabilities) => {
				const devDependencyMap = {
					sveltekit: {
						'@sveltejs/adapter-auto': '^3.0.0',
						'@sveltejs/kit': '^2.0.0',
						svelte: '^4.2.0',
						vite: '^5.0.0'
					},
					tailwindcss: {
						tailwindcss: '^3.4.0',
						autoprefixer: '^10.4.0',
						postcss: '^8.4.0'
					},
					typescript: {
						typescript: '^5.0.0',
						'@types/node': '^20.0.0'
					},
					testing: {
						vitest: '^1.0.0',
						'@testing-library/svelte': '^4.0.0',
						'@testing-library/jest-dom': '^6.0.0'
					},
					playwright: {
						'@playwright/test': '^1.40.0'
					}
				};

				const allDevDeps = {};
				for (const capability of capabilities) {
					if (devDependencyMap[capability]) {
						Object.assign(allDevDeps, devDependencyMap[capability]);
					}
				}

				return JSON.stringify(allDevDeps, null, 2);
			}
		};
	}

	/**
	 * Registers a template
	 * @param {string} name - Template name
	 * @param {string} content - Template content
	 */
	registerTemplate(name, content) {
		this.templates.set(name, content);
	}

	/**
	 * Gets a registered template
	 * @param {string} name - Template name
	 * @returns {string|null} Template content or null if not found
	 */
	getTemplate(name) {
		return this.templates.get(name) || null;
	}

	/**
	 * Processes a template with context data
	 * @param {string} templateContent - Template content
	 * @param {TemplateContext} context - Template context
	 * @returns {string} Processed template
	 */
	processTemplate(templateContent, context) {
		if (!templateContent) {
			return '';
		}

		let result = '';
		let index = 0;

		while (index < templateContent.length) {
			const start = templateContent.indexOf('{{', index);

			if (start === -1) {
				result += templateContent.slice(index);
				break;
			}

			result += templateContent.slice(index, start);

			const end = templateContent.indexOf('}}', start + 2);
			if (end === -1) {
				// Unmatched braces - append the rest and exit
				result += templateContent.slice(start);
				break;
			}

			const tagContent = templateContent.slice(start + 2, end).trim();
			let replacement = `{{${tagContent}}}`;

			if (tagContent.length > 0) {
				const spaceIndex = tagContent.indexOf(' ');
				const name = spaceIndex === -1 ? tagContent : tagContent.slice(0, spaceIndex);
				const argsString = spaceIndex === -1 ? '' : tagContent.slice(spaceIndex + 1).trim();
				const hasArgs = argsString.length > 0;

				const helper = this.helpers[name];
				if (helper && hasArgs) {
					try {
						const parsedArgs = this.parseHelperArgs(argsString, context);
						const helperResult = helper(...parsedArgs);
						replacement = helperResult === undefined ? '' : String(helperResult);
					} catch (error) {
						console.error(`❌ Template helper error: ${error.message}`);
					}
				} else {
					const value = this.getNestedValue(context, name);
					if (value !== undefined) {
						replacement = String(value);
					}
				}
			}

			result += replacement;
			index = end + 2;
		}

		return result;
	}

	/**
	 * Gets nested value from context object
	 * @param {Object} context - Context object
	 * @param {string} path - Dot-separated path
	 * @returns {*} Value at path or undefined
	 */
	getNestedValue(context, path) {
		return path.split('.').reduce((obj, key) => obj?.[key], context);
	}

	/**
	 * Parses helper arguments
	 * @param {string} args - Arguments string
	 * @param {TemplateContext} context - Template context
	 * @returns {Array} Parsed arguments
	 */
	parseHelperArgs(args, context) {
		// Simple argument parsing - split by comma and trim
		return args.split(',').map((arg) => {
			arg = arg.trim();

			// If it's a quoted string, remove quotes
			if (
				(arg.startsWith('"') && arg.endsWith('"')) ||
				(arg.startsWith("'") && arg.endsWith("'"))
			) {
				return arg.slice(1, -1);
			}

			// If it's a variable reference, resolve it
			if (arg.startsWith('@')) {
				return this.getNestedValue(context, arg.slice(1));
			}

			// Try to parse as number
			if (!Number.isNaN(Number(arg))) {
				return Number(arg);
			}

			// Return as string
			return arg;
		});
	}

	/**
	 * Processes multiple templates
	 * @param {Object} templates - Object with template names as keys and content as values
	 * @param {TemplateContext} context - Template context
	 * @returns {ProcessedTemplate[]} Array of processed templates
	 */
	processTemplates(templates, context) {
		const processed = [];

		for (const [name, content] of Object.entries(templates)) {
			const processedContent = this.processTemplate(content, context);
			processed.push({
				name,
				path: this.generateFilePath(name, context),
				content: processedContent
			});
		}

		return processed;
	}

	/**
	 * Generates file path based on template name and context
	 * @param {string} templateName - Template name
	 * @param {TemplateContext} context - Template context
	 * @returns {string} Generated file path
	 */
	generateFilePath(templateName, context) {
		// Map template names to file paths
		const pathMap = {
			'package.json': 'package.json',
			readme: 'README.md',
			gitignore: '.gitignore',
			devcontainer: '.devcontainer/devcontainer.json',
			dockerfile: 'Dockerfile',
			circleci: '.circleci/config.yml',
			doppler: 'doppler.yaml',
			sonarcloud: 'sonar-project.properties',
			dependabot: '.github/dependabot.yml',
			tailwind: 'tailwind.config.js',
			postcss: 'postcss.config.js',
			vite: 'vite.config.js',
			svelte: 'svelte.config.js',
			typescript: 'tsconfig.json',
			vitest: 'vitest.config.js',
			playwright: 'playwright.config.js',
			eslint: '.eslintrc.js',
			prettier: '.prettierrc'
		};

		return pathMap[templateName] || templateName;
	}

	/**
	 * Loads templates from a directory or object
	 * @param {Object} templateSource - Source of templates
	 */
	loadTemplates(templateSource) {
		for (const [name, content] of Object.entries(templateSource)) {
			this.registerTemplate(name, content);
		}
	}

	/**
	 * Gets all registered template names
	 * @returns {string[]} Array of template names
	 */
	getTemplateNames() {
		return Array.from(this.templates.keys());
	}

	/**
	 * Clears all registered templates
	 */
	clearTemplates() {
		this.templates.clear();
	}
}
