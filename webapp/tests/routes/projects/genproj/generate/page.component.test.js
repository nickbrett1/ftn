import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Page from '../../../../../src/routes/projects/genproj/generate/+page.svelte';

// Mock child components for Svelte 5 (functions)
vi.mock('$lib/components/Header.svelte', () => ({
	default: vi.fn()
}));

vi.mock('$lib/components/Footer.svelte', () => ({
	default: vi.fn()
}));

// Mock navigation
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Mock logging
vi.mock('$lib/utils/logging.js', () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn()
	}
}));

describe('Generate Page File Tree', () => {
	const nestedData = {
		projectName: 'test-project',
		repositoryUrl: '',
		selected: 'core',
		previewData: {
			files: [
				{
					type: 'folder',
					name: 'root',
					path: '/root',
					size: 0,
					children: [
						{
							type: 'folder',
							name: 'subfolder',
							path: '/root/subfolder',
							size: 0,
							children: [
								{
									type: 'file',
									name: 'deep.txt',
									path: '/root/subfolder/deep.txt',
									size: 10
								}
							]
						}
					]
				}
			]
		}
	};

	it('should allow expanding nested folders', async () => {
		render(Page, { data: nestedData });

		// Check that everything is expanded by default
		expect(screen.getByText('root')).toBeTruthy();
		expect(screen.getByText('subfolder')).toBeTruthy();
		expect(screen.getByText('deep.txt')).toBeTruthy();

		// Toggle to collapse root
		const rootFolder = screen.getByText('root');
		await fireEvent.click(rootFolder);

		// Subfolder should be hidden
		expect(screen.queryByText('subfolder')).toBeNull();
		expect(screen.queryByText('deep.txt')).toBeNull();

		// Expand root again
		await fireEvent.click(rootFolder);
		expect(screen.getByText('subfolder')).toBeTruthy();

		// Subfolder should still be expanded because we didn't collapse it, only its parent hidden it?
		// Or does the state persist? The state is in `expandedFolders`.
		// When we collapse root, we just hide children. We don't remove subfolder from set.
		// So expanding root should show subfolder AND deep.txt.
		expect(screen.getByText('deep.txt')).toBeTruthy();
	});
});
