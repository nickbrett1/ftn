import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, GET, OPTIONS } from '../../../../../src/routes/api/mcp/+server.js';

// Mock agents/mcp
vi.mock('agents/mcp', () => {
	const handlerMock = vi.fn((request) => new Response('mock response', { status: 200 }));
	return {
		createMcpHandler: vi.fn((server, options) => {
			return handlerMock;
		})
	};
});

// Mock $lib/server/mcp.js
vi.mock('$lib/server/mcp.js', () => ({
	createMcpServer: vi.fn(() => ({ mockServer: true }))
}));

import { ApiKeyService } from '$lib/server/api-key-service.js';

let mockValidateKey;

// Mock ApiKeyService
vi.mock('$lib/server/api-key-service.js', () => {
	return {
		ApiKeyService: class {
			async validateKey(key) {
				return mockValidateKey(key);
			}
		}
	};
});

describe('/api/mcp API', () => {
	beforeEach(() => {
		mockValidateKey = vi.fn(async (key) => {
			if (key === 'valid-token') {
				return 'test@example.com';
			}
			return null;
		});
	});

	it('returns 401 if Authorization header is missing on POST', async () => {
		const request = new Request('http://localhost/api/mcp', {
			method: 'POST',
			body: JSON.stringify({})
		});

		const response = await POST({ request, platform: {} });
		expect(response.status).toBe(401);
	});

	it('returns 401 if Authorization header is missing on GET', async () => {
		const request = new Request('http://localhost/api/mcp', {
			method: 'GET'
		});

		const response = await GET({ request, platform: {} });
		expect(response.status).toBe(401);
	});

	it('returns 500 if ApiKeyService throws an error', async () => {
		mockValidateKey.mockRejectedValue(new Error('DB Error'));

		const request = new Request('http://localhost/api/mcp', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({})
		});

		const response = await POST({ request, platform: {} });
		expect(response.status).toBe(500);
	});

	it('returns 429 if ApiKeyService throws Rate limit exceeded', async () => {
		mockValidateKey.mockRejectedValue(new Error('Rate limit exceeded'));

		const request = new Request('http://localhost/api/mcp', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({})
		});

		const response = await POST({ request, platform: {} });
		expect(response.status).toBe(429);
	});

	it('returns 401 if Authorization header is invalid', async () => {
		const request = new Request('http://localhost/api/mcp', {
			method: 'POST',
			headers: { Authorization: 'Bearer invalid-token' },
			body: JSON.stringify({})
		});

		const response = await POST({ request, platform: {} });
		expect(response.status).toBe(401);
	});

	it('handles POST requests by calling mcp handler with valid token', async () => {
		const request = new Request('http://localhost/api/mcp', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({})
		});

		const response = await POST({ request, platform: {} });
		expect(response.status).toBe(200);

		const text = await response.text();
		expect(text).toBe('mock response');
	});

	it('handles GET requests via token query param', async () => {
		const request = new Request('http://localhost/api/mcp?token=valid-token', {
			method: 'GET'
		});

		const response = await GET({ request, platform: {} });
		expect(response.status).toBe(200);

		const text = await response.text();
		expect(text).toBe('mock response');
	});

	it('handles OPTIONS requests properly', async () => {
		const request = new Request('http://localhost/api/mcp', {
			method: 'OPTIONS',
			headers: { Origin: 'https://www.fintechnick.com' }
		});

		const response = await OPTIONS({ request });
		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://www.fintechnick.com');
	});
});
