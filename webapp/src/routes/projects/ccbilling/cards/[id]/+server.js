import { deleteCreditCard } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const id = Number(event.params.id);
	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing or invalid id' }), { status: 400 });
	}
	await deleteCreditCard(event, id);
	return new Response(JSON.stringify({ success: true }));
}
