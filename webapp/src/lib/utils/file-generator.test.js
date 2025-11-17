// webapp/src/lib/utils/file-generator.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateEngine, renderTemplate } from './file-generator.js';
import * as fallbackTemplates from '$lib/config/fallback-templates';

// Mock the fallback templates module
vi.mock('$lib/config/fallback-templates', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        getFallbackTemplate: (name) => {
            if (name === 'devcontainer-node-json') {
                return JSON.stringify({ name: 'Fallback Node Devcontainer' });
            }
            if (name === 'playwright-config') {
                return 'const config = {}; // Fallback Playwright Config';
            }
            return null;
        },
    };
});

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


		it('should load templates from R2', async () => {
			const mockTemplates = [
				{ key: 'template1.hbs', body: 'Hello {{name}}' },
				{ key: 'template2.hbs', body: 'Goodbye {{name}}' },
                // This template will use a fallback
				{ key: 'devcontainer-node-json.hbs', body: '// Template: devcontainer-node-json' }
			];

			mockR2Bucket.list.mockResolvedValue({ objects: mockTemplates.map(({ key }) => ({ key })) });
			for (const { key, body } of mockTemplates) {
				mockR2Bucket.get.mockImplementation(async (k) => {
                    if (k === key) {
                        return { text: async () => body };
                    }
                    return null;
                });
			}

            await engine.initialize(); // Re-initialize to load templates

			expect(await engine.getTemplate('template1')).toBe('Hello {{name}}');
			expect(await engine.getTemplate('template2')).toBe('Goodbye {{name}}');
            expect(await engine.getTemplate('devcontainer-node-json')).toBe(fallbackTemplates.devcontainerNodeJson);
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
			await expect(engine.generateFile('nonexistent', {})).rejects.toThrow(
				'Template not found: nonexistent'
			);
		});

		it('should generate multiple files', async () => {
			engine.templates.set('template1', 'File 1: {{data.val}}');
			engine.templates.set('template2', 'File 2: {{data.val}}');

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

		it('should pass correct data to generateFile', async () => {
			const generateFileSpy = vi.spyOn(engine, 'generateFile');
			engine.templates.set('test-template', '{{val}}');

			const requests = [{ templateId: 'test-template', data: { val: 'A' } }];
			await engine.generateFiles(requests);

			expect(generateFileSpy).toHaveBeenCalledWith('test-template', {
				val: 'A',
				index: 0
			});
		});
	});

	describe('renderTemplate', () => {
		it('should render a template string with data', () => {
			const templateString = '<h1>{{title}}</h1><p>{{content}}</p>';
			const data = { title: 'Test Title', content: 'This is a test.' };
			const result = renderTemplate(templateString, data);
			expect(result).toBe('<h1>Test Title</h1><p>This is a test.</p>');
		});

        it('should handle handlebars helpers', () => {
            // Register a helper for testing
            const localEngine = new TemplateEngine();
            localEngine.registerTextHelpers();

            const templateString = '{{uppercase name}}';
            const data = { name: 'jules' };
            const result = renderTemplate(templateString, data);
            expect(result).toBe('JULES');
        });

		it('should handle array helpers', () => {
			const localEngine = new TemplateEngine();
			localEngine.registerArrayHelpers();
			const templateString = '{{join arr ", "}}';
			const data = { arr: ['a', 'b', 'c'] };
			const result = renderTemplate(templateString, data);
			expect(result).toBe('a, b, c');
		});

		it('should handle date helpers', () => {
			const localEngine = new TemplateEngine();
			localEngine.registerDateHelpers();
			const templateString = '{{date "year"}}';
			const result = renderTemplate(templateString, {});
			expect(result).toBe(new Date().getFullYear().toString());
		});

		it('should handle object helpers', () => {
			const localEngine = new TemplateEngine();
			localEngine.registerObjectHelpers();
			const templateString = '{{json obj}}';
			const data = { obj: { a: 1 } };
			const result = renderTemplate(templateString, data);
			expect(result).toBe(JSON.stringify({ a: 1 }, null, 2));
		});

		it('should handle math helpers', () => {
			const localEngine = new TemplateEngine();
			localEngine.registerMathHelpers();
			const templateString = '{{add 1 2}}';
			const result = renderTemplate(templateString, {});
			expect(result).toBe('3');
		});

		it('should handle project helpers', () => {
			const localEngine = new TemplateEngine();
			localEngine.registerProjectHelpers();
			const templateString = '{{project_slug "My Project"}}';
			const result = renderTemplate(templateString, {});
			expect(result).toBe('my-project');
		});
	});
});
