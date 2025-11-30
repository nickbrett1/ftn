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

		// Click root folder
		const rootFolder = screen.getByText('root');
		await fireEvent.click(rootFolder);

		// Subfolder should be visible
		// Using findByText to wait for DOM update
		const subFolder = await screen.findByText('subfolder');
		expect(subFolder).toBeTruthy();

		// In the buggy version, subfolder is rendered as a 'file' (button) but without folder logic.
		// So clicking it selects it, but doesn't expand it.
		await fireEvent.click(subFolder);

		// Expect 'deep.txt' to be visible
		// This should fail if the bug exists
		expect(screen.queryByText('deep.txt')).toBeTruthy();
	});
});
