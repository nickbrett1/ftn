import { json } from '@sveltejs/kit';
import { ApiKeyService } from '$lib/server/api-key-service.js';

/** @type {import('./$types').RequestHandler} */
export const POST = async ({ request, platform }) => {
	// Require API Key authentication for the MCP endpoint
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return json({ error: 'Unauthorized: Bearer token required' }, { status: 401 });
	}

	const token = authHeader.substring(7);

	try {
		const apiKeyService = new ApiKeyService(platform?.env);
		const userEmail = await apiKeyService.validateKey(token);

		if (!userEmail) {
			return json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
		}
	} catch (error) {
		console.error('Failed to validate API key:', error);
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}

	// Proceed to the MCP handler
	const { createMcpHandler } = await import('agents/mcp');
	const { mcpServer } = await import('$lib/server/mcp.js');

	const handler = createMcpHandler({
		server: mcpServer
	});

	return handler(request);
};
