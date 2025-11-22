import { GET } from '../../../../../../src/routes/projects/ccbilling/cycles/[id]/+server.js';
import { requireUser } from '$lib/server/require-user.js';
import { getBillingCycle } from '$lib/server/ccbilling-db.js';
import { vi, describe, it, expect } from 'vitest';

vi.mock('$lib/server/require-user.js');
vi.mock('$lib/server/ccbilling-db.js');

describe('GET /projects/ccbilling/cycles/[id]', () => {
	it('returns a 401 when the user is not authenticated', async () => {
		requireUser.mockResolvedValue(new Response(null, { status: 401 }));
		const event = { params: { id: '123' } };
		const response = await GET(event);
		expect(response.status).toBe(401);
	});

	it('returns a 404 when the billing cycle is not found', async () => {
		requireUser.mockResolvedValue({ user: { id: '1' } });
		getBillingCycle.mockResolvedValue(null);
		const event = { params: { id: '123' } };
		const response = await GET(event);
		expect(response.status).toBe(404);
		const json = await response.json();
		expect(json).toEqual({ error: 'Billing cycle not found' });
	});

	it('returns the billing cycle when found', async () => {
		const cycle = { id: '123', name: 'Test Cycle' };
		requireUser.mockResolvedValue({ user: { id: '1' } });
		getBillingCycle.mockResolvedValue(cycle);
		const event = { params: { id: '123' } };
		const response = await GET(event);
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json).toEqual(cycle);
	});
});