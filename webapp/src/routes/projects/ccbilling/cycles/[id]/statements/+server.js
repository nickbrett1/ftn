import { listStatements, createStatement } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const cycleId = Number(event.params.id);
	if (!cycleId) {
		return new Response(JSON.stringify({ error: 'Missing or invalid billing cycle id' }), {
			status: 400
		});
	}

	const statements = await listStatements(event, cycleId);
	return new Response(JSON.stringify(statements), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const cycleId = Number(event.params.id);
	if (!cycleId) {
		return new Response(JSON.stringify({ error: 'Missing or invalid billing cycle id' }), {
			status: 400
		});
	}

	const data = await event.request.json();
	const { credit_card_id, filename, r2_key, due_date } = data;

	if (!credit_card_id || !filename || !r2_key || !due_date) {
		return new Response(
			JSON.stringify({
				error: 'Missing required fields: credit_card_id, filename, r2_key, due_date'
			}),
			{ status: 400 }
		);
	}

	await createStatement(event, cycleId, credit_card_id, filename, r2_key, due_date);
	return new Response(JSON.stringify({ success: true }));
}
