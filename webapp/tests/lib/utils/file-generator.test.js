import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateEngine } from '$lib/utils/file-generator.js';

describe('TemplateEngine', () => {
	let engine;

	beforeEach(async () => {
		engine = new TemplateEngine();
		await engine.initialize();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('initializes successfully and loads template strings', () => {
		expect(engine.initialized).toBe(true);
		expect(engine.templates.has('devcontainer-node-json')).toBe(true);
		expect(typeof engine.templates.get('devcontainer-node-json')).toBe('string');
	});

	it('retrieves template strings', () => {
		const template = engine.getTemplate('devcontainer-node-json');
		expect(template).toContain('"name": "Node.js"'); // Check for a substring
	});

	it('replaces variables in template string', () => {
		const result = engine.compileTemplate('Hello {{name}} and {{nested.prop}}', { name: 'world', nested: { prop: 'value' } });
		expect(result).toBe('Hello world and value');
	});
    
    it('replaces variables from a real template file', () => {
        const template = engine.getTemplate('devcontainer-java-dockerfile');
        const result = engine.compileTemplate(template, { javaVersion: '17' });
        expect(result).toContain('ARG VARIANT="17"');
        expect(result).toContain('FROM mcr.microsoft.com/devcontainers/java:0-17');
    });

	it('generates files and handles missing templates', () => {
		const content = engine.generateFile('devcontainer-java-dockerfile', { javaVersion: '17' });
		expect(content).toContain('ARG VARIANT="17"');

		expect(() => engine.generateFile('missing', {})).toThrow('Template not found');
	});

	it('generates multiple files collecting errors', () => {
		const results = engine.generateFiles([
			{ templateId: 'devcontainer-java-dockerfile', filePath: '/tmp/ok.txt', data: { javaVersion: '17' } },
			{ templateId: 'missing', filePath: '/tmp/missing.txt', data: {} }
		]);

		const success = results.find((entry) => entry.templateId === 'devcontainer-java-dockerfile');
		const failure = results.find((entry) => entry.templateId === 'missing');

		expect(success).toBeDefined();
        expect(success.success).toBe(true);
        expect(success.content).toContain('ARG VARIANT="17"');
		expect(failure.success).toBe(false);
		expect(failure.error).toContain('Template not found');
	});
});