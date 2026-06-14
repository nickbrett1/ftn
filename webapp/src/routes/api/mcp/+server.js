import { createMcpHandler } from '@cloudflare/agents/mcp';
import { mcpServer } from '$lib/server/mcp.js';

const handler = createMcpHandler({
	server: mcpServer
});

/** @type {import('./$types').RequestHandler} */
export const POST = async ({ request }) => {
	return handler(request);
};
