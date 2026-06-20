/** @type {import('./$types').RequestHandler} */
export const POST = async ({ request }) => {
	const { createMcpHandler } = await import('agents/mcp');
	const { mcpServer } = await import('$lib/server/mcp.js');

	const handler = createMcpHandler({
		server: mcpServer
	});

	return handler(request);
};
