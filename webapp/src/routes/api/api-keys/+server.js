import { json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/auth.js';
import { ApiKeyService } from '$lib/server/api-key-service.js';

export async function GET(event) {
	const user = await requireUser(event);

	try {
		const apiKeyService = new ApiKeyService(event.platform?.env);
		const keys = await apiKeyService.getKeysForUser(user.email);
		return json({ keys });
	} catch (error) {
		console.error('Failed to fetch API keys:', error);
		return json({ error: 'Failed to fetch API keys' }, { status: 500 });
	}
}

export async function POST(event) {
	const user = await requireUser(event);

	try {
		const data = await event.request.json();
		const name = data.name || 'New API Key';

		const apiKeyService = new ApiKeyService(event.platform?.env);
		const newKey = await apiKeyService.createKey(user.email, name);

		return json({ key: newKey });
	} catch (error) {
		console.error('Failed to create API key:', error);
		return json({ error: 'Failed to create API key' }, { status: 500 });
	}
}
