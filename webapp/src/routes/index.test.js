import { expect, describe, it, vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';

import { mount, unmount, flushSync } from 'svelte';
import App from './+page.svelte';

describe('App', () => {
	vi.stubGlobal('ResizeObserver', ResizeObserver);
	vi.mock('@tsparticles/engine');

	// Needed per https://github.com/testing-library/svelte-testing-library/issues/284
	Element.prototype.animate = () => ({ cancel: vi.fn(), finished: Promise.resolve() });

	it('renders the app', () => {
		const component = mount(App, {
			target: document.body
		});

		flushSync();

		expect(document.body.textContent).toContain('Fintech Nick');

		unmount(component);
	});
});
