import { expect, describe, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { screen } from '@testing-library/dom';
import Home from './+page.svelte';
import { load } from './+page.server.js';
import { redirect } from '@sveltejs/kit';

describe('Home', () => {
	it('renders', () => {
		render(Home);

		expect(screen.getByText('Galactic Unicorn'));
	});

	it('redirects to notauthorised if not logged in', async () => {
		expect.assertions(1);
		try {
			await load({ cookies: { get: () => null }, platform: {} });
		} catch (e) {
			let expected;
			try {
				redirect(307, '/notauthorised');
			} catch (redirect) {
				expected = redirect;
			}
			expect(e).toEqual(expected);
		}
	});

	it('allows access if in KV', () => {
		return load({
			cookies: { get: () => [0, '123'] },
			platform: {
				env: { KV: { get: () => '123' } }
			}
		}).then((data) => {
			expect(data).toEqual({});
		});
	});

	it('denies access if not in KV', async () => {
		expect.assertions(1);

		try {
			await load({
				cookies: { get: () => [0, '123'] },
				platform: {
					env: { KV: { get: () => null } }
				}
			});
		} catch (e) {
			let expected;
			try {
				redirect(307, '/notauthorised');
			} catch (redirect) {
				expected = redirect;
			}
			expect(e).toEqual(expected);
		}
	});
});
