// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/svelte';

// Capture the redirect the page builds for generation, so we can assert
// exactly when the `private` flag travels toward genproj.
vi.mock('$lib/client/github-auth.js', () => ({
	initiateGitHubAuth: vi.fn()
}));

import GenprojPage from '../../../src/routes/projects/genproj/+page.svelte';
import { initiateGitHubAuth } from '$lib/client/github-auth.js';
import { capabilities } from '$lib/config/capabilities.js';

const devcontainerCapabilities = capabilities.filter((c) => c.id.startsWith('devcontainer-'));

function props({ repositoryUrl = '', isPrivate = false } = {}) {
	return {
		data: {
			isAuthenticated: true,
			capabilities: devcontainerCapabilities,
			selectedCapabilities: ['devcontainer-python'],
			projectName: 'my-app',
			repositoryUrl,
			isPrivate,
			configuration: {},
			configurationSchema: null,
			error: null,
			authResult: null
		}
	};
}

/** Run the page's generate redirect and return the built URL. */
async function redirectUrl(container) {
	await fireEvent.click(container.querySelector('[data-testid="generate-button"]'));
	await waitFor(() => expect(initiateGitHubAuth).toHaveBeenCalled());
	return new URL(initiateGitHubAuth.mock.calls.at(-1)[0]);
}

async function privateInput(container) {
	return waitFor(() => {
		const el = container.querySelector('[data-testid="private-repository-input"]');
		expect(el).toBeTruthy();
		return el;
	});
}

describe('Genproj page — private repository choice', () => {
	beforeEach(() => {
		initiateGitHubAuth.mockClear();
	});
	afterEach(() => cleanup());

	it('offers the choice unchecked, so a new repository stays public by default', async () => {
		const { container } = render(GenprojPage, { props: props() });

		expect((await privateInput(container)).checked).toBe(false);

		const url = await redirectUrl(container);
		expect(url.searchParams.get('private')).toBeNull();
	});

	it('carries the choice into the generate redirect when checked', async () => {
		const { container } = render(GenprojPage, { props: props() });

		const checkbox = await privateInput(container);
		await fireEvent.click(checkbox);

		const url = await redirectUrl(container);
		expect(url.searchParams.get('private')).toBe('true');
	});

	it('restores a previously chosen private flag from the URL', async () => {
		const { container } = render(GenprojPage, { props: props({ isPrivate: true }) });

		expect((await privateInput(container)).checked).toBe(true);
	});

	it('disables the choice and omits it when an existing repository is named', async () => {
		const { container } = render(GenprojPage, {
			props: props({ repositoryUrl: 'https://github.com/user/existing' })
		});

		const checkbox = await privateInput(container);
		expect(checkbox.disabled).toBe(true);

		// A disabled control cannot be toggled, so visibility is left to the
		// repository itself and the flag never reaches genproj.
		await fireEvent.click(checkbox);
		const url = await redirectUrl(container);
		expect(url.searchParams.get('private')).toBeNull();
	});
});
