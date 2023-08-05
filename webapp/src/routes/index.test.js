import { expect, describe, it, vi } from 'vitest';
import ResizeObserver from 'resize-observer-polyfill';

import { render } from '@testing-library/svelte';
import { screen } from '@testing-library/dom';
import App from './+page.svelte';

/**
 * @vitest-environment jsdom
 */
describe('App', () => {
	vi.stubGlobal('ResizeObserver', ResizeObserver);

	it('renders the app', () => {
		render(App);

		expect(screen.getByText('Fintech Nick'));
	});
});
