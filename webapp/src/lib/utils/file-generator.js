// webapp/src/lib/utils/file-generator.js

import Handlebars from 'handlebars';
import * as fallbackTemplates from '$lib/config/fallback-templates';

export class TemplateEngine {
	constructor(r2Bucket = undefined) {
		// Accept r2Bucket as an argument
		this.templates = new Map();
		this.helpers = new Map();
		this.r2Bucket = r2Bucket; // Use the passed r2Bucket
		this.fallbackTemplateMap = new Map();
	}

	async initialize() {
		try {
			this.registerBuiltInHelpers();
			this.registerFallbackTemplate('devcontainer-node-json', 'devcontainerNodeJson');
			this.registerFallbackTemplate('playwright-config', 'playwrightConfig');
			await this.loadTemplatesFromR2();
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
					.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
					.replace(/[\s_]+/g, '-')
					.toLowerCase(),
			snake_case: (str) =>
				str
					.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
					.replace(/[\s-]+/g, '_')
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
			replace: (str, find, replace) => str.replace(new RegExp(find, 'g'), replace),
			truncate: (str, len) => (str.length > len ? str.slice(0, len) + '...' : str),
			env: (key) => process.env[key],
			project_slug: (name) => name.toLowerCase().replace(/\s+/g, '-'),
			package_name: (name) => name.toLowerCase().replace(/\s+/g, '-'),
			class_name: (name) =>
				name.replace(/[^a-zA-Z0-9]/g, '').replace(/^\w/, (c) => c.toUpperCase()),
			constant_name: (name) => name.toUpperCase().replace(/[\s-]/g, '_')
		};

		for (const [name, fn] of Object.entries(helpers)) {
			this.helpers.set(name, fn);
			Handlebars.registerHelper(name, fn);
		}
	}

	async loadTemplatesFromR2() {
		if (!this.r2Bucket) {
			console.warn('R2 bucket not available. Skipping template loading from R2.');
			return;
		}

		const listed = await this.r2Bucket.list();
		for (const object of listed.objects) {
			await this._processTemplateObject(object);
		}
	}

	async _processTemplateObject(object) {
		if (object.key.endsWith('.hbs')) {
			const body = await this.r2Bucket.get(object.key);
			if (body) {
				let content = await body.text();
				const templateName = object.key.replace('.hbs', '');
				if (content.trim().startsWith('//')) {
					let fallbackName = templateName;
					const match = content.match(/Template:\s*(\S+)/);
					if (match) {
						fallbackName = match[1];
					}
					const fallback = this.getFallbackTemplate(fallbackName);
					if (fallback) {
						content = fallback;
						this.templates.set(fallbackName, content);
					}
				}
				this.templates.set(object.key, content);
				this.templates.set(templateName, content);
			}
		}
	}

	registerFallbackTemplate(name, fallbackName) {
		this.fallbackTemplateMap.set(name, fallbackName);
	}

	getFallbackTemplate(name) {
		const fallbackName = this.fallbackTemplateMap.get(name);
		return fallbackTemplates[fallbackName] || null;
	}

	async getTemplate(name) {
		if (this.templates.has(name)) {
			return this.templates.get(name);
		}

		if (this.r2Bucket) {
			const body = await this.r2Bucket.get(name);
			if (body) {
				const content = await body.text();
				if (content.trim().startsWith('//')) {
					const fallback = this.getFallbackTemplate(name);
					if (fallback) {
						this.templates.set(name, fallback);
						return fallback;
					}
				} else {
					this.templates.set(name, content);
					return content;
				}
			}
		}

		const fallback = this.getFallbackTemplate(name);
		if (fallback) {
			this.templates.set(name, fallback);
			return fallback;
		}

		return null;
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
