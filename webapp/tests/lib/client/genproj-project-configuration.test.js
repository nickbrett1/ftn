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

	it('leaves the language optional on the implied placeholder with no devcontainer', async () => {
		const { container } = render(GenprojPage, { props: props({}, []) });

		const select = await waitFor(() => container.querySelector('#project-language'));
		// 0 devcontainers: optional, nothing implied, no required marker.
		expect(select.value).toBe('');
		expect(select.textContent).toContain('— implied —');
		expect(container.querySelector('[data-testid="project-config-required"]')).toBeNull();
	});

	it('pre-selects the implied language when a devcontainer is selected after first render', async () => {
		const { container } = render(GenprojPage, { props: props({}, []) });

		// Nothing is implied on first render.
		const select = await waitFor(() => container.querySelector('#project-language'));
		expect(select.value).toBe('');

		// The common user path: the devcontainer is chosen *after* the block has
		// rendered (a card click), not passed in at mount. The select must
		// re-apply its value from the new selection, or it stays on the
		// placeholder. Regression test for the untracked `projectValue(...)` call.
		const checkbox = await waitFor(() =>
			container.querySelector('#capability-devcontainer-python')
		);
		await fireEvent.click(checkbox);

		await waitFor(() => expect(container.querySelector('#project-language').value).toBe('python'));
		// Still one devcontainer: optional, so no required marker and generation
		// is not gated on the language.
		expect(container.querySelector('[data-testid="project-config-required"]')).toBeNull();
		expect(container.querySelector('[data-testid="generate-button"]').disabled).toBe(false);
	});

	it('requires a declared language once a second devcontainer is selected interactively', async () => {
		const { container } = render(GenprojPage, { props: props({}, []) });

		const select = await waitFor(() => container.querySelector('#project-language'));
		const generateButton = container.querySelector('[data-testid="generate-button"]');

		// One devcontainer after mount: implied, still optional.
		await fireEvent.click(
			await waitFor(() => container.querySelector('#capability-devcontainer-python'))
		);
		await waitFor(() => expect(select.value).toBe('python'));
		expect(generateButton.disabled).toBe(false);

		// A second devcontainer language makes the implication ambiguous, so the
		// field becomes required and generation is blocked on a choice.
		await fireEvent.click(container.querySelector('#capability-devcontainer-rust'));
		await waitFor(() =>
			expect(container.querySelector('[data-testid="project-config-required"]')).toBeTruthy()
		);
		expect(container.querySelector('#project-language').value).toBe('');
		await waitFor(() => expect(generateButton.disabled).toBe(true));

		// A declared value wins over the implication and unblocks generation.
		await fireEvent.change(container.querySelector('#project-language'), {
			target: { value: 'rust' }
		});
		await waitFor(() => expect(generateButton.disabled).toBe(false));
		expect(container.querySelector('#project-language').value).toBe('rust');
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
