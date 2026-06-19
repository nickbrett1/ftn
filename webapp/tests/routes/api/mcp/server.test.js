import { describe, it, expect, vi } from 'vitest';
import { POST } from '../../../../../src/routes/api/mcp/+server.js';

// Mock agents/mcp
vi.mock('agents/mcp', () => {
	const handlerMock = vi.fn((request) => new Response('mock response', { status: 200 }));
	return {
		createMcpHandler: vi.fn(() => handlerMock)
	};
});

// Mock $lib/server/mcp.js
vi.mock('$lib/server/mcp.js', () => ({
	mcpServer: { mockServer: true }
}));

import { ApiKeyService } from '$lib/server/api-key-service.js';

// Mock ApiKeyService
vi.mock('$lib/server/api-key-service.js', () => {
	return {
		ApiKeyService: class {
			async validateKey(key) {
				if (key === 'valid-token') {
					return 'test@example.com';
				}
				return null;
			}
		}
	};
});

describe('/api/mcp API', () => {
	it('returns 401 if Authorization header is missing', async () => {
		const request = new Request('http://localhost/api/mcp', {
			method: 'POST',
			body: JSON.stringify({})
		});

		const response = await POST({ request, platform: {} });
		expect(response.status).toBe(401);
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
});
