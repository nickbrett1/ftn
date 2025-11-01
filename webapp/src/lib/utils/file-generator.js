/**
 * @fileoverview Template engine with Handlebars for file generation
 * @description Handlebars-based template engine for generating project files
 */

import { platform } from '$app/environment';

/**
 * Template engine class using Handlebars
 */
export class TemplateEngine {
	constructor() {
		this.templates = new Map();
		this.partials = new Map();
		this.helpers = new Map();
		this.r2Bucket = platform?.env?.R2_GENPROJ;
	}

	/**
	 * Initialize template engine
	 * @returns {Promise<boolean>} True if initialized successfully
	 */
	async initialize() {
		try {
			// Register built-in helpers
			this.registerBuiltInHelpers();

			// Load templates from R2 bucket
			await this.loadTemplatesFromR2();

			console.log('✅ Template engine initialized');
			return true;
		} catch (error) {
			console.error('❌ Failed to initialize template engine:', error);
			return false;
		}
	}

	/**
	 * Register built-in Handlebars helpers
	 */
	registerBuiltInHelpers() {
		// Conditional helper
		this.registerHelper('if_eq', function (a, b, options) {
			if (a === b) {
				return options.fn(this);
			}
			return options.inverse(this);
		});

		// String manipulation helpers
		this.registerHelper('uppercase', function (str) {
			return str ? str.toUpperCase() : '';
		});

		this.registerHelper('lowercase', function (str) {
			return str ? str.toLowerCase() : '';
		});

		this.registerHelper('capitalize', function (str) {
			return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
		});

		this.registerHelper('kebab-case', function (str) {
			return str
				? str
						.replaceAll(/([A-Z])/g, '-$1')
						.toLowerCase()
						.replaceAll(/^-/, '')
				: '';
		});

		this.registerHelper('snake_case', function (str) {
			return str
				? str
						.replaceAll(/([A-Z])/g, '_$1')
						.toLowerCase()
						.replaceAll(/^_/, '')
				: '';
		});

		// Array helpers
		this.registerHelper('join', function (array, separator) {
			return Array.isArray(array) ? array.join(separator || ', ') : '';
		});

		this.registerHelper('length', function (array) {
			return Array.isArray(array) ? array.length : 0;
		});

		// Date helpers
		this.registerHelper('date', function (format) {
			const now = new Date();
			switch (format) {
				case 'iso':
					return now.toISOString();
				case 'year':
					return String(now.getFullYear());
				case 'month':
					return String(now.getMonth() + 1);
				case 'day':
					return String(now.getDate());
				default:
					return now.toLocaleDateString();
			}
		});

		// JSON helpers
		this.registerHelper('json', function (obj) {
			return JSON.stringify(obj, null, 2);
		});

		this.registerHelper('json_compact', function (obj) {
			return JSON.stringify(obj);
		});

		// Conditional helpers
		this.registerHelper('unless_eq', function (a, b, options) {
			if (a !== b) {
				return options.fn(this);
			}
			return options.inverse(this);
		});

		// Math helpers
		this.registerHelper('add', function (a, b) {
			return (a || 0) + (b || 0);
		});

		this.registerHelper('subtract', function (a, b) {
			return (a || 0) - (b || 0);
		});

		// String helpers
		this.registerHelper('replace', function (str, search, replace) {
			// eslint-disable-next-line unicorn/prefer-string-replace-all
			return str ? str.replace(new RegExp(search, 'g'), replace) : '';
		});

		this.registerHelper('truncate', function (str, length) {
			return str && str.length > length ? str.substring(0, length) + '...' : str;
		});

		// Environment helpers
		this.registerHelper('env', function (key) {
			return process.env[key] || '';
		});

		// Project-specific helpers
		this.registerHelper('project_slug', function (name) {
			// eslint-disable-next-line unicorn/prefer-string-replace-all
			return name ? name.toLowerCase().replace(/[^a-z0-9-_]/g, '-') : '';
		});

		this.registerHelper('package_name', function (name) {
			// eslint-disable-next-line unicorn/prefer-string-replace-all
			return name ? name.toLowerCase().replace(/[^a-z0-9-_]/g, '-') : '';
		});

		this.registerHelper('class_name', function (name) {
			// eslint-disable-next-line unicorn/prefer-string-replace-all
			return name ? name.replace(/[-_]/g, '').replace(/\b\w/g, (l) => l.toUpperCase()) : '';
		});

		this.registerHelper('constant_name', function (name) {
			// eslint-disable-next-line unicorn/prefer-string-replace-all
			return name ? name.toUpperCase().replace(/[^A-Z0-9_]/g, '_') : '';
		});
	}

	/**
	 * Register a custom helper
	 * @param {string} name - Helper name
	 * @param {Function} fn - Helper function
	 */
	registerHelper(name, fn) {
		this.helpers.set(name, fn);
	}

	/**
	 * Load templates from R2 bucket
	 * @returns {Promise<void>}
	 */
	async loadTemplatesFromR2() {
		if (!this.r2Bucket) {
			console.warn('⚠️ R2 bucket not available, using fallback templates');
			return;
		}

		try {
			// List all objects in the bucket
			const objects = await this.r2Bucket.list();

			for (const object of objects.objects) {
				if (object.key.endsWith('.hbs')) {
					const content = await this.r2Bucket.get(object.key);
					if (content) {
						const templateContent = await content.text();
						this.templates.set(object.key, templateContent);
						console.log(`✅ Loaded template: ${object.key}`);
					}
				}
			}
		} catch (error) {
			console.error('❌ Failed to load templates from R2:', error);
		}
	}

	/**
	 * Get template by ID
	 * @param {string} templateId - Template identifier
	 * @returns {Promise<string|null>} Template content
	 */
	async getTemplate(templateId) {
		// Check if template is already loaded
		if (this.templates.has(templateId)) {
			return this.templates.get(templateId);
		}

		const fallback = this.getFallbackTemplate(templateId);

		// Try to load from R2 bucket
		if (this.r2Bucket) {
			try {
				const object = await this.r2Bucket.get(templateId);
				if (object) {
					const content = await object.text();
					if (!this.isTemplateEmpty(content)) {
						this.templates.set(templateId, content);
						return content;
					}

					if (fallback != null) {
						this.templates.set(templateId, fallback);
						return fallback;
					}
				}
			} catch (error) {
				console.error(`❌ Failed to load template ${templateId}:`, error);
			}
		}

		// Return fallback template
		if (fallback != null) {
			this.templates.set(templateId, fallback);
		}
		return fallback;
	}

	/**
	 * Get fallback template for common templates
	 * @param {string} templateId - Template identifier
	 * @returns {string|null} Fallback template content
	 */
	getFallbackTemplate(templateId) {
		const fallbackTemplates = {
			'devcontainer-node-json': `{
  "name": "{{projectName}}",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:{{nodeVersion}}",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-eslint"
      ]
    }
  },
  "forwardPorts": [3000, 5173],
  "postCreateCommand": "{{#if_eq packageManager "npm"}}npm install{{/if_eq}}{{#if_eq packageManager "yarn"}}yarn install{{/if_eq}}{{#if_eq packageManager "pnpm"}}pnpm install{{/if_eq}}"
}`,
			'devcontainer-python-json': `{
  "name": "{{projectName}}",
  "image": "mcr.microsoft.com/devcontainers/python:{{pythonVersion}}",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.pylint",
        "ms-python.black-formatter"
      ]
    }
  },
  "postCreateCommand": "{{#if_eq packageManager "pip"}}pip install -r requirements.txt{{/if_eq}}{{#if_eq packageManager "poetry"}}poetry install{{/if_eq}}{{#if_eq packageManager "pipenv"}}pipenv install{{/if_eq}}"
}`,
			'circleci-config': `version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:{{nodeVersion}}
    steps:
      - checkout
      - run: npm install
      - run: npm test
      - run: npm run lint

  deploy:
    docker:
      - image: cimg/node:{{nodeVersion}}
    steps:
      - checkout
      - run: npm install
      - run: npm run build
      {{#if_eq deployTarget "cloudflare"}}- run: npx wrangler deploy{{/if_eq}}
      {{#if_eq deployTarget "vercel"}}- run: npx vercel deploy --prod{{/if_eq}}

workflows:
  test-and-deploy:
    jobs:
      - test
      - deploy:
          requires:
            - test
          filters:
            branches:
			  only: main`,
			'playwright-config': `// @ts-check
import { defineConfig, devices } from '@playwright/test';

const testDir = '{{configuration.playwright.testDir}}';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
	testDir: testDir || 'tests/e2e',
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		['list'],
		['html', { outputFolder: 'playwright-report', open: process.env.CI ? 'never' : 'on-failure' }]
	],
	use: {
		baseURL,
		trace: 'on-first-retry',
		video: 'retain-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}
	],
	webServer: {
		command: process.env.CI ? 'npm run build && npm run preview' : 'npm run dev',
		url: baseURL,
		reuseExistingServer: !process.env.CI
	}
});`
		};

		return fallbackTemplates[templateId] || null;
	}

	isTemplateEmpty(content) {
		if (!content) {
			return true;
		}

		const withoutBlockComments = content
			.replaceAll(/\/\*[\s\S]*?\*\//g, '')
			.replaceAll(/<!--[\s\S]*?-->/g, '');

		const meaningfulLines = withoutBlockComments
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (meaningfulLines.length === 0) {
			return true;
		}

		return meaningfulLines.every((line) => line.startsWith('//') || line.startsWith('#'));
	}

	/**
	 * Compile template with Handlebars
	 * @param {string} templateContent - Template content
	 * @param {Object} data - Template data
	 * @returns {string} Compiled template
	 */
	compileTemplate(templateContent, data) {
		try {
			// Simple Handlebars-like compilation
			let compiled = templateContent;

			// Replace variables
			// eslint-disable-next-line unicorn/prefer-string-replace-all
			compiled = compiled.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
				const trimmed = expression.trim();

				// Handle helpers
				if (trimmed.includes(' ')) {
					const parts = trimmed.split(' ');
					const helperName = parts[0];
					const helper = this.helpers.get(helperName);

					if (helper) {
						const args = parts.slice(1).map((arg) => {
							// Try to evaluate as variable
							try {
								return this.evaluateExpression(arg, data);
							} catch {
								return arg; // Return as string if not a variable
							}
						});

						return helper.apply(data, args);
					}
				}

				// Handle simple variables
				return this.evaluateExpression(trimmed, data);
			});

			// Handle conditionals
			compiled = this.compileConditionals(compiled, data);

			// Handle loops
			compiled = this.compileLoops(compiled, data);

			return compiled;
		} catch (error) {
			console.error('❌ Template compilation failed:', error);
			throw error;
		}
	}

	/**
	 * Evaluate expression in data context
	 * @param {string} expression - Expression to evaluate
	 * @param {Object} data - Data context
	 * @returns {any} Evaluated value
	 */
	evaluateExpression(expression, data) {
		const parts = expression.split('.');
		let value = data;

		for (const part of parts) {
			if (value && typeof value === 'object' && part in value) {
				value = value[part];
			} else {
				return '';
			}
		}

		return value || '';
	}

	/**
	 * Compile conditional blocks
	 * @param {string} template - Template content
	 * @param {Object} data - Data context
	 * @returns {string} Compiled template
	 */
	compileConditionals(template, data) {
		// Handle {{#if}} blocks
		// eslint-disable-next-line unicorn/prefer-string-replace-all
		template = template.replace(
			/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
			(match, condition, content) => {
				const value = this.evaluateExpression(condition.trim(), data);
				return value ? content : '';
			}
		);

		// Handle {{#unless}} blocks
		// eslint-disable-next-line unicorn/prefer-string-replace-all
		template = template.replace(
			/\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
			(match, condition, content) => {
				const value = this.evaluateExpression(condition.trim(), data);
				return value ? '' : content;
			}
		);

		return template;
	}

	/**
	 * Compile loop blocks
	 * @param {string} template - Template content
	 * @param {Object} data - Data context
	 * @returns {string} Compiled template
	 */
	compileLoops(template, data) {
		// Handle {{#each}} blocks
		// eslint-disable-next-line unicorn/prefer-string-replace-all
		template = template.replace(
			/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
			(match, arrayPath, content) => {
				const array = this.evaluateExpression(arrayPath.trim(), data);
				if (!Array.isArray(array)) return '';

				return array
					.map((item, index) => {
						const itemData = { ...data, this: item, index };
						return this.compileTemplate(content, itemData);
					})
					.join('');
			}
		);

		return template;
	}

	/**
	 * Generate file from template
	 * @param {string} templateId - Template identifier
	 * @param {Object} data - Template data
	 * @returns {Promise<string>} Generated file content
	 */
	async generateFile(templateId, data) {
		try {
			const templateContent = await this.getTemplate(templateId);
			if (!templateContent) {
				throw new Error(`Template not found: ${templateId}`);
			}

			const generatedContent = this.compileTemplate(templateContent, data);
			console.log(`✅ Generated file from template: ${templateId}`);
			return generatedContent;
		} catch (error) {
			console.error(`❌ Failed to generate file from template ${templateId}:`, error);
			throw error;
		}
	}

	/**
	 * Generate multiple files from templates
	 * @param {Array} templateRequests - Array of template requests
	 * @returns {Promise<Array>} Generated files
	 */
	async generateFiles(templateRequests) {
		const results = [];

		for (const request of templateRequests) {
			try {
				const content = await this.generateFile(request.templateId, request.data);
				results.push({
					templateId: request.templateId,
					filePath: request.filePath,
					content,
					success: true
				});
			} catch (error) {
				results.push({
					templateId: request.templateId,
					filePath: request.filePath,
					error: error.message,
					success: false
				});
			}
		}

		return results;
	}
}

// Export singleton instance
export const templateEngine = new TemplateEngine();
