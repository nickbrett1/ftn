import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import PreviewMode from '$lib/components/genproj/PreviewMode.svelte';

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('PreviewMode', () => {
	it('selects README.md by default if present', async () => {
		const previewData = {
			files: [
				{
					name: 'src',
					path: 'src',
					type: 'folder',
					children: [
						{ name: 'index.js', path: 'src/index.js', type: 'file', content: 'console.log("hi")' }
					]
				},
				{ name: 'README.md', path: 'README.md', type: 'file', content: '# Readme' },
				{ name: 'package.json', path: 'package.json', type: 'file', content: '{}' }
			],
			externalServices: []
		};

		const { component } = render(PreviewMode, {
			previewData,
			loading: false,
			error: null
		});

		const codeElement = document.querySelector('pre code');
		expect(codeElement).not.toBeNull();
		expect(codeElement.textContent).toBe('# Readme');
	});

	it('does not crash if README.md is missing', async () => {
		const previewData = {
			files: [{ name: 'package.json', path: 'package.json', type: 'file', content: '{}' }],
			externalServices: []
		};

		const { container } = render(PreviewMode, {
			previewData,
			loading: false,
			error: null
		});

		// Should show "Select a file to preview its content"
		expect(container.textContent).toContain('Select a file to preview its content');
	});

	it('selects README.md inside a folder if it is the only README', async () => {
		const previewData = {
			files: [
				{
					name: 'docs',
					path: 'docs',
					type: 'folder',
					children: [
						{ name: 'README.md', path: 'docs/README.md', type: 'file', content: '# Docs Readme' }
					]
				}
			],
			externalServices: []
		};

		const { component } = render(PreviewMode, {
			previewData,
			loading: false,
			error: null
		});

		const codeElement = document.querySelector('pre code');
		expect(codeElement).not.toBeNull();
		expect(codeElement.textContent).toBe('# Docs Readme');
	});
});
