import { json } from '@sveltejs/kit';
import { callGenproj } from '$lib/server/genproj-client';
import { logger } from '$lib/utils/logging';

/**
 * Proxies to genproj's generate endpoint, which does the repository creation
 * and external-service configuration. ftn no longer generates locally.
 *
 * Authenticated, but not on the user's behalf in any way genproj enforces: ftn
 * presents a shared service secret proving the call came from us, and forwards
 * the signed-in user's email as an informational label. There is no per-user
 * credential and no per-user attribution on this hop — see
 * `docs/api-key-security-model.md`.
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
		const result = await callGenproj(event, '/v1/generate', body, { auth: true });
		return json(result.body, { status: result.status });
	} catch (error) {
		logger.error('Project generation failed', error);
		return json({ message: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
