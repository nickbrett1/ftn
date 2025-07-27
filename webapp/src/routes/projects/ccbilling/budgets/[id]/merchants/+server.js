import {
	addBudgetMerchant,
	removeBudgetMerchant,
	getBudgetMerchants
} from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid budget id' }), { status: 400 });
	}

	const merchants = await getBudgetMerchants(event, id);
	return new Response(JSON.stringify(merchants), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid budget id' }), { status: 400 });
	}

	const data = await event.request.json();
	const { merchant } = data;

	if (!merchant || !merchant.trim()) {
		return new Response(JSON.stringify({ error: 'Missing merchant name' }), { status: 400 });
	}

	await addBudgetMerchant(event, id, merchant.trim());
	return new Response(JSON.stringify({ success: true }));
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid budget id' }), { status: 400 });
	}

	const data = await event.request.json();
	const { merchant } = data;

	if (!merchant || !merchant.trim()) {
		return new Response(JSON.stringify({ error: 'Missing merchant name' }), { status: 400 });
	}

	await removeBudgetMerchant(event, id, merchant.trim());
	return new Response(JSON.stringify({ success: true }));
}
