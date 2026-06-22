import { json } from '@sveltejs/kit';
import { ApiKeyService } from '$lib/server/api-key-service.js';
import { createMcpHandler } from 'agents/mcp';
import { createMcpServer } from '$lib/server/mcp.js';

const ALLOWED_ORIGINS = [
	'http://localhost:5173',
	'https://www.fintechnick.com',
	'https://ftn-preview.nick-brett1.workers.dev'
];

async function authenticate(request, platform) {
	// For SSE connections, we might need to authenticate via query params if Authorization header is missing
	let token;

	const authHeader = request.headers.get('Authorization');
	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.slice(7);
	} else {
		const url = new URL(request.url);
		token = url.searchParams.get('token');
	}

	if (!token) {
		return { error: 'Unauthorized: Bearer token required', status: 401 };
	}

	try {
		const apiKeyService = new ApiKeyService(platform?.env);
		const userEmail = await apiKeyService.validateKey(token);

		if (!userEmail) {
			return { error: 'Unauthorized: Invalid token', status: 401 };
		}
		return { userEmail, token };
	} catch (error) {
		console.error('Failed to validate API key:', error);
		if (error.message === 'Rate limit exceeded') {
			return { error: 'Rate limit exceeded. Please try again later.', status: 429 };
		}
		return { error: 'Internal Server Error', status: 500 };
	}
}

async function handleMcpRequest(request, platform) {
	const authResult = await authenticate(request, platform);
	if (authResult.error) {
		return json({ error: authResult.error }, { status: authResult.status });
	}

	const { userEmail, token } = authResult;

	const server = createMcpServer({ userEmail, platform });

	const requestOrigin = request.headers.get('Origin');
	const corsOrigin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

	// Session Generator that binds the user email or token to the sessionId
	const sessionIdGenerator = () => `${crypto.randomUUID()}--${token}`;

	const handler = createMcpHandler(server, {
		route: '/api/mcp',
		allowedOrigins: ALLOWED_ORIGINS,
		enableDnsRebindingProtection: true,
		sessionIdGenerator,
		corsOptions: {
			origin: corsOrigin,
			methods: 'GET, POST, OPTIONS',
			headers: 'Content-Type, Authorization',
			maxAge: 86_400
		}
	});

	if (request.method === 'POST') {
		const url = new URL(request.url);
		const sessionId = url.searchParams.get('sessionId');
		if (sessionId && !sessionId.endsWith(`--${token}`)) {
			return json({ error: 'Forbidden: Session does not match authentication token' }, { status: 403 });
		}
	}

	return handler(request, platform?.env, platform?.context || {});
}

export const POST = async ({ request, platform }) => {
	return handleMcpRequest(request, platform);
};

export const GET = async ({ request, platform }) => {
	return handleMcpRequest(request, platform);
};

export const OPTIONS = async ({ request }) => {
	const requestOrigin = request.headers.get('Origin');
	const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

	return new Response(undefined, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		}
	});
};
