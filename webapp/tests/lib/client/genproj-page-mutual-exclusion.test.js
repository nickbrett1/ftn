// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/svelte';
import GenprojPage from '../../../src/routes/projects/genproj/+page.svelte';
import { capabilities } from '$lib/config/capabilities.js';

// Use the real capability catalog so the test stays faithful to production data.
const deploymentCapabilities = capabilities.filter((c) =>
	['docker', 'cloudflare-wrangler', 'google-cloud', 'docker-container'].includes(c.id)
);

// Checkbox ids rendered by CapabilitySelector for the deployment capabilities.
const DOCKER_CHECKBOX = '#capability-docker-container';
const CLOUDFLARE_CHECKBOX = '#capability-cloudflare-wrangler';
const GOOGLE_CHECKBOX = '#capability-google-cloud';

function pageProps(selectedCapabilities = []) {
	return {
		data: {
			isAuthenticated: false,
			capabilities: deploymentCapabilities,
			selectedCapabilities,
			projectName: '',
			repositoryUrl: '',
			configuration: {},
			error: null,
			authResult: null
		}
	};
}

describe('Genproj page — deployment mutual exclusion', () => {
	beforeEach(() => {
		cleanup();
	});

	afterEach(() => {
		cleanup();
	});

	it('selecting docker-container unchecks cloudflare-wrangler', async () => {
		const { container } = render(GenprojPage, { props: pageProps(['cloudflare-wrangler']) });

		await waitFor(() => expect(container.querySelector(DOCKER_CHECKBOX)).toBeTruthy());

		const cloudflareCheckbox = container.querySelector(CLOUDFLARE_CHECKBOX);
		const dockerCheckbox = container.querySelector(DOCKER_CHECKBOX);

		expect(cloudflareCheckbox.checked).toBe(true);

		await fireEvent.click(dockerCheckbox);

		expect(dockerCheckbox.checked).toBe(true);
		expect(cloudflareCheckbox.checked).toBe(false);
	});

	it('selecting docker-container unchecks google-cloud', async () => {
		const { container } = render(GenprojPage, { props: pageProps(['google-cloud']) });

		await waitFor(() => expect(container.querySelector(DOCKER_CHECKBOX)).toBeTruthy());

		const googleCheckbox = container.querySelector(GOOGLE_CHECKBOX);
		const dockerCheckbox = container.querySelector(DOCKER_CHECKBOX);

		await fireEvent.click(dockerCheckbox);

		expect(dockerCheckbox.checked).toBe(true);
		expect(googleCheckbox.checked).toBe(false);
	});

	it('selecting cloudflare-wrangler unchecks docker-container (symmetric)', async () => {
		const { container } = render(GenprojPage, { props: pageProps(['docker-container']) });

		await waitFor(() => expect(container.querySelector(CLOUDFLARE_CHECKBOX)).toBeTruthy());

		const cloudflareCheckbox = container.querySelector(CLOUDFLARE_CHECKBOX);
		const dockerCheckbox = container.querySelector(DOCKER_CHECKBOX);

		expect(dockerCheckbox.checked).toBe(true);

		await fireEvent.click(cloudflareCheckbox);

		expect(cloudflareCheckbox.checked).toBe(true);
		expect(dockerCheckbox.checked).toBe(false);
	});
});
