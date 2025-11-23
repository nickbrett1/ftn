import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { load } from '../../../../../src/routes/projects/ccbilling/new/+page.server.js';
import * as db from '$lib/server/ccbilling-db.js';
import * as requireUser from '$lib/server/require-user.js';

vi.mock('$lib/server/ccbilling-db.js', () => ({
	listBillingCycles: vi.fn()
}));

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

const mockEvent = {};
const today = new Date('2024-01-10T12:00:00.000Z');
const todayString = '2024-01-10';

describe('/projects/ccbilling/new/+page.server.js', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(today);
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.resetAllMocks();
	});

	it('redirects if user is not authenticated', async () => {
		requireUser.requireUser.mockResolvedValue(
			new Response(null, { status: 307, headers: { Location: '/notauthorised' } })
		);

		try {
			await load(mockEvent);
			expect.fail('The load function should have thrown a redirect.');
		} catch (error) {
			const redirectError = /** @type {any} */ (error);
			expect(redirectError.status).toBe(307);
			expect(redirectError.location).toBe('/notauthorised');
		}
	});

	it('defaults to today when no existing cycles', async () => {
		db.listBillingCycles.mockResolvedValue([]);
		const result = await load(mockEvent);
		expect(result).toEqual({ defaultStartDate: todayString, defaultEndDate: todayString });
	});

	it('calculates start date as day after most recent cycle', async () => {
		const cycles = [{ end_date: '2024-01-05T00:00:00.000Z' }];
		db.listBillingCycles.mockResolvedValue(cycles);
		const result = await load(mockEvent);
		expect(result).toEqual({ defaultStartDate: '2024-01-06', defaultEndDate: todayString });
	});

	it('defaults to today if most recent cycle ends in the future', async () => {
		const cycles = [{ end_date: '2024-01-15T00:00:00.000Z' }];
		db.listBillingCycles.mockResolvedValue(cycles);
		const result = await load(mockEvent);
		expect(result).toEqual({ defaultStartDate: todayString, defaultEndDate: todayString });
	});

	it('defaults to today if most recent cycle end date is null', async () => {
		const cycles = [{ end_date: null }];
		db.listBillingCycles.mockResolvedValue(cycles);
		const result = await load(mockEvent);
		expect(result).toEqual({ defaultStartDate: todayString, defaultEndDate: todayString });
	});

	it('defaults to today if most recent cycle end date is invalid', async () => {
		const cycles = [{ end_date: 'invalid-date' }];
		db.listBillingCycles.mockResolvedValue(cycles);
		const result = await load(mockEvent);
		expect(result).toEqual({ defaultStartDate: todayString, defaultEndDate: todayString });
	});
});
