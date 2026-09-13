// webapp/src/routes/projects/genproj/api/preview/+server.js
import { json } from '@sveltejs/kit';
import { callGenproj } from '$lib/server/genproj-client';
import { logger } from '$lib/utils/logging';

/**
 * Proxies to genproj's preview endpoint.
 *
 * Deliberately unauthenticated, matching both this route's prior behaviour and
 * genproj's `POST /v1/preview`. Generation and conflict checks are the
 * authenticated ones.
 */
export async function POST(event) {
	const { request, platform } = event;

	let requestBody;
	try {
		requestBody = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { selectedCapabilities } = requestBody;

	if (!requestBody || !selectedCapabilities) {
		return json({ error: 'Missing projectConfig or selectedCapabilities' }, { status: 400 });
	}

	try {
		const { status, body } = await callGenproj(event, '/v1/preview', requestBody);
		return json(body, { status });
	} catch (error) {
		logger.error('Error generating preview:', error);
		return json({ error: 'Failed to generate preview', details: error.message }, { status: 500 });
	}
}
