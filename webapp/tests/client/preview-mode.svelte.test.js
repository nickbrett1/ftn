import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor, cleanup, screen, fireEvent } from '@testing-library/svelte';
import PreviewMode from '../../src/lib/components/genproj/PreviewMode.svelte';

// Mock the browser environment
vi.mock('$app/environment', () => ({
	browser: true,
	dev: false
}));

describe('PreviewMode component', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders the "No Preview Available" message when previewData is null', () => {
		render(PreviewMode, {
			previewData: null,
			loading: false,
			error: null
		});

		expect(screen.getByText('No Preview Available')).toBeTruthy();
		expect(
			screen.getByText('Please configure your project and capabilities to see a preview.')
		).toBeTruthy();
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

		// Get the file node and click it
		const fileNode = screen.getByText('README.md');
		await fireEvent.click(fileNode);

		// Wait for the content of the file to be visible
		await waitFor(() => expect(screen.getByText('# my-project')).toBeTruthy());
	});

		await rerender({
			previewData: previewData2,
			loading: false,
			error: null
		});
		expect(screen.getByText('Generating preview...')).toBeTruthy();
	});

		await waitFor(() => expect(screen.getByText('README.md')).toBeTruthy());

		const updatedFileNode = screen.getByText('README.md');
		await fireEvent.click(updatedFileNode);

		await waitFor(() => expect(screen.getByText('# cool-app')).toBeTruthy());
	});
});
