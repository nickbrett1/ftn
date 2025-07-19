import { listCreditCards, createCreditCard } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const cards = await listCreditCards(event);
	return new Response(JSON.stringify(cards), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const data = await event.request.json();
	const { name, last4 } = data;
	if (!name || !last4) {
		return new Response(JSON.stringify({ error: 'Missing name or last4' }), { status: 400 });
	}
	await createCreditCard(event, name, last4);
	return new Response(JSON.stringify({ success: true }));
}
