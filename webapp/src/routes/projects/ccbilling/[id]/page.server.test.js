import { describe, it, expect, vi } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { load } from './+page.server.js';
import * as db from '$lib/server/ccbilling-db.js';
import * as requireUser from '$lib/server/require-user.js';

vi.mock('$lib/server/ccbilling-db.js', () => ({
	getBillingCycle: vi.fn(),
	listStatements: vi.fn(),
	listChargesForCycle: vi.fn(),
	listCreditCards: vi.fn(),
	listBudgets: vi.fn(),
	listBudgetMerchantMappings: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

const mockEvent = {
	params: { id: '1' },
	depends: vi.fn()
};

describe('/projects/ccbilling/[id]/+page.server.js', () => {
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

	it('redirects if billing cycle is not found', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
		db.getBillingCycle.mockResolvedValue(null);

		try {
			await load(mockEvent);
			expect.fail('The load function should have thrown a redirect.');
		} catch (error) {
			const redirectError = /** @type {any} */ (error);
			expect(redirectError.status).toBe(307);
			expect(redirectError.location).toBe('/projects/ccbilling');
		}
	});

	it('loads data successfully', async () => {
		const cycleId = 1;
		const expectedCycle = { id: cycleId, name: 'Cycle 1' };
		const expectedStatements = [{ id: 1, name: 'Statement 1' }];
		const expectedCharges = [{ id: 1, amount: 100 }];
		const expectedCreditCards = [{ id: 1, name: 'Card 1' }];
		const expectedBudgets = [{ id: 1, name: 'Budget 1' }];
		const expectedAutoAssociations = [{ id: 1, merchant: 'Amazon' }];

		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
		db.getBillingCycle.mockResolvedValue(expectedCycle);
		db.listStatements.mockResolvedValue(expectedStatements);
		db.listChargesForCycle.mockResolvedValue(expectedCharges);
		db.listCreditCards.mockResolvedValue(expectedCreditCards);
		db.listBudgets.mockResolvedValue(expectedBudgets);
		db.listBudgetMerchantMappings.mockResolvedValue(expectedAutoAssociations);

		const result = await load(mockEvent);

		expect(result).toEqual({
			cycleId,
			cycle: expectedCycle,
			statements: expectedStatements,
			charges: expectedCharges,
			creditCards: expectedCreditCards,
			budgets: expectedBudgets,
			autoAssociations: expectedAutoAssociations
		});
		expect(mockEvent.depends).toHaveBeenCalledWith(`cycle-${cycleId}`);
	});
});
