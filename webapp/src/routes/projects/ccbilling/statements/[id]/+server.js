import { json } from '@sveltejs/kit';
import { getStatement, deleteStatement } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params } = event;
	const statement_id = Number.parseInt(params.id);

	if (isNaN(statement_id)) {
		return json({ error: 'Invalid statement ID' }, { status: 400 });
	}

	try {
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return json({ error: 'Statement not found' }, { status: 404 });
		}

		return json(statement);
	} catch (error) {
		console.error('❌ Error getting statement:', error);
		return json({ error: `Failed to get statement: ${error.message}` }, { status: 500 });
	}
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params } = event;
	const statement_id = Number.parseInt(params.id);

	if (isNaN(statement_id)) {
		return json({ error: 'Invalid statement ID' }, { status: 400 });
	}

	try {
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return json({ error: 'Statement not found' }, { status: 404 });
		}

		await deleteStatement(event, statement_id);

		return json({ success: true, message: 'Statement deleted successfully' });
	} catch (error) {
		console.error('❌ Error deleting statement:', error);
		return json({ error: `Failed to delete statement: ${error.message}` }, { status: 500 });
	}
}
