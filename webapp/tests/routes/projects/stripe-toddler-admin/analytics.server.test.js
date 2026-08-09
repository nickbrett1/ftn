import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../../src/routes/projects/stripe-toddler-admin/api/analytics/+server.js';
import * as requireUser from '$lib/server/require-user.js';

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: vi.fn()
}));

// CI injects real admin API keys via Doppler, which would shadow the test
// values set below and make the header assertions non-deterministic (and
// potentially leak a real key prefix in failure output). Sandbox every key
// the proxy reads and restore the originals after each test.
/* eslint-disable security/detect-object-injection -- env sandbox deliberately uses dynamic keys */
const ADMIN_ENV_KEYS = ['TODDLER_ADMIN_API_KEY', 'ADMIN_API_KEY', 'STRIPE_TODDLER_ADMIN_API_KEY'];

const originalAdminEnv = new Map();

beforeEach(() => {
	originalAdminEnv.clear();
	for (const key of ADMIN_ENV_KEYS) {
		originalAdminEnv.set(key, process.env[key]);
		delete process.env[key];
	}
});

afterEach(() => {
	for (const key of ADMIN_ENV_KEYS) {
		if (originalAdminEnv.get(key) === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = originalAdminEnv.get(key);
		}
	}
});

function makeEvent({ fetchImpl, searchParams = new URLSearchParams() } = {}) {
	return {
		url: { searchParams },
		fetch: fetchImpl || vi.fn(),
		platform: { env: {} }
	};
}

describe('/projects/stripe-toddler-admin/api/analytics/+server.js GET', () => {
	it('returns the not-authorised response when the user is not authenticated', async () => {
		const notAuthorised = new Response(null, { status: 401 });
		requireUser.requireUser.mockResolvedValue(notAuthorised);

		const event = makeEvent();
		const res = await GET(event);

		expect(res).toBe(notAuthorised);
		expect(event.fetch).not.toHaveBeenCalled();
	});

	it('proxies the worker analytics endpoint with the admin API key header', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
		process.env.STRIPE_TODDLER_ADMIN_API_KEY = 'test-admin-key-123';

		const transactions = [
			{
				transaction_id: '11111111-2222-3333-4444-555555555555',
				payment_intent_id: 'pi_123',
				amount_cents: 500,
				status: 'succeeded',
				created_at: 1700000000,
				items: [{ name: 'Red Fire Truck', quantity: 1, price_cents: 500 }]
			}
		];
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => transactions
		});

		const event = makeEvent({ fetchImpl, searchParams: new URLSearchParams('limit=25&offset=50') });
		const res = await GET(event);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(transactions);

		const [url, init] = fetchImpl.mock.calls[0];
		expect(url).toBe(
			'https://stripe-toddler.nick-brett1.workers.dev/api/admin/analytics?limit=25&offset=50'
		);
		expect(init.headers['X-Admin-API-Key']).toBe('test-admin-key-123');
	});

	it('defaults limit to 100 and offset to 0 when not provided', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
		const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });

		const event = makeEvent({ fetchImpl });
		await GET(event);

		const [url] = fetchImpl.mock.calls[0];
		expect(url).toBe(
			'https://stripe-toddler.nick-brett1.workers.dev/api/admin/analytics?limit=100&offset=0'
		);
	});

	it('relays the worker HTTP status when the worker responds with an error', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			statusText: 'Unauthorized'
		});

		const event = makeEvent({ fetchImpl });
		const res = await GET(event);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toBe('Worker returned HTTP 401');
	});

	it('returns 500 with the error message when the worker fetch fails', async () => {
		requireUser.requireUser.mockResolvedValue({ user: { id: 1 } });
		const fetchImpl = vi.fn().mockRejectedValue(new Error('Load failed'));

		const event = makeEvent({ fetchImpl });
		const res = await GET(event);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toBe('Load failed');
	});
});
