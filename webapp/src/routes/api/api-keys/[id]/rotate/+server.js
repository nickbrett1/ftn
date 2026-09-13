import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth.js';
import { ApiKeyService } from '$lib/server/api-key-service.js';

/**
 * Issues a fresh value for a system-managed key (`kind = 'system'`).
 *
 * System keys back ftn's own server-to-server calls on the user's behalf, so
 * they cannot be deleted from the UI. Rotating is the remedy when one may have
 * leaked: the previous value stops working immediately.
 *
 * The new value is returned once and never stored in the clear, exactly like
 * key creation.
 */
export async function POST(event) {
	const user = await requireUser(event);
	const { id } = event.params;

	try {
		const apiKeyService = new ApiKeyService(event.platform?.env);
		const rotated = await apiKeyService.rotateSystemKey(id, user.email);
		return json({ success: true, rawKey: rotated.rawKey });
	} catch (error) {
		console.error('Failed to rotate API key:', error);
		// The service refuses to rotate a key a human created; that is a bad
		// request rather than a server fault, and the message is safe to surface.
		if (
			error.message?.includes('Only system-managed keys can be rotated') ||
			error.message?.includes('API key not found')
		) {
			return json({ error: error.message }, { status: 400 });
		}
		return json({ error: 'Failed to rotate API key' }, { status: 500 });
	}
}
