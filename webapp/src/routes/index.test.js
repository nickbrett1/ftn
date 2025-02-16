import { expect, describe, it, vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';

import { render } from '@testing-library/svelte';
import { screen } from '@testing-library/dom';
import App from './+page.svelte';

describe('App', () => {
	vi.stubGlobal('ResizeObserver', ResizeObserver);
	vi.mock('@tsparticles/engine');

	// Needed per https://github.com/testing-library/svelte-testing-library/issues/284
	Element.prototype.animate = () => ({ cancel: vi.fn(), finished: Promise.resolve() });

	it('renders the app', () => {
		render(App);

		expect(screen.getByText('Fintech Nick'));
	});
});
