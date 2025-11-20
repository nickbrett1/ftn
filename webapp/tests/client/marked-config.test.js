import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock marked and highlight.js BEFORE importing the module
vi.mock('marked', () => {
	const Renderer = vi.fn();
	Renderer.prototype.code = vi.fn();
	return {
		marked: {
			Renderer,
			setOptions: vi.fn()
		}
	};
});

vi.mock('highlight.js/lib/core', () => ({
	default: {
		registerLanguage: vi.fn(),
		getLanguage: vi.fn(),
		highlight: vi.fn()
	}
}));

vi.mock('highlight.js/lib/languages/sql', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/python', () => ({ default: {} }));
vi.mock('highlight.js/lib/languages/bash', () => ({ default: {} }));

describe('marked-config', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('should configure marked and highlight.js', async () => {
		await import('$lib/client/marked-config.js');
		
		const { marked } = await import('marked');
		const hljs = (await import('highlight.js/lib/core')).default;

		expect(hljs.registerLanguage).toHaveBeenCalledTimes(4); // sql, python, bash, sh
		expect(marked.setOptions).toHaveBeenCalled();
	});
});
