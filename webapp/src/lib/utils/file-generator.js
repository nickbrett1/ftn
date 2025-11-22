// webapp/src/lib/utils/file-generator.js

import Handlebars from 'handlebars';
import * as fallbackTemplates from '$lib/config/fallback-templates';

export class TemplateEngine {
	constructor(r2Bucket) {
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
			uppercase: (string_) => string_.toUpperCase(),
			lowercase: (string_) => string_.toLowerCase(),
			capitalize: (string_) => string_.charAt(0).toUpperCase() + string_.slice(1),
			'kebab-case': (string_) =>
				string_
					.replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
					.replaceAll(/[\s_]+/g, '-')
					.toLowerCase(),
			snake_case: (string_) =>
				string_
					.replaceAll(/([a-z0-9])([A-Z])/g, '$1_$2')
					.replaceAll(/[\s-]+/g, '_')
					.toLowerCase(),
			join: (array, separator) => array.join(separator),
			length: (array) => array.length,
			date: (format) => {
				const d = new Date();
				if (format === 'iso') return d.toISOString();
				if (format === 'year') return String(d.getFullYear());
				if (format === 'month') return String(d.getMonth() + 1);
				if (format === 'day') return String(d.getDate());
				return d.toLocaleDateString();
			},
			json: (object) => JSON.stringify(object, null, 2),
			json_compact: (object) => JSON.stringify(object),
			add: (a, b) => Number(a) + Number(b),
			subtract: (a, b) => Number(a) - Number(b),
			replace: (string_, find, replace) => string_.replaceAll(find, replace),
			truncate: (string_, length_) => (string_.length > length_ ? string_.slice(0, length_) + '...' : string_),
			env: (key) => process.env[key],
			project_slug: (name) => name.toLowerCase().replaceAll(/\s+/g, '-'),
			package_name: (name) => name.toLowerCase().replaceAll(/\s+/g, '-'),
			class_name: (name) =>
				name.replaceAll(/[^a-zA-Z0-9]/g, '').replace(/^\w/, (c) => c.toUpperCase()),
			constant_name: (name) => name.toUpperCase().replaceAll(/[\s-]/g, '_')
		};

		for (const [name, function_] of Object.entries(helpers)) {
			this.helpers.set(name, function_);
			Handlebars.registerHelper(name, function_);
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
		for (const [index, request] of fileRequests.entries()) {
			try {
				const content = await this.generateFile(request.templateId, { ...request.data, index });
				results.push({ ...request, success: true, content });
			} catch (error) {
				results.push({ ...request, success: false, error: error.message });
			}
		}
		return results;
	}
}

export function renderTemplate(templateString, data) {
	const template = Handlebars.compile(templateString);
	return template(data);
}
