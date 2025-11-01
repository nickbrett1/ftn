import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/svelte';

import PreviewMode from '../../src/lib/components/genproj/PreviewMode.svelte';

describe('PreviewMode component', () => {
	const capability = {
		id: 'devcontainer-node',
		name: 'Node.js DevContainer'
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		cleanup();
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					files: [],
					externalServices: []
				})
		});
	});

	afterEach(() => {
		cleanup();
	});

	it('regenerates preview when the project name changes', async () => {
		const selectedCapabilities = ['devcontainer-node'];

		const { rerender } = render(PreviewMode, {
			projectName: '',
			repositoryUrl: '',
			selectedCapabilities,
			configuration: {},
			capabilities: [capability]
		});

		await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

		const initialCall = globalThis.fetch.mock.calls.at(-1);
		expect(initialCall?.[0]).toBe('/projects/genproj/api/preview');
		expect(initialCall?.[1]).toMatchObject({
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});
		expect(JSON.parse(initialCall?.[1]?.body ?? '{}')).toMatchObject({
			projectName: 'my-project',
			repositoryUrl: '',
			selectedCapabilities,
			configuration: {}
		});

		globalThis.fetch.mockClear();

		await rerender({
			projectName: 'cool-app',
			repositoryUrl: '',
			selectedCapabilities,
			configuration: {},
			capabilities: [capability]
		});

		await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));

		const nextCall = globalThis.fetch.mock.calls.at(-1);
		expect(JSON.parse(nextCall?.[1]?.body ?? '{}')).toMatchObject({
			projectName: 'cool-app'
		});
	});
});
