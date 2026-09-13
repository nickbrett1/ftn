import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth.js';
import { ApiKeyService } from '$lib/server/api-key-service.js';

export async function DELETE(event) {
	const user = await requireUser(event);
	const { id } = event.params;

	try {
		const apiKeyService = new ApiKeyService(event.platform?.env);
		await apiKeyService.revokeKey(id, user.email);
		return json({ success: true });
	} catch (error) {
		console.error('Failed to revoke API key:', error);
		// A system-managed key is refused by the service; that is a bad request,
		// not a server fault, and the message is safe to surface.
		if (error.message?.includes('System-managed keys cannot be deleted')) {
			return json({ error: error.message }, { status: 400 });
		}
		return json({ error: 'Failed to revoke API key' }, { status: 500 });
	}
}
