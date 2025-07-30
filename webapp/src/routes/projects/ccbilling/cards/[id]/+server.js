import { getCreditCard, updateCreditCard, deleteCreditCard } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid id' }), { status: 400 });
	}

	const card = await getCreditCard(event, id);
	if (!card) {
		return new Response(JSON.stringify({ error: 'Credit card not found' }), { status: 404 });
	}

	return new Response(JSON.stringify(card), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function PUT(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid id' }), { status: 400 });
	}

	const data = await event.request.json();
	const { name, last4 } = data;
	if (!name || !last4) {
		return new Response(JSON.stringify({ error: 'Missing name or last4' }), { status: 400 });
	}

	// Check if card exists before updating
	const existingCard = await getCreditCard(event, id);
	if (!existingCard) {
		return new Response(JSON.stringify({ error: 'Credit card not found' }), { status: 404 });
	}

	await updateCreditCard(event, id, name, last4);
	return new Response(JSON.stringify({ success: true }));
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid id' }), { status: 400 });
	}
	await deleteCreditCard(event, id);
	return new Response(JSON.stringify({ success: true }));
}
