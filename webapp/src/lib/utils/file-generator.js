// webapp/src/lib/utils/file-generator.js

import Handlebars from 'handlebars';

const BASE_URL = '/static/templates/';

export class TemplateEngine {
	constructor(fetcher) {
		this.templates = new Map();
		this.helpers = new Map();
		this.templateIdToFileMap = new Map(); // Maps templateId to filename in static/templates
		this.initialized = false; // Add a flag to prevent re-initialization
        this.fetcher = fetcher;
	}

	async initialize() {
		if (this.initialized) {
            return true; // Already initialized, prevent redundant calls
        }
		try {
			this.registerBuiltInHelpers();
            // Register template IDs and their corresponding static file names
			this.templateIdToFileMap.set('devcontainer-node-json', 'devcontainer-node-json.hbs');
            this.templateIdToFileMap.set('devcontainer-python-json', 'devcontainer-python-json.hbs');
            this.templateIdToFileMap.set('devcontainer-java-json', 'devcontainer-java-json.hbs');
            this.templateIdToFileMap.set('devcontainer-node-dockerfile', 'devcontainer-node-dockerfile.hbs');
            this.templateIdToFileMap.set('devcontainer-python-dockerfile', 'devcontainer-python-dockerfile.hbs');
            this.templateIdToFileMap.set('devcontainer-java-dockerfile', 'devcontainer-java-dockerfile.hbs');
            this.templateIdToFileMap.set('devcontainer-zshrc-full', 'devcontainer-zshrc-full.hbs');
            this.templateIdToFileMap.set('devcontainer-p10k-zsh-full', 'devcontainer-p10k-zsh-full.hbs');
            this.templateIdToFileMap.set('devcontainer-post-create-setup-sh', 'devcontainer-post-create-setup-sh.hbs');
			this.templateIdToFileMap.set('playwright-config', 'playwright-config.hbs');
            this.initialized = true;
			return true;
		} catch (error) {
			console.error('Failed to initialize TemplateEngine:', error);
			return false;
		}
	}

	registerBuiltInHelpers() {
		const helpers = {
			if_eq: function (a, b, options) {
				if (a === b) {
					return options.fn(this);
				}
				return options.inverse(this);
			},
			unless_eq: function (a, b, options) {
				if (a !== b) {
					return options.fn(this);
				}
				return options.inverse(this);
			},
			uppercase: (str) => str.toUpperCase(),
			lowercase: (str) => str.toLowerCase(),
			capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
			'kebab-case': (str) =>
				str
					.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
					.replaceAll(/[\s_]+/g, '-')
					.toLowerCase(),
			snake_case: (str) =>
				str
					.replaceAll(/([a-z0-9])([A-Z])/g, '$1_$2')
					.replaceAll(/[\s-]+/g, '_')
					.toLowerCase(),
			join: (arr, sep) => arr.join(sep),
			length: (arr) => arr.length,
			date: (format) => {
				const d = new Date();
				if (format === 'iso') return d.toISOString();
				if (format === 'year') return String(d.getFullYear());
				if (format === 'month') return String(d.getMonth() + 1);
				if (format === 'day') return String(d.getDate());
				return d.toLocaleDateString();
			},
			json: (obj) => JSON.stringify(obj, null, 2),
			json_compact: (obj) => JSON.stringify(obj),
			add: (a, b) => Number(a) + Number(b),
			subtract: (a, b) => Number(a) - Number(b),
			replace: (str, find, replace) => str.replaceAll(find, replace),
			truncate: (str, len) => (str.length > len ? str.slice(0, len) + '...' : str),
			env: (key) => process.env[key],
			project_slug: (name) => name.toLowerCase().replaceAll(/\s+/g, '-'),
			package_name: (name) => name.toLowerCase().replaceAll(/\s+/g, '-'),
			class_name: (name) =>
				name.replaceAll(/[^a-zA-Z0-9]/g, '').replace(/^\w/, (c) => c.toUpperCase()),
			constant_name: (name) => name.toUpperCase().replaceAll(/[\s-]/g, '_')
		};

		for (const [name, fn] of Object.entries(helpers)) {
			this.helpers.set(name, fn);
			Handlebars.registerHelper(name, fn);
		}
	}

	async getTemplate(name) {
		if (this.templates.has(name)) {
			return this.templates.get(name);
		}

		const fileName = this.templateIdToFileMap.get(name);

        if (!fileName) {
            return null; // No file registered for this templateId
        }

		try {
			const response = await this.fetcher(BASE_URL + fileName);
			if (!response.ok) {
				throw new Error(`Failed to fetch template ${fileName}: ${response.statusText}`);
			}
			const content = await response.text();
			this.templates.set(name, content); // Cache the fetched template
			return content;
		} catch (error) {
			console.error(`Error loading template ${fileName}:`, error);
			return null;
		}
	}

	compileTemplate(templateString, data) {
		const template = Handlebars.compile(templateString);
		return template(data);
	}

	async generateFile(templateId, data) {
		const template = await this.getTemplate(templateId);
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}
		return this.compileTemplate(template, data);
	}

	async generateFiles(fileRequests) {
		const results = [];
		for (const [index, req] of fileRequests.entries()) {
			try {
				const content = await this.generateFile(req.templateId, { ...req.data, index });
				results.push({ ...req, success: true, content });
			} catch (error) {
				results.push({ ...req, success: false, error: error.message });
			}
		}
		return results;
	}
}

export function renderTemplate(templateString, data) {
	const template = Handlebars.compile(templateString);
	return template(data);
}