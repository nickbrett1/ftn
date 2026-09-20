// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/svelte';

// Capture the redirect the page builds for generation, so we can assert exactly
// what `configuration` travels in the `?config=` parameter.
vi.mock('$lib/client/github-auth.js', () => ({
	initiateGitHubAuth: vi.fn()
}));

import GenprojPage from '../../../src/routes/projects/genproj/+page.svelte';
import { initiateGitHubAuth } from '$lib/client/github-auth.js';
import { capabilities } from '$lib/config/capabilities.js';

const configurationSchema = {
	type: 'object',
	properties: {
		language: { type: 'string', enum: ['python', 'node', 'java', 'rust'] }
	}
};

// Real catalog objects, so the selector renders faithfully.
const devcontainerCapabilities = capabilities.filter((c) => c.id.startsWith('devcontainer-'));

function props(configuration, selectedCapabilities = ['devcontainer-python']) {
	return {
		data: {
			isAuthenticated: true,
			capabilities: devcontainerCapabilities,
			selectedCapabilities,
			projectName: 'my-app',
			repositoryUrl: '',
			configuration,
			configurationSchema,
			error: null,
			authResult: null
		}
	};
}

/** Run the page's generate redirect and return the parsed `config` param. */
async function redirectConfig(container) {
	await fireEvent.click(container.querySelector('[data-testid="generate-button"]'));
	await waitFor(() => expect(initiateGitHubAuth).toHaveBeenCalled());
	const url = new URL(initiateGitHubAuth.mock.calls.at(-1)[0]);
	const config = url.searchParams.get('config');
	return config ? JSON.parse(atob(config)) : null;
}

describe('Genproj page — project-level configuration', () => {
	beforeEach(() => {
		initiateGitHubAuth.mockClear();
	});
	afterEach(() => cleanup());

	it('carries an explicitly declared language into the generate configuration', async () => {
		const { container } = render(GenprojPage, { props: props({ language: 'python' }) });

		const select = await waitFor(() => {
			const el = container.querySelector('#project-language');
			expect(el).toBeTruthy();
			return el;
		});
		expect(select.value).toBe('python');

		const config = await redirectConfig(container);
		expect(config?.language).toBe('python');
	});

	it('drops a field cleared back to its placeholder, so the POST omits it', async () => {
		const { container } = render(GenprojPage, { props: props({ language: 'python' }) });

		const select = await waitFor(() => container.querySelector('#project-language'));
		await fireEvent.change(select, { target: { value: '' } });

		// A cleared field is "no explicit choice": the key is removed, so the
		// language stays implied rather than being declared as a blank string.
		const config = await redirectConfig(container);
		expect(config?.language).toBeUndefined();
	});

	it('shows the implied language but does not declare it', async () => {
		const { container } = render(GenprojPage, { props: props({}) });

		const select = await waitFor(() => container.querySelector('#project-language'));
		expect(select.value).toBe('python');

		// Untouched: nothing is written back, so no language is declared.
		const config = await redirectConfig(container);
		expect(config?.language).toBeUndefined();
	});
});
