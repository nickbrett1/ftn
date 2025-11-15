import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup, screen } from '@testing-library/svelte';

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

	it('regenerates preview when the project name changes', async () => {
		const selectedCapabilities = ['devcontainer-node'];

		globalThis.fetch
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						files: [
							{
								filePath: 'README.md',
								content: '# my-project',
								capabilityId: 'readme'
							}
						],
						externalServices: []
					})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						files: [
							{
								filePath: 'README.md',
								content: '# cool-app',
								capabilityId: 'readme'
							}
						],
						externalServices: []
					})
			});

		const { rerender } = render(PreviewMode, {
			projectName: 'my-project',
			repositoryUrl: '',
			selectedCapabilities,
			configuration: {}
		});

		await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.getByText('# my-project')).toBeTruthy());

		await rerender({
			projectName: 'cool-app',
			repositoryUrl: '',
			selectedCapabilities,
			configuration: {}
		});

		await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(screen.getByText('# cool-app')).toBeTruthy());
	});
});
