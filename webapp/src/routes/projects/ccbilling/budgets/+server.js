import { listBudgets, createBudget } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const budgets = await listBudgets(event);
	return new Response(JSON.stringify(budgets), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const data = await event.request.json();
	const { name, icon } = data;

	if (!name || !name.trim()) {
		return new Response(JSON.stringify({ error: 'Missing budget name' }), { status: 400 });
	}

	if (!icon) {
		return new Response(JSON.stringify({ error: 'Missing budget icon' }), { status: 400 });
	}

	await createBudget(event, name.trim(), icon);
	return new Response(JSON.stringify({ success: true }));
}
