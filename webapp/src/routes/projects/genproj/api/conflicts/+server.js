import { json } from '@sveltejs/kit';
import { callGenproj } from '$lib/server/genproj-client';
import { logger } from '$lib/utils/logging';

/**
 * Proxies to genproj's conflict-check endpoint.
 *
 * Authenticated for the same reason as generate: the shared service secret
 * proves the call came from ftn. genproj checks conflicts using the GitHub
 * credentials of the deployment, not of the signed-in user.
 */
export async function POST(event) {
	const { request } = event;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ message: 'Missing required fields' }, { status: 400 });
	}

	const { name, selectedCapabilities } = body ?? {};

	if (!name || !selectedCapabilities) {
		return json({ message: 'Missing required fields' }, { status: 400 });
	}

	try {
		const result = await callGenproj(event, '/v1/conflicts', body, { auth: true });
		return json(result.body, { status: result.status });
	} catch (error) {
		logger.error('Conflict check failed', error);
		return json({ message: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
