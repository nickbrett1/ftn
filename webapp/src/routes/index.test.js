import { expect, describe, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { screen } from '@testing-library/dom';
import App from './+page.svelte';

/**
 * @vitest-environment jsdom
 */
describe('App', () => {
	it('renders the app', () => {
		render(App);

		expect(screen.getByText('British Empire Management'));
	});
});
