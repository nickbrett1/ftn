// webapp/src/lib/utils/file-generator.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateEngine } from './file-generator.js';

// Mock R2Bucket
const mockR2Bucket = {
	list: vi.fn(),
	get: vi.fn()
};

describe('File Generator', () => {
	let engine;

	beforeEach(() => {
		vi.clearAllMocks();
		engine = new TemplateEngine(mockR2Bucket);
	});

	describe('TemplateEngine', () => {
		it('should initialize correctly', async () => {
			mockR2Bucket.list.mockResolvedValue({ objects: [] });
			const result = await engine.initialize();
			expect(result).toBe(true);
			expect(engine.helpers.has('if_eq')).toBe(true);
			expect(engine.helpers.has('uppercase')).toBe(true);
			expect(engine.fallbackTemplateMap.has('devcontainer-node-json')).toBe(true);
		});

        it('should handle initialization failure', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockR2Bucket.list.mockRejectedValue(new Error('R2 failed'));
            const result = await engine.initialize();
            expect(result).toBe(false);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize TemplateEngine:', expect.any(Error));
            consoleErrorSpy.mockRestore();
        });


		it('should load templates from R2 and use fallbacks', async () => {
			const mockTemplates = [
				{ key: 'template1.hbs', body: 'Hello {{name}}' },
				{ key: 'devcontainer-node-json.hbs', body: '// Template: devcontainer-node-json' }
			];

			mockR2Bucket.list.mockResolvedValue({ objects: mockTemplates.map(({ key }) => ({ key })) });
			mockR2Bucket.get.mockImplementation(async (key) => {
				const template = mockTemplates.find((t) => t.key === key);
				if (template) {
					return { text: async () => template.body };
				}
				return null;
			});

			// Spy on getFallbackTemplate to provide a controlled fallback
			const fallbackSpy = vi.spyOn(engine, 'getFallbackTemplate').mockReturnValue('{"name":"Fallback"}');

            await engine.initialize();

			expect(await engine.getTemplate('template1')).toBe('Hello {{name}}');
            expect(await engine.getTemplate('devcontainer-node-json')).toBe('{"name":"Fallback"}');
			expect(fallbackSpy).toHaveBeenCalledWith('devcontainer-node-json');
		});

		it('should generate a single file', async () => {
			const templateId = 'greeting';
			const templateString = 'Hello, {{name}}!';
			engine.templates.set(templateId, templateString);

			const data = { name: 'World' };
			const content = await engine.generateFile(templateId, data);

			expect(content).toBe('Hello, World!');
		});

		it('should throw an error if template is not found for single file generation', async () => {
			// Mock getFallbackTemplate to return null for this test
			vi.spyOn(engine, 'getFallbackTemplate').mockReturnValue(null);
			await expect(engine.generateFile('nonexistent', {})).rejects.toThrow(
				'Template not found: nonexistent'
			);
		});

		it('should generate multiple files', async () => {
			engine.templates.set('template1', 'File 1: {{val}}');
			engine.templates.set('template2', 'File 2: {{val}}');

			const requests = [
				{ templateId: 'template1', data: { val: 'A' } },
				{ templateId: 'template2', data: { val: 'B' } }
			];

			const results = await engine.generateFiles(requests);

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[0].content).toBe('File 1: A');
			expect(results[1].success).toBe(true);
			expect(results[1].content).toBe('File 2: B');
		});

		it('should handle errors during multiple file generation', async () => {
			engine.templates.set('good-template', 'Good');
			// Mock getFallbackTemplate to return null for this test
			vi.spyOn(engine, 'getFallbackTemplate').mockReturnValue(null);

			const requests = [
				{ templateId: 'good-template', data: {} },
				{ templateId: 'bad-template', data: {} }
			];

			const results = await engine.generateFiles(requests);

			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[0].content).toBe('Good');
			expect(results[1].success).toBe(false);
			expect(results[1].error).toBe('Template not found: bad-template');
		});
	});
});
