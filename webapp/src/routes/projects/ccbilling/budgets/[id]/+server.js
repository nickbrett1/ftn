import { getBudget, updateBudget, deleteBudget } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	const budget = await getBudget(event, id);
	if (!budget) {
		return new Response(JSON.stringify({ error: 'Budget not found' }), { status: 404 });
	}
	return new Response(JSON.stringify(budget), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function PUT(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	const data = await event.request.json();
	const { name } = data;
	if (!name) {
		return new Response(JSON.stringify({ error: 'Missing name' }), { status: 400 });
	}
	await updateBudget(event, id, name);
	return new Response(JSON.stringify({ success: true }));
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;
	const { id } = event.params;
	await deleteBudget(event, id);
	return new Response(JSON.stringify({ success: true }));
}
