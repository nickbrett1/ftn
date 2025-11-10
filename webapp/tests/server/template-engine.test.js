import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { TemplateEngineService } from '../../src/lib/server/template-engine.js';

describe('TemplateEngineService', () => {
	let engine;

	beforeEach(() => {
		engine = new TemplateEngineService();
		vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => array.fill(1));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('registers and retrieves templates', () => {
		engine.registerTemplate('example', 'content');
		expect(engine.getTemplate('example')).toBe('content');
		expect(engine.getTemplateNames()).toEqual(['example']);

		engine.clearTemplates();
		expect(engine.getTemplateNames()).toEqual([]);
	});

	it('processes templates with variables and helpers', () => {
		const template = `Project {{projectName}} {{formatProjectName @projectName, "snake"}} {{timestamp}} {{randomString 4}} {{#}}`;
		const context = {
			projectName: 'My Project',
			capabilities: ['sveltekit', 'tailwindcss'],
			configuration: { sveltekit: { adapter: 'auto' } },
			timestamp: '2025-11-01T00:00:00.000Z'
		};

		const result = engine.processTemplate(template, context);

		expect(result).toContain('Project My Project my_project');
		expect(result).toContain('2025-11-01T00:00:00.000Z');
		expect(result).toContain('BBBB'); // deterministic random string
	});

	it('resolves nested values and helper arguments', () => {
		const template = '{{getCapabilityConfig @configuration, "sveltekit", "adapter"}}';
		const context = { configuration: { sveltekit: { adapter: 'auto' } } };
		const result = engine.processTemplate(template, context);
		expect(result).toBe('auto');
	});

	it('helper utilities handle capability checks and dependency lists', () => {
		const helpers = engine.helpers;
		expect(helpers.hasCapability(['a', 'b'], 'b')).toBe(true);
		expect(helpers.getCapabilityConfig({ svc: { key: 'value' } }, 'svc', 'key')).toBe('value');
		const deps = JSON.parse(helpers.generateDependencies(['sveltekit', 'tailwindcss']));
		expect(Object.keys(deps)).toEqual(expect.arrayContaining(['@sveltejs/kit', 'tailwindcss']));
		const developmentDeps = JSON.parse(helpers.generateDevDependencies(['typescript', 'testing']));
		expect(developmentDeps).toMatchObject({
			typescript: expect.any(String),
			vitest: expect.any(String)
		});
		expect(helpers.join(['x', 'y'], ' / ')).toBe('x / y');
		expect(helpers.capitalize('example')).toBe('Example');
	});

	it('processes multiple templates and generates paths', () => {
		const processed = engine.processTemplates(
			{
				'package.json': '{ "name": "{{projectName}}" }',
				readme: '# {{projectName}}'
			},
			{ projectName: 'Sample' }
		);

		expect(processed).toEqual([
			{
				name: 'package.json',
				path: 'package.json',
				content: '{ "name": "Sample" }'
			},
			{
				name: 'readme',
				path: 'README.md',
				content: '# Sample'
			}
		]);

		expect(engine.generateFilePath('unknown', {})).toBe('unknown');
	});

	it('parses helper arguments including numbers and strings', () => {
		const arguments_ = engine.parseHelperArgs("@projectName, 'kebab', 5", {
			projectName: 'Hello World'
		});

		expect(arguments_).toEqual(['Hello World', 'kebab', 5]);
	});

	it('loads template sources and retrieves registered names', () => {
		engine.loadTemplates({ a: 'one', b: 'two' });
		expect(engine.getTemplate('a')).toBe('one');
		expect(new Set(engine.getTemplateNames())).toEqual(new Set(['a', 'b']));
	});

	it('returns empty string for undefined or empty templates', () => {
		expect(engine.processTemplate(undefined, {})).toBe('');
		expect(engine.processTemplate('', {})).toBe('');
	});

	it('preserves placeholder when helper or value is missing', () => {
		const result = engine.processTemplate('Value: {{unknown}}', {});
		expect(result).toBe('Value: {{unknown}}');
	});

	it('gracefully handles missing closing braces', () => {
		const result = engine.processTemplate('Hello {{name', { name: 'World' });
		expect(result).toBe('Hello {{name');
	});

	it('swallows helper errors and continues rendering', () => {
		engine.helpers.fail = () => {
			throw new Error('boom');
		};

		const output = engine.processTemplate('Before {{fail "x"}} After', {});
		expect(output).toBe('Before  After');
		delete engine.helpers.fail;
	});
});
