import { listStatements, createStatement } from '$lib/server/ccbilling-db.js';
import { requireUser } from '$lib/server/require-user.js';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const cycleId = Number(event.params.id);
	if (!cycleId) {
		return json({ error: 'Missing or invalid billing cycle id' }, { status: 400 });
	}

	try {
		const statements = await listStatements(event, cycleId);
		return json(statements);
	} catch (error) {
		console.error('Error listing statements:', error);
		return json({ error: 'Failed to list statements' }, { status: 500 });
	}
}

export async function POST(event) {
	const authResult = await requireUser(event);
	if (authResult instanceof Response) return authResult;

	const cycleId = Number(event.params.id);
	if (!cycleId) {
		return json({ error: 'Missing or invalid billing cycle id' }, { status: 400 });
	}

	try {
		// Parse multipart form data for file upload
		const formData = await event.request.formData();
		const file = formData.get('file');
		const credit_card_id = formData.get('credit_card_id');
		const due_date = formData.get('due_date');

		// Validate required fields
		if (!file || !credit_card_id || !due_date) {
			return json({ 
				error: 'Missing required fields: file, credit_card_id, due_date' 
			}, { status: 400 });
		}

		// Validate file type (PDF only)
		if (file.type !== 'application/pdf') {
			return json({ 
				error: 'Invalid file type. Only PDF files are allowed.' 
			}, { status: 400 });
		}

		// Validate file size (10MB limit)
		const maxSize = 10 * 1024 * 1024; // 10MB
		if (file.size > maxSize) {
			return json({ 
				error: 'File size too large. Maximum size is 10MB.' 
			}, { status: 400 });
		}

		// Generate unique R2 key
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 8);
		const r2_key = `statements/${cycleId}/${timestamp}-${randomSuffix}-${file.name}`;

		// Upload to R2
		const bucket = event.platform?.env?.R2_CCBILLING;
		if (!bucket) {
			return json({ error: 'R2 ccbilling bucket not configured' }, { status: 500 });
		}

		// Convert file to ArrayBuffer for R2 upload
		const fileBuffer = await file.arrayBuffer();
		
		await bucket.put(r2_key, fileBuffer, {
			customMetadata: {
				originalName: file.name,
				uploadedAt: new Date().toISOString(),
				cycleId: cycleId.toString(),
				contentType: file.type
			}
		});

		// Save statement metadata to database
		await createStatement(event, cycleId, parseInt(credit_card_id), file.name, r2_key, due_date);
		
		return json({ 
			success: true, 
			filename: file.name,
			r2_key: r2_key,
			size: file.size
		});

	} catch (error) {
		console.error('Error uploading statement:', error);
		return json({ error: 'Failed to upload statement' }, { status: 500 });
	}
}
