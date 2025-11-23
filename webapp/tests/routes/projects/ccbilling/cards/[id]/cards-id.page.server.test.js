import { describe, it, expect, vi } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { load } from '../../../../../../src/routes/projects/ccbilling/cards/[id]/+page.server.js';

describe('/projects/ccbilling/cards/[id]/+page.server.js', () => {
	const mockEvent = {
		params: { id: '1' },
		fetch: vi.fn()
	};

	it('redirects if the fetch call is not ok', async () => {
		mockEvent.fetch.mockResolvedValue({ ok: false });

		try {
			await load(mockEvent);
			expect.fail('The load function should have thrown a redirect.');
		} catch (error) {
			const redirectError = /** @type {any} */ (error);
			expect(redirectError.status).toBe(302);
			expect(redirectError.location).toBe('/projects/ccbilling/cards');
		}
	});

	it('loads the card data successfully', async () => {
		const expectedCard = { id: 1, name: 'Chase Freedom' };
		mockEvent.fetch.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(expectedCard)
		});

		const result = await load(mockEvent);

		expect(mockEvent.fetch).toHaveBeenCalledWith('/projects/ccbilling/cards/1');
		expect(result).toEqual({ card: expectedCard });
	});
});
