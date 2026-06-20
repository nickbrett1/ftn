import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth.js';
import { ApiKeyService } from '$lib/server/api-key-service.js';

export async function POST(event) {
	await requireUser(event);

	try {
		const apiKeyService = new ApiKeyService(event.platform?.env);
		await apiKeyService.initializeDatabase();
		return json({ success: true });
	} catch (error) {
		console.error('Failed to initialize API keys database:', error);
		return json({ error: 'Failed to initialize database' }, { status: 500 });
	}
}
