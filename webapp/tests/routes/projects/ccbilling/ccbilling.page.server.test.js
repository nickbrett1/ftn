import { describe, it, expect, vi } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { load } from '../../../../src/routes/projects/ccbilling/+page.server.js';
import * as db from '$lib/server/ccbilling-db.js';
import * as requireUser from '$lib/server/require-user.js';

vi.mock('$lib/server/ccbilling-db.js', () => ({
	listBillingCycles: vi.fn(),
	listBudgets: vi.fn(),
	listAllocationTotalsByCycle: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

describe('/projects/ccbilling/+page.server.js', () => {
	it('redirects if user is not authenticated', async () => {
		requireUser.requireUser.mockResolvedValue(
			new Response(null, { status: 307, headers: { Location: '/notauthorised' } })
		);

		// The `load` function throws a `Redirect` object, which is not a standard Error.
		// Using a try/catch block is a reliable way to test this.
		try {
			await load({});
			expect.fail('The load function should have thrown a redirect.');
		} catch (error) {
			// Now, we can assert the properties of the thrown redirect object.
			const redirectError = /** @type {any} */ (error);
			expect(redirectError.status).toBe(307);
			expect(redirectError.location).toBe('/notauthorised');
		}
	});

	it('loads data successfully', async () => {
		const expectedBillingCycles = [{ id: 1, name: 'Cycle 1' }];
		const expectedBudgets = [{ id: 1, name: 'Budget 1' }];
		const expectedAllocationTotals = [{ cycle_id: 1, total: 100 }];

		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
		db.listBillingCycles.mockResolvedValue(expectedBillingCycles);
		db.listBudgets.mockResolvedValue(expectedBudgets);
		db.listAllocationTotalsByCycle.mockResolvedValue(expectedAllocationTotals);

		const result = await load({});

		expect(result).toEqual({
			billingCycles: expectedBillingCycles,
			budgets: expectedBudgets,
			allocationTotals: expectedAllocationTotals
		});
	});
});