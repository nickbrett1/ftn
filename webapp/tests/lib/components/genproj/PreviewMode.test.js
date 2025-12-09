import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/svelte';
import PreviewMode from '$lib/components/genproj/PreviewMode.svelte';

// Mock scrollIntoView
globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('PreviewMode', () => {
    // Reset mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

		render(PreviewMode, {
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

		render(PreviewMode, {
			previewData,
			loading: false,
			error: null
		});

		const codeElement = document.querySelector('pre code');
		expect(codeElement).not.toBeNull();
		expect(codeElement.textContent).toBe('# Docs Readme');
	});

    it('scrolls the selected file into view when auto-selected', async () => {
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

        render(PreviewMode, {
            previewData,
            loading: false,
            error: null
        });

        // Find the "README.md" button in the file tree.
        // We look for the button that has "README.md" text.
        // There are multiple "README.md" texts, so we filter.
        const buttons = screen.getAllByRole('button');
        const readmeButton = buttons.find(b => b.textContent.includes('README.md') && b.dataset.path === 'README.md');

        expect(readmeButton).toBeTruthy();

        // Wait for potential async operations (like tick)
        await waitFor(() => {
            // We expect scrollIntoView to be called on the element.
            expect(globalThis.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
        }, { timeout: 1000 });
    });
});
