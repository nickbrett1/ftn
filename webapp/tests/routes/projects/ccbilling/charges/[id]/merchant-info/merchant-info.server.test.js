import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../../../../../src/routes/projects/ccbilling/charges/[id]/merchant-info/+server.js';

// Mock DB and auth
vi.mock('$lib/server/ccbilling-db.js', () => ({ getPayment: vi.fn() }));
vi.mock('$lib/server/require-user.js', () => ({ requireUser: vi.fn() }));
vi.mock('@sveltejs/kit', () => ({
	json: vi.fn((data, options) => {
		const response = Response.json(data, {
			status: options?.status || 200,
			...options
		});
		response.json = vi.fn().mockResolvedValue(data);
		return response;
	})
}));

const fetchMock = vi.fn();

import { getPayment } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

describe('/projects/ccbilling/charges/[id]/merchant-info API', () => {
	let mockEvent;

	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock.mockReset();
		globalThis.fetch = fetchMock;

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

		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(modelResponse)
		});

		const response = await GET(mockEvent);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.merchant).toBe('AMZN Mktp US*AB12C');
		expect(typeof body.text).toBe('string');
		expect(body.text).toContain('Amazon');

		expect(fetchMock).toHaveBeenCalledTimes(1);
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
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				choices: [{ message: { content: 'not json' } }]
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('not json');
	});

	it('returns 502 when llama client throws', async () => {
		fetchMock.mockRejectedValue(new Error('network'));
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

describe('fallback methods', () => {
	let mockEvent;
	beforeEach(() => {
		mockEvent = {
			params: { id: '1' },
			platform: { env: { LLAMA_API_KEY: 'test_key', LLAMA_API_MODEL: 'llama3.1-8b-instruct' } }
		};
		requireUser.mockResolvedValue({ user: { email: 'test@example.com' } });
		getPayment.mockResolvedValue({ id: 1, merchant: 'AMZN' });
		fetchMock.mockReset();
		globalThis.fetch = fetchMock;
	});

	it('extracts from choices array of parts', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				choices: [{ message: { content: [{ text: 'part1 ' }, { text: 'part2' }] } }]
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('part1 \npart2');
	});

	it('extracts from root message directly', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				message: { content: 'root message' }
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('root message');
	});

	it('extracts from root message object', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				message: { content: { text: 'root message object' } }
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('root message object');
	});

	it('extracts from completion_message', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				completion_message: 'completion'
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('completion');
	});

	it('extracts from completion_message object', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				completion_message: { content: 'completion obj' }
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('completion obj');
	});

	it('extracts from direct content', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				content: 'direct text'
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('direct text');
	});

	it('extracts from direct output_text', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				output_text: 'direct output_text'
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('direct output_text');
	});

	it('extracts from completion_message.content.text', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				completion_message: { content: { text: 'nested completion text' } }
			})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.text).toBe('nested completion text');
	});

	it('returns empty text and 502 for unparseable response', async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({})
		});
		const response = await GET(mockEvent);
		const body = await response.json();
		expect(response.status).toBe(502);
		expect(body.error).toBe('Empty response from model');
	});
});
