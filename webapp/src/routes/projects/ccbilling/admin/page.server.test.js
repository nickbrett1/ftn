import { describe, it, expect, vi } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { load } from './+page.server.js';
import * as requireUser from '$lib/server/require-user.js';

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

const mockEvent = {};

describe('/projects/ccbilling/admin/+page.server.js', () => {
	it('redirects if user is not authenticated', async () => {
		requireUser.requireUser.mockResolvedValue(new Response(null, { status: 307, headers: { Location: '/notauthorised' } }));

		try {
			await load(mockEvent);
			expect.fail('The load function should have thrown a redirect.');
		} catch (error) {
			const redirectError = /** @type {any} */ (error);
			expect(redirectError.status).toBe(307);
			expect(redirectError.location).toBe('/notauthorised');
		}
	});

	it('returns empty data if user is authenticated', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });

		const result = await load(mockEvent);

		expect(result).toEqual({});
	});
});
