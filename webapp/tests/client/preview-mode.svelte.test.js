import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup, screen, fireEvent } from '@testing-library/svelte';

import PreviewMode from '../../src/lib/components/genproj/PreviewMode.svelte';

vi.mock('$app/environment', () => ({
	browser: true,
	dev: false
}));

describe('PreviewMode component', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		cleanup();
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		cleanup();
	});

	it('renders a file tree and shows file content on click', async () => {
		const selectedCapabilities = ['devcontainer-node'];

		const previewData1 = {
			files: [
				{
					name: 'README.md',
					path: 'README.md',
					content: '# my-project',
					size: 12
				}
			],
			externalServices: []
		};

		const previewData2 = {
			files: [
				{
					name: 'README.md',
					path: 'README.md',
					content: '# cool-app',
					size: 10
				}
			],
			externalServices: []
		};

		const { rerender } = render(PreviewMode, {
			previewData: previewData1,
			loading: false,
			error: null
		});

		await waitFor(() => expect(screen.getByText('README.md')).toBeTruthy());

		const fileNode = screen.getByText('README.md');
		await fireEvent.click(fileNode);

		await waitFor(() => expect(screen.getByText('# my-project')).toBeTruthy());

		await rerender({
			previewData: previewData2,
			loading: false,
			error: null
		});

		await waitFor(() => expect(screen.getByText('README.md')).toBeTruthy());

		const updatedFileNode = screen.getByText('README.md');
		await fireEvent.click(updatedFileNode);

		await waitFor(() => expect(screen.getByText('# cool-app')).toBeTruthy());
	});
});
