// webapp/tests/utils/file-generator.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateEngine } from '$lib/utils/file-generator';
import * as fallbackTemplates from '$lib/config/fallback-templates';


describe('TemplateEngine', () => {
	let r2Bucket;
	let templateEngine;

	beforeEach(() => {
		r2Bucket = {
			get: vi.fn(),
			list: vi.fn().mockResolvedValue({ objects: [] })
		};
		templateEngine = new TemplateEngine(r2Bucket);
	});

	it('should initialize with a mock R2 bucket', () => {
		expect(templateEngine.r2Bucket).toBe(r2Bucket);
	});

	it('should initialize and register built-in helpers', async () => {
		const success = await templateEngine.initialize();
		expect(success).toBe(true);
		expect(templateEngine.helpers.size).toBeGreaterThan(0);
		expect(templateEngine.helpers.has('if_eq')).toBe(true);
	});

	it('should load templates from R2 during initialization', async () => {
		const mockTemplates = [
			{ key: 'template1.hbs', body: 'Template 1 content' },
			{ key: 'template2.hbs', body: 'Template 2 content' }
		];
		r2Bucket.list.mockResolvedValue({ objects: mockTemplates.map((t) => ({ key: t.key })) });
		r2Bucket.get.mockImplementation((key) => {
			const template = mockTemplates.find((t) => t.key === key);
			return Promise.resolve({ text: () => Promise.resolve(template.body) });
		});

		await templateEngine.initialize();

		expect(r2Bucket.list).toHaveBeenCalledTimes(1);
		expect(r2Bucket.get).toHaveBeenCalledWith('template1.hbs');
		expect(r2Bucket.get).toHaveBeenCalledWith('template2.hbs');
		expect(await templateEngine.getTemplate('template1')).toBe('Template 1 content');
		expect(await templateEngine.getTemplate('template2')).toBe('Template 2 content');
	});

	it('should register and retrieve a fallback template', () => {
		templateEngine.fallbackTemplateProvider = {
			devcontainerNodeJson: '{"name": "Mock Devcontainer Node JSON"}'
		};
		templateEngine.registerFallbackTemplate('test-template', 'devcontainerNodeJson');
		const fallback = templateEngine.getFallbackTemplate('test-template');
		expect(fallback).toBe(templateEngine.fallbackTemplateProvider.devcontainerNodeJson);
	});

	it('should compile a template with data', () => {
		const templateString = 'Hello, {{name}}!';
		const data = { name: 'World' };
		const result = templateEngine.compileTemplate(templateString, data);
		expect(result).toBe('Hello, World!');
	});

	it('should use helpers during template compilation', () => {
		const templateString = '{{uppercase name}}';
		const data = { name: 'test' };
		const result = templateEngine.compileTemplate(templateString, data);
		expect(result).toBe('TEST');
	});

	it('should generate a file from a registered template', async () => {
		templateEngine.templates.set('my-template', 'Hello, {{name}}!');
		const data = { name: 'Generated File' };
		const content = await templateEngine.generateFile('my-template', data);
		expect(content).toBe('Hello, Generated File!');
	});

	it('should throw an error when generating a file with a non-existent template', async () => {
		await expect(templateEngine.generateFile('non-existent', {})).rejects.toThrow(
			'Template not found: non-existent'
		);
	});

	it('should generate multiple files', async () => {
		templateEngine.templates.set('t1', 'File 1: {{message}}');
		templateEngine.templates.set('t2', 'File 2: {{message}}');
		const requests = [
			{ templateId: 't1', data: { message: 'First' } },
			{ templateId: 't2', data: { message: 'Second' } },
			{ templateId: 't3', data: { message: 'Third' } } // Non-existent
		];

		const results = await templateEngine.generateFiles(requests);

		expect(results.length).toBe(3);
		expect(results[0].success).toBe(true);
		expect(results[0].content).toBe('File 1: First');
		expect(results[1].success).toBe(true);
		expect(results[1].content).toBe('File 2: Second');
		expect(results[2].success).toBe(false);
		expect(results[2].error).toBe('Template not found: t3');
	});

	it('should use fallback template if R2 fails or template is marked for fallback', async () => {
		templateEngine.fallbackTemplateProvider = {
			devcontainerNodeJson: '{"name": "Mock Devcontainer Node JSON"}'
		};
		r2Bucket.get.mockResolvedValue(null);
		templateEngine.registerFallbackTemplate('devcontainer-node-json', 'devcontainerNodeJson');

		const content = await templateEngine.generateFile('devcontainer-node-json', {});
		expect(content).toBe(templateEngine.fallbackTemplateProvider.devcontainerNodeJson);
	});
});
