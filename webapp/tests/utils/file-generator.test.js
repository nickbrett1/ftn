import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('$app/environment', () => ({
	platform: {
		env: {}
	}
}));

import { TemplateEngine } from '$lib/utils/file-generator.js';

describe('TemplateEngine', () => {
	let engine;

	beforeEach(() => {
		engine = new TemplateEngine();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('initializes successfully and handles failures', async () => {
		const loadSpy = vi.spyOn(engine, 'loadTemplatesFromR2').mockResolvedValue();
		const helpersSpy = vi.spyOn(engine, 'registerBuiltInHelpers');
		expect(await engine.initialize()).toBe(true);
		expect(helpersSpy).toHaveBeenCalled();
		expect(loadSpy).toHaveBeenCalled();

		loadSpy.mockRejectedValueOnce(new Error('boom'));
		expect(await engine.initialize()).toBe(false);
	});

	it('registers built-in helpers', () => {
		engine.registerBuiltInHelpers();
		const helperNames = [
			'if_eq',
			'uppercase',
			'lowercase',
			'capitalize',
			'kebab-case',
			'snake_case',
			'join',
			'length',
			'date',
			'json',
			'json_compact',
			'unless_eq',
			'add',
			'subtract',
			'replace',
			'truncate',
			'env',
			'project_slug',
			'package_name',
			'class_name',
			'constant_name'
		];

		for (const name of helperNames) {
			expect(engine.helpers.has(name)).toBe(true);
		}

		const uppercase = engine.helpers.get('uppercase');
		expect(uppercase('hello')).toBe('HELLO');
	});

	it('loads templates from R2 bucket when available', async () => {
		const mockBucket = {
			list: vi.fn().mockResolvedValue({
				objects: [{ key: 'template.hbs' }, { key: 'ignore.txt' }]
			}),
			get: vi.fn().mockImplementation(async (key) => {
				if (key === 'template.hbs') {
					return { text: async () => 'Hello {{name}}' };
				}
				return null;
			})
		};

		engine.r2Bucket = mockBucket;
		await engine.loadTemplatesFromR2();
		expect(engine.templates.get('template.hbs')).toBe('Hello {{name}}');
		expect(engine.templates.get('template')).toBe('Hello {{name}}');
		expect(mockBucket.list).toHaveBeenCalled();
	});

	it('replaces comment-only remote templates with fallback during load', async () => {
		const mockBucket = {
			list: vi.fn().mockResolvedValue({
				objects: [{ key: 'playwright/playwright.config.js.hbs' }]
			}),
			get: vi.fn().mockResolvedValue({
				text: vi
					.fn()
					.mockResolvedValue('// Generated file for playwright\n// Template: playwright-config')
			})
		};

		engine.r2Bucket = mockBucket;
		await engine.loadTemplatesFromR2();
		expect(engine.templates.get('playwright-config')).toContain('defineConfig');
		expect(engine.templates.get('playwright/playwright.config.js.hbs')).toContain('defineConfig');
		expect(mockBucket.list).toHaveBeenCalled();
	});

	it('retrieves templates from cache, bucket, and fallbacks', async () => {
		engine.templates.set('cached', 'Cached Template');
		expect(await engine.getTemplate('cached')).toBe('Cached Template');

		const mockBucket = {
			get: vi.fn().mockImplementation(async (key) => {
				if (key === 'remote') {
					return { text: async () => 'From bucket' };
				}
				return null;
			})
		};
		engine.r2Bucket = mockBucket;
		expect(await engine.getTemplate('remote')).toBe('From bucket');

		expect(await engine.getTemplate('devcontainer-node-json')).toContain(
			'"name": "{{projectName}}"'
		);
		expect(await engine.getTemplate('playwright-config')).toContain('defineConfig');
	});

	it('uses fallback when remote template is comment-only', async () => {
		const mockBucket = {
			get: vi.fn().mockResolvedValue({
				text: vi.fn().mockResolvedValue('// placeholder\n// TODO: fill in')
			})
		};

		engine.r2Bucket = mockBucket;
		const template = await engine.getTemplate('playwright-config');
		expect(template).toContain('defineConfig');
	});

	it('compiles templates with helpers, conditionals, and loops', () => {
		engine.registerBuiltInHelpers();
		const template = `Hello {{uppercase user.name}}!\n{{#if user.active}}Active{{/if}}{{#unless user.active}}Inactive{{/unless}}\n{{#each items}}- {{this}} (#{{add index extra}})\n{{/each}}`;
		const result = engine.compileTemplate(template, {
			user: { name: 'alex', active: true },
			items: ['a', 'b'],
			extra: 1
		});

		expect(result).toContain('Hello ALEX!');
		expect(result).toContain('Active');
		expect(result).toContain('Inactive');
		expect(result).toContain('(#1)');
	});

	it('generates files and handles missing templates', async () => {
		engine.templates.set('tmpl', 'Hello {{name}}');
		const content = await engine.generateFile('tmpl', { name: 'world' });
		expect(content).toBe('Hello world');

		await expect(engine.generateFile('missing', {})).rejects.toThrow('Template not found');
	});

	it('generates multiple files collecting errors', async () => {
		engine.templates.set('ok', 'Hi');
		const results = await engine.generateFiles([
			{ templateId: 'ok', filePath: '/tmp/ok.txt', data: {} },
			{ templateId: 'missing', filePath: '/tmp/missing.txt', data: {} }
		]);

		const success = results.find((entry) => entry.templateId === 'ok');
		const failure = results.find((entry) => entry.templateId === 'missing');

		expect(success).toMatchObject({ success: true, content: 'Hi' });
		expect(failure.success).toBe(false);
		expect(failure.error).toContain('Template not found');
	});
});
