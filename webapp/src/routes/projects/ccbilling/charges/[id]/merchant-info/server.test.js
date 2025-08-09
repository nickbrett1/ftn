import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server.js';

// Mock DB and auth
vi.mock('$lib/server/ccbilling-db.js', () => ({ getPayment: vi.fn() }));
vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, opts) => new Response(JSON.stringify(data), opts))
}));

// Expose a controllable create() fn for the llama client mock
// eslint-disable-next-line no-underscore-dangle
globalThis.__llamaCreateMock = vi.fn();

// Mock llama-api-client default export
vi.mock('llama-api-client', () => {
	const Default = vi.fn().mockImplementation(() => ({
		chat: { completions: { create: (...args) => globalThis.__llamaCreateMock(...args) } }
	}));
	return { default: Default };
});

import { getPayment } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/charges/[id]/merchant-info API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		// eslint-disable-next-line no-underscore-dangle
		globalThis.__llamaCreateMock = vi.fn();

		mockEvent = {
			params: { id: '1' },
			platform: { env: { LLAMA_API_KEY: 'test_key', LLAMA_API_MODEL: 'llama3.1-8b-instruct' } }
		};

		// Auth ok by default
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });

		// Charge found by default
		getPayment.mockResolvedValue({ id: 1, merchant: 'AMZN Mktp US*AB12C' });
	});

	it('returns model text on success', async () => {
		const modelResponse = {
			choices: [
				{
					message: {
						content:
							'{"canonical_name":"Amazon","website":"https://www.amazon.com","address":"Seattle, WA","description":"Online retailer","confidence":0.93,"sources":["https://www.amazon.com","https://en.wikipedia.org/wiki/Amazon_(company)"]}'
					}
				}
			]
		};
		// eslint-disable-next-line no-underscore-dangle
		globalThis.__llamaCreateMock.mockResolvedValue(modelResponse);

		const response = await GET(mockEvent);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.merchant).toBe('AMZN Mktp US*AB12C');
		expect(typeof body.text).toBe('string');
		expect(body.text).toContain('Amazon');
		// Ensure llama client was called with our prompt
		// eslint-disable-next-line no-underscore-dangle
		expect(globalThis.__llamaCreateMock).toHaveBeenCalledTimes(1);
	});

	it('returns 501 if LLAMA_API_KEY missing', async () => {
		mockEvent.platform.env = {};
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(501);
		expect(body.error).toContain('LLAMA API not configured');
	});

	it('returns 400 for invalid charge ID', async () => {
		mockEvent.params.id = 'abc';
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(400);
		expect(body.error).toBe('Invalid charge ID');
	});

	it('returns 404 when charge not found', async () => {
		getPayment.mockResolvedValue(null);
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(404);
		expect(body.error).toBe('Charge not found');
	});

	it('returns 200 with raw text when model output is not JSON', async () => {
		// eslint-disable-next-line no-underscore-dangle
		globalThis.__llamaCreateMock.mockResolvedValue({
			choices: [{ message: { content: 'not json' } }]
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('not json');
	});

	it('returns 502 when llama client throws', async () => {
		// eslint-disable-next-line no-underscore-dangle
		globalThis.__llamaCreateMock.mockRejectedValue(new Error('network'));
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(502);
		expect(body.error).toBe('LLama API client error');
	});

	it('short-circuits if user not authenticated', async () => {
		requireUser.mockResolvedValue(new Response('', { status: 302 }));
		const response = await GET(mockEvent);
		expect(response).toBeInstanceOf(Response);
		// Should not call downstream services
		expect(getPayment).not.toHaveBeenCalled();
	});
});
