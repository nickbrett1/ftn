import { describe, it, expect, vi } from 'vitest';
import { TemplateEngine, renderTemplate } from '$lib/utils/file-generator.js';
import * as fallbackTemplates from '$lib/config/fallback-templates.js';
import Handlebars from 'handlebars';

// Mock R2 bucket
const mockR2Bucket = {
	list: vi.fn().mockResolvedValue({
		objects: [{ key: 'test-template.hbs' }, { key: 'fallback-ref.hbs' }]
	}),
	get: vi.fn((key) => {
		if (key === 'test-template.hbs') {
			return Promise.resolve({ text: () => Promise.resolve('Hello {{name}}') });
		}
		if (key === 'fallback-ref.hbs') {
			// This template refers to a fallback
			return Promise.resolve({ text: () => Promise.resolve('// Template: devcontainer-node-json') });
		}
		return Promise.resolve(null);
	})
};

describe('TemplateEngine', () => {
	it('should initialize without an R2 bucket', async () => {
		const engine = new TemplateEngine();
		const initialized = await engine.initialize();
		expect(initialized).toBe(true);
		expect(engine.r2Bucket).toBeUndefined();
	});

	it('should initialize with an R2 bucket and load templates', async () => {
		const engine = new TemplateEngine(mockR2Bucket);
		const initialized = await engine.initialize();
		expect(initialized).toBe(true);
		expect(mockR2Bucket.list).toHaveBeenCalled();
		expect(await engine.getTemplate('test-template')).toBe('Hello {{name}}');
	});

	it('should use fallback templates when specified in R2', async () => {
		vi.spyOn(fallbackTemplates, 'devcontainerNodeJson', 'get').mockReturnValue(
			'{"fallback": "{{name}}"}'
		);
		const engine = new TemplateEngine(mockR2Bucket);
		await engine.initialize();
		const template = await engine.getTemplate('fallback-ref');
		expect(template).toBe('{"fallback": "{{name}}"}');
	});

	it('should generate a file from a loaded template', async () => {
		const engine = new TemplateEngine(mockR2Bucket);
		await engine.initialize();
		const content = await engine.generateFile('test-template', { name: 'World' });
		expect(content).toBe('Hello World');
	});

	it('should throw an error if a template is not found', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();
		await expect(engine.generateFile('non-existent', {})).rejects.toThrow(
			'Template not found: non-existent'
		);
	});

	it('should generate multiple files', async () => {
		const engine = new TemplateEngine(mockR2Bucket);
		await engine.initialize();
		const requests = [
			{ templateId: 'test-template', data: { name: 'First' } },
			{ templateId: 'non-existent', data: {} }
		];
		const results = await engine.generateFiles(requests);
		expect(results).toHaveLength(2);
		expect(results[0].success).toBe(true);
		expect(results[0].content).toBe('Hello First');
		expect(results[1].success).toBe(false);
		expect(results[1].error).toBe('Template not found: non-existent');
	});

	describe('Built-in Helpers', () => {
		let engine;

		beforeEach(async () => {
			engine = new TemplateEngine();
			await engine.initialize();
		});

		it('should correctly execute the "uppercase" helper', () => {
			const result = renderTemplate('{{uppercase name}}', { name: 'test' });
			expect(result).toBe('TEST');
		});

		it('should correctly execute the "kebab-case" helper', () => {
			const result = renderTemplate('{{kebab-case "My Project Name"}}', {});
			expect(result).toBe('my-project-name');
		});

		it('should correctly execute the "json" helper', () => {
			const result = engine.compileTemplate('{{{json data}}}', { data: { key: 'value' } });
			expect(result).toBe(JSON.stringify({ key: 'value' }, null, 2));
		});

		it('should handle the if_eq helper correctly', () => {
			const template = '{{#if_eq a b}}yes{{else}}no{{/if_eq}}';
			expect(renderTemplate(template, { a: 1, b: 1 })).toBe('yes');
			expect(renderTemplate(template, { a: 1, b: 2 })).toBe('no');
		});
	});
});

describe('renderTemplate', () => {
	it('should render a simple template', () => {
		const result = renderTemplate('Hello {{name}}!', { name: 'Vitest' });
		expect(result).toBe('Hello Vitest!');
	});
});
