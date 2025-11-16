import { describe, it, expect, vi } from 'vitest';
import { TemplateEngine, renderTemplate } from '$lib/utils/file-generator.js';
import * as fallbackTemplates from '$lib/config/fallback-templates';

// Mock R2Bucket
const mockR2Bucket = {
	list: vi.fn().mockResolvedValue({
		objects: [
			{ key: 'template1.hbs' },
			{ key: 'template2.hbs' },
			{ key: 'devcontainer-node-json.hbs' }
		]
	}),
	get: vi.fn().mockImplementation((key) => {
		if (key === 'template1.hbs') {
			return Promise.resolve({ text: () => Promise.resolve('Hello, {{name}}!') });
		}
		if (key === 'template2.hbs') {
			return Promise.resolve({ text: () => Promise.resolve('Goodbye, {{name}}!') });
		}
		if (key === 'devcontainer-node-json.hbs') {
			return Promise.resolve({
				text: () => Promise.resolve('// Template: devcontainerNodeJson')
			});
		}
		return Promise.resolve(null);
	})
};

describe('file-generator', () => {
	describe('renderTemplate', () => {
		it('should render a simple template', () => {
			const template = 'Hello, {{name}}!';
			const data = { name: 'World' };
			const result = renderTemplate(template, data);
			expect(result).toBe('Hello, World!');
		});
	});

	describe('TemplateEngine', () => {
		it('should initialize without R2 bucket', async () => {
			const engine = new TemplateEngine();
			const result = await engine.initialize();
			expect(result).toBe(true);
		});

		it('should initialize with R2 bucket', async () => {
			const engine = new TemplateEngine(mockR2Bucket);
			const result = await engine.initialize();
			expect(result).toBe(true);
			expect(mockR2Bucket.list).toHaveBeenCalled();
			expect(mockR2Bucket.get).toHaveBeenCalledWith('template1.hbs');
		});

		it('should generate a file', async () => {
			const engine = new TemplateEngine(mockR2Bucket);
			await engine.initialize();
			const result = await engine.generateFile('template1', { name: 'World' });
			expect(result).toBe('Hello, World!');
		});

		it('should throw an error if template not found', async () => {
			const engine = new TemplateEngine();
			await expect(engine.generateFile('nonexistent', {})).rejects.toThrow(
				'Template not found: nonexistent'
			);
		});

		it('should generate multiple files', async () => {
			const engine = new TemplateEngine(mockR2Bucket);
			await engine.initialize();
			const requests = [
				{ templateId: 'template1', data: { name: 'World' }, filePath: 'hello.txt' },
				{ templateId: 'template2', data: { name: 'World' }, filePath: 'goodbye.txt' }
			];
			const results = await engine.generateFiles(requests);
			expect(results).toHaveLength(2);
			expect(results[0].success).toBe(true);
			expect(results[0].content).toBe('Hello, World!');
			expect(results[1].success).toBe(true);
			expect(results[1].content).toBe('Goodbye, World!');
			const fs = engine.getFileSystem();
			expect(fs['hello.txt']).toBe('Hello, World!');
			expect(fs['goodbye.txt']).toBe('Goodbye, World!');
		});

		it('should handle file generation errors', async () => {
			const engine = new TemplateEngine();
			const requests = [{ templateId: 'nonexistent', data: {}, filePath: 'error.txt' }];
			const results = await engine.generateFiles(requests);
			expect(results).toHaveLength(1);
			expect(results[0].success).toBe(false);
			expect(results[0].error).toBe('Template not found: nonexistent');
		});

		it('should use fallback templates', async () => {
			const engine = new TemplateEngine(mockR2Bucket);
			await engine.initialize();
			const result = await engine.getTemplate('devcontainer-node-json');
			expect(result).toBe(fallbackTemplates.devcontainerNodeJson);
		});
	});
});
