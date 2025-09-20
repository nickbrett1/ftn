import { json } from '@sveltejs/kit';
import { getStatement } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';

/** @type {import('./$types').RequestHandler} */
export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const { params } = event;
	const statement_id = parseInt(params.id);

	if (isNaN(statement_id)) {
		return json({ error: 'Invalid statement ID' }, { status: 400 });
	}

	try {
		// Get the statement details
		const statement = await getStatement(event, statement_id);
		if (!statement) {
			return json({ error: 'Statement not found' }, { status: 404 });
		}

		// Get the R2 bucket
		const bucket = event.platform?.env?.R2_CCBILLING;
		if (!bucket) {
			return json({ error: 'R2_CCBILLING bucket not configured' }, { status: 500 });
		}

		// Download the PDF from R2
		// Try the original key first
		let pdfObject = await bucket.get(statement.r2_key);

		// If not found, try with URL encoding (spaces become %20)
		if (!pdfObject) {
			const encodedKey = statement.r2_key.replace(/ /g, '%20');
			pdfObject = await bucket.get(encodedKey);
		}

		if (!pdfObject) {
			return json({ error: 'PDF not found in R2' }, { status: 404 });
		}

		// Return the PDF as a blob
		const pdfBuffer = await pdfObject.arrayBuffer();

		return new Response(pdfBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${statement.filename}"`
			}
		});
	} catch (error) {
		console.error('❌ Error downloading PDF:', error);
		return json({ error: `Failed to download PDF: ${error.message}` }, { status: 500 });
	}
}
