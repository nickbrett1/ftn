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

describe('/api/mcp API', () => {
	it('handles POST requests by calling mcp handler', async () => {
		const request = new Request('http://localhost/api/mcp', { method: 'POST', body: JSON.stringify({}) });

		const response = await POST({ request });
		expect(response.status).toBe(200);

        const text = await response.text();
        expect(text).toBe('mock response');
	});
});
