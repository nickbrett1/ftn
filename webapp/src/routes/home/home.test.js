import { expect, describe, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { screen } from '@testing-library/dom';
import Home from './+page.svelte';
import { load } from './+page.server.js';
import { redirect } from '@sveltejs/kit';

describe('Home', () => {
	it('renders', () => {
		render(Home);

		expect(screen.getByText('British Empire Management'));
	});

	it('redirects to preview if not logged in', async () => {
		expect.assertions(1);
		try {
			await load({ cookies: { get: () => null }, platform: {} });
		} catch (e) {
			expect(e).toEqual(redirect(307, '/preview'));
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
			expect(e).toEqual(redirect(307, '/preview'));
		}
	});
});
