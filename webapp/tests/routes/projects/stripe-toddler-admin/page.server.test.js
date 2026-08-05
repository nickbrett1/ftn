import { describe, it, expect, vi } from 'vitest';
import { load } from '../../../../src/routes/projects/stripe-toddler-admin/+page.server.js';
import * as requireUser from '$lib/server/require-user.js';

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

describe('/projects/stripe-toddler-admin/+page.server.js load', () => {
	it('redirects to /notauthorised if user is not authenticated', async () => {
		requireUser.requireUser.mockResolvedValue(
			new Response(null, { status: 307, headers: { Location: '/notauthorised' } })
		);

		try {
			await load({ url: { pathname: '/projects/stripe-toddler-admin' } });
			expect.fail('The load function should have thrown a redirect.');
		} catch (error) {
			const redirectError = /** @type {any} */ (error);
			expect(redirectError.status).toBe(307);
			expect(redirectError.location).toBe(
				'/notauthorised?redirectTo=%2Fprojects%2Fstripe-toddler-admin'
			);
		}
	});

	it('returns workerUrl when user is authenticated', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => []
		});

		const result = await load({
			url: { pathname: '/projects/stripe-toddler-admin' },
			fetch: mockFetch
		});

		expect(result).toHaveProperty('workerUrl');
		expect(typeof result.workerUrl).toBe('string');
		expect(result).toHaveProperty('initialInventory');
		expect(result).toHaveProperty('initialTransactions');
	});
});
