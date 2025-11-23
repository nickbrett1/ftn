import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import PreviewMode from '$lib/components/genproj/PreviewMode.svelte';
import * as svelte from 'svelte';

// Mock svelte-awesome-icons
vi.mock('svelte-awesome-icons', () => ({
	Icon: vi.fn()
}));

describe('PreviewMode File Count', () => {
	it('should correctly count files including those in nested folders', () => {
		const previewData = {
			files: [
				{
					path: 'README.md',
					name: 'README.md',
					type: 'file',
					size: 100,
					content: 'test'
				},
				{
					path: '.devcontainer',
					name: '.devcontainer',
					type: 'folder',
					children: [
						{
							path: '.devcontainer/devcontainer.json',
							name: 'devcontainer.json',
							type: 'file',
							size: 200,
							content: '{}'
						},
						{
							path: '.devcontainer/Dockerfile',
							name: 'Dockerfile',
							type: 'file',
							size: 300,
							content: 'FROM node'
						}
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

		// The fileTree.length is 2 (1 file + 1 folder)
		// But the total files should be 3 (README.md, devcontainer.json, Dockerfile)
		// The bug report says "it says that 2 files will be created but there is a list of 6 files shown."
		// In our case, it should show "2 files will be created" (incorrect) but we want "3 files will be created"

		// Check what is actually rendered
		const fileCountElement = screen.getByText(/files will be created/);
		expect(fileCountElement.textContent).toContain('3 files will be created');
	});
});
