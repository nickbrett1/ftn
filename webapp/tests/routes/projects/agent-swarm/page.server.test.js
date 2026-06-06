import { describe, it, expect, vi } from 'vitest';
import { load } from '../../../../src/routes/projects/agent-swarm/+page.server.js';
import * as requireUser from '$lib/server/require-user.js';

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

describe('/projects/agent-swarm/+page.server.js load', () => {
	it('redirects to /notauthorised if user is not authenticated', async () => {
		requireUser.requireUser.mockResolvedValue(
			new Response(null, { status: 307, headers: { Location: '/notauthorised' } })
		);

		try {
			await load({});
			expect.fail('The load function should have thrown a redirect.');
		} catch (error) {
			const redirectError = /** @type {any} */ (error);
			expect(redirectError.status).toBe(307);
			expect(redirectError.location).toBe('/notauthorised');
		}
	});

	it('returns empty object when user is authenticated', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });

		const result = await load({});

		expect(result).toEqual({});
	});
});
