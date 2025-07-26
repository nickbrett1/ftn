import { getStatement, deleteStatement } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing or invalid statement id' }), {
			status: 400
		});
	}

	const statement = await getStatement(event, id);
	if (!statement) {
		return new Response(JSON.stringify({ error: 'Statement not found' }), { status: 404 });
	}

	return new Response(JSON.stringify(statement), {
		headers: { 'Content-Type': 'application/json' }
	});
}

export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const id = Number(event.params.id);
	if (!id) {
		return new Response(JSON.stringify({ error: 'Missing or invalid statement id' }), {
			status: 400
		});
	}

	// Check if statement exists
	const existingStatement = await getStatement(event, id);
	if (!existingStatement) {
		return new Response(JSON.stringify({ error: 'Statement not found' }), { status: 404 });
	}

	await deleteStatement(event, id);
	return new Response(JSON.stringify({ success: true }));
}
