import { getBudget, updateBudget, deleteBudget } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return Response.json({ error: 'Missing or invalid id' }, { status: 400 });
	}

	const budget = await getBudget(event, id);
	if (!budget) {
		return Response.json({ error: 'Budget not found' }, { status: 404 });
	}

	return Response.json(budget, {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function PUT(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return Response.json({ error: 'Missing or invalid id' }, { status: 400 });
	}

	const data = await event.request.json();
	const { name, icon } = data;

	if (!name || !name.trim()) {
		return Response.json({ error: 'Missing budget name' }, { status: 400 });
	}

	if (!icon) {
		return Response.json({ error: 'Missing budget icon' }, { status: 400 });
	}

	// Check if budget exists
	const existingBudget = await getBudget(event, id);
	if (!existingBudget) {
		return Response.json({ error: 'Budget not found' }, { status: 404 });
	}

	await updateBudget(event, id, name.trim(), icon);
	return Response.json({ success: true });
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id || id <= 0) {
		return Response.json({ error: 'Missing or invalid id' }, { status: 400 });
	}

	// Check if budget exists
	const existingBudget = await getBudget(event, id);
	if (!existingBudget) {
		return Response.json({ error: 'Budget not found' }, { status: 404 });
	}

	await deleteBudget(event, id);
	return Response.json({ success: true });
}
