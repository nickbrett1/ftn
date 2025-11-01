import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { TemplateEngineService } from '../../src/lib/server/template-engine.js';

describe('TemplateEngineService', () => {
	let engine;
	let getRandomValuesSpy;

	beforeEach(() => {
		engine = new TemplateEngineService();
		getRandomValuesSpy = vi
			.spyOn(globalThis.crypto, 'getRandomValues')
			.mockImplementation((array) => array.fill(1));
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
	});

	it('parses helper arguments including numbers and strings', () => {
		const args = engine.parseHelperArgs("@projectName, 'kebab', 5", {
			projectName: 'Hello World'
		});

		expect(args).toEqual(['Hello World', 'kebab', 5]);
	});
});
