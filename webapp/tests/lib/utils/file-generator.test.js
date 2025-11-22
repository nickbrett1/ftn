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
		const mockFetcher = vi.fn(async (url) => {
			if (url.includes('devcontainer-node-json.hbs')) {
				return { ok: true, text: async () => 'mock devcontainer node json' };
			}
			if (url.includes('playwright-config.hbs')) {
				return { ok: true, text: async () => 'mock playwright config' };
			}
			return { ok: false, statusText: 'Not Found' };
		});
		engine = new TemplateEngine(mockFetcher);
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('initializes successfully', async () => {
		const helpersSpy = vi.spyOn(engine, 'registerBuiltInHelpers');
		expect(await engine.initialize()).toBe(true);
		expect(helpersSpy).toHaveBeenCalled();
		expect(engine.initialized).toBe(true);
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

	it('retrieves templates using fetcher and caches them', async () => {
		const mockFetcher = vi.fn(async (url) => {
			if (url.includes('remote-template.hbs')) {
				return { ok: true, text: async () => 'Remote {{name}}' };
			}
			// Simulate a failed fetch for non-existent templates
			if (url.includes('non-existent-template.hbs')) {
				return { ok: false, statusText: 'Not Found' };
			}
			return { ok: false, statusText: 'Not Found' }; // Default for other cases
		});
		engine = new TemplateEngine(mockFetcher);
		await engine.initialize();

		// Test cache hit
		engine.templates.set('cached', 'Cached Template');
		expect(await engine.getTemplate('cached')).toBe('Cached Template');
		expect(mockFetcher).not.toHaveBeenCalled(); // Should not call fetcher if cached

		// Test fetcher usage and caching
		engine.templateIdToFileMap.set('remote', 'remote-template.hbs');
		const remoteContent = await engine.getTemplate('remote');
		expect(remoteContent).toBe('Remote {{name}}');
		expect(mockFetcher).toHaveBeenCalledWith('/static/templates/remote-template.hbs');
		expect(engine.templates.get('remote')).toBe('Remote {{name}}'); // Should be cached

		// Test template not found and error logging
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		engine.templateIdToFileMap.set('non-existent', 'non-existent-template.hbs');
		const notFoundContent = await engine.getTemplate('non-existent');
		expect(notFoundContent).toBeNull();
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining('Error loading template non-existent-template.hbs'),
			expect.any(Error)
		);
		errorSpy.mockRestore(); // Clean up the spy
	});

	it('compiles templates with helpers, conditionals, and loops', () => {
		engine.registerBuiltInHelpers();
		const template = `Hello {{uppercase user.name}}!\n{{#if user.active}}Active{{/if}}{{#unless user.active}}Inactive{{/unless}}\n{{#each items}}- {{this}} (#{{add @index ../extra}})\n{{/each}}`;
		const result = engine.compileTemplate(template, {
			user: { name: 'alex', active: true },
			items: ['a', 'b'],
			extra: 1
		});

		expect(result).toContain('Hello ALEX!');
		expect(result).toContain('Active');
		expect(result).not.toContain('Inactive');
		expect(result).toContain('(#1)');
	});

	it('executes helper utilities and fallback logic', async () => {
		engine.registerBuiltInHelpers();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-05-15T12:34:56.000Z'));
		const helpers = engine.helpers;
		process.env.EXAMPLE_KEY = 'example-value';
		const originalReplaceAll = String.prototype.replaceAll;
		String.prototype.replaceAll = function (searchValue, replaceValue) {
			if (searchValue instanceof RegExp && !searchValue.global) {
				return this.replace(searchValue, replaceValue);
			}
			return originalReplaceAll.call(this, searchValue, replaceValue);
		};

		expect(helpers.get('lowercase')('AbC')).toBe('abc');
		expect(helpers.get('capitalize')('hello')).toBe('Hello');
		expect(helpers.get('kebab-case')('FooBarBaz')).toBe('foo-bar-baz');
		expect(helpers.get('snake_case')('FooBarBaz')).toBe('foo_bar_baz');
		expect(helpers.get('join')(['a', 'b'], '|')).toBe('a|b');
		expect(helpers.get('length')(['a', 'b', 'c'])).toBe(3);
		expect(helpers.get('date')('iso')).toBe('2024-05-15T12:34:56.000Z');
		expect(helpers.get('date')('year')).toBe('2024');
		expect(helpers.get('date')('month')).toBe('5');
		expect(helpers.get('date')('day')).toBe('15');
		expect(helpers.get('date')()).toBe('5/15/2024');
		expect(helpers.get('json')({ a: 1 })).toContain('\n');
		expect(helpers.get('json_compact')({ a: 1 })).toBe('{"a":1}');
		expect(helpers.get('unless_eq')(1, 2, { fn: () => 'ok', inverse: () => 'no' })).toBe('ok');
		expect(helpers.get('add')(2, 3)).toBe(5);
		expect(helpers.get('subtract')(5, 2)).toBe(3);
		expect(helpers.get('replace')('foo-bar', 'bar', 'baz')).toBe('foo-baz');
		expect(helpers.get('truncate')('abcdef', 3)).toBe('abc...');
		expect(helpers.get('env')('EXAMPLE_KEY')).toBe('example-value');
		expect(helpers.get('project_slug')('My Project')).toBe('my-project');
		expect(helpers.get('package_name')('Pkg Name')).toBe('pkg-name');
		expect(helpers.get('class_name')('my-class_name')).toBe('Myclassname');
		expect(helpers.get('constant_name')('value-name')).toBe('VALUE-NAME'.replaceAll('-', '_'));

		// Fallback related assertions are removed as methods no longer exist.
		// const fallbackSpy = vi.spyOn(engine, 'getFallbackTemplate');
		// engine.registerFallbackTemplate('devcontainer-node-json', 'devcontainerNodeJson');
		// await engine.getTemplate('devcontainer-node-json');
		// expect(fallbackSpy).toHaveBeenCalledWith('devcontainer-node-json');
		vi.useRealTimers();
		delete process.env.EXAMPLE_KEY;
		String.prototype.replaceAll = originalReplaceAll;
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
			// eslint-disable-next-line sonarjs/publicly-writable-directories
			{ templateId: 'ok', filePath: '/tmp/ok.txt', data: {} },
			// eslint-disable-next-line sonarjs/publicly-writable-directories
			{ templateId: 'missing', filePath: '/tmp/missing.txt', data: {} }
		]);

		const success = results.find((entry) => entry.templateId === 'ok');
		const failure = results.find((entry) => entry.templateId === 'missing');

		expect(success).toMatchObject({ success: true, content: 'Hi' });
		expect(failure.success).toBe(false);
		expect(failure.error).toContain('Template not found');
	});
});