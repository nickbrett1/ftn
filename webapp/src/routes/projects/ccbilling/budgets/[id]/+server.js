import { getBudget, updateBudget, deleteBudget } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid id' }), { status: 400 });
	}

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

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid id' }), { status: 400 });
	}

	const data = await event.request.json();
	const { name } = data;

	if (!name || !name.trim()) {
		return new Response(JSON.stringify({ error: 'Missing budget name' }), { status: 400 });
	}

	// Check if budget exists
	const existingBudget = await getBudget(event, id);
	if (!existingBudget) {
		return new Response(JSON.stringify({ error: 'Budget not found' }), { status: 404 });
	}

	await updateBudget(event, id, name.trim());
	return new Response(JSON.stringify({ success: true }));
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return new Response(JSON.stringify({ error: 'Missing or invalid id' }), { status: 400 });
	}

	// Check if budget exists
	const existingBudget = await getBudget(event, id);
	if (!existingBudget) {
		return new Response(JSON.stringify({ error: 'Budget not found' }), { status: 404 });
	}

	await deleteBudget(event, id);
	return new Response(JSON.stringify({ success: true }));
}
