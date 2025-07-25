import {
	addBudgetMerchant,
	removeBudgetMerchant,
	getBudgetMerchants
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	const merchants = await getBudgetMerchants(event, id);
	return new Response(JSON.stringify(merchants), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	const data = await event.request.json();
	const { merchant } = data;
	if (!merchant) {
		return new Response(JSON.stringify({ error: 'Missing merchant' }), { status: 400 });
	}
	await addBudgetMerchant(event, id, merchant);
	return new Response(JSON.stringify({ success: true }));
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	const data = await event.request.json();
	const { merchant } = data;
	if (!merchant) {
		return new Response(JSON.stringify({ error: 'Missing merchant' }), { status: 400 });
	}
	await removeBudgetMerchant(event, id, merchant);
	return new Response(JSON.stringify({ success: true }));
}
