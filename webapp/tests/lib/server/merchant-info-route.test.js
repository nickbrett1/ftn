import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const requireUserMock = vi.fn();
const getPaymentMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('$env/static/private', () => ({
	LLAMA_API_MODEL: 'unit-test-model'
}));

vi.mock('$lib/server/require-user.js', () => ({
	requireUser: (...arguments_) => requireUserMock(...arguments_)
}));

vi.mock('$lib/server/ccbilling-db.js', () => ({
	getPayment: (...arguments_) => getPaymentMock(...arguments_)
}));

describe('merchant info route', () => {
	beforeEach(() => {
		vi.resetModules();
		requireUserMock.mockReset();
		getPaymentMock.mockReset();
		fetchMock.mockReset();
		globalThis.fetch = fetchMock;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const loadModule = () =>
		import('../../../src/routes/projects/ccbilling/charges/[id]/merchant-info/+server.js');

	const buildEvent = (overrides = {}) => ({
		params: { id: '42', ...overrides.params },
		platform: overrides.platform ?? {
			env: { LLAMA_API_KEY: 'api-key-123', LLAMA_API_BASE_URL: 'https://llama.api' }
		},
		url: overrides.url ?? new URL('https://app.test/projects/ccbilling/charges/42/merchant-info'),
		request:
			overrides.request ??
			new Request('https://app.test/projects/ccbilling/charges/42/merchant-info')
	});

	it('returns enriched merchant information when llama responds successfully', async () => {
		const { GET } = await loadModule();
		requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
		getPaymentMock.mockResolvedValue({ merchant: 'ACME CORP' });

		const mockResponse = {
			choices: [
				{
					message: {
						content: 'ACME Corp ? online retail'
					}
				}
			]
		};
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockResponse)
		});

		const event = buildEvent();
		const response = await GET(event);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.merchant).toBe('ACME CORP');
		expect(body.text).toBe('ACME Corp ? online retail');
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const fetchArgs = fetchMock.mock.calls[0];
		expect(fetchArgs[0]).toBe('https://llama.api/chat/completions');
		const fetchOptions = fetchArgs[1];
		expect(fetchOptions.method).toBe('POST');
		expect(fetchOptions.headers['Authorization']).toBe('Bearer api-key-123');
	});

	it('returns a 501 response when the API key is missing', async () => {
		const { GET } = await loadModule();
		requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
		getPaymentMock.mockResolvedValue({ merchant: 'ACME CORP' });

		const event = buildEvent({ platform: { env: {} } });
		const response = await GET(event);

		expect(response.status).toBe(501);
		const body = await response.json();
		expect(body.error).toBe('LLAMA API not configured');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('returns the upstream response when authentication fails', async () => {
		const { GET } = await loadModule();
		const unauthorized = new Response('Unauthorized', { status: 401 });
		requireUserMock.mockResolvedValue(unauthorized);

		const event = buildEvent();
		const response = await GET(event);

		expect(response).toBe(unauthorized);
		expect(getPaymentMock).not.toHaveBeenCalled();
	});

	it('returns 404 when the charge cannot be found', async () => {
		const { GET } = await loadModule();
		requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
		getPaymentMock.mockResolvedValue(null);

		const event = buildEvent();
		const response = await GET(event);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.error).toBe('Charge not found');
	});

	it('validates charge id parameter', async () => {
		const { GET } = await loadModule();
		requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });

		const event = buildEvent({ params: { id: 'not-a-number' } });
		const response = await GET(event);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error).toBe('Invalid charge ID');
	});

	it('propagates llama client failures as 502 responses', async () => {
		const { GET } = await loadModule();
		requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
		getPaymentMock.mockResolvedValue({ merchant: 'ACME CORP' });
		fetchMock.mockRejectedValue(new Error('network down'));

		const event = buildEvent();
		const response = await GET(event);

		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.error).toBe('LLama API client error');
	});

	it('handles empty llama responses gracefully', async () => {
		const { GET } = await loadModule();
		requireUserMock.mockResolvedValue({ user: { id: 'user-1' } });
		getPaymentMock.mockResolvedValue({ merchant: 'ACME CORP' });

		const mockResponse = {
			choices: [
				{
					message: {
						content: '   '
					}
				}
			]
		};
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockResponse)
		});

		const event = buildEvent();
		const response = await GET(event);

		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.error).toBe('Empty response from model');
	});
});
