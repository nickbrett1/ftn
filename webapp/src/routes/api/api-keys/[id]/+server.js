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
		return json({ error: 'Failed to revoke API key' }, { status: 500 });
	}
}
