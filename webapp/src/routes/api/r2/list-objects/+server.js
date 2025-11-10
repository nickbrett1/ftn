import { json } from '@sveltejs/kit';

/**
 * R2 Object List API Endpoint
 *
 * This endpoint lists all objects in a specified R2 bucket.
 * It's designed to be used by the scripts/populate_local_r2_from_prod.sh script
 * to discover objects that need to be synced from production to local.
 *
 * Usage:
 * GET /api/r2/list-objects?bucket=ccbilling
 * GET /api/r2/list-objects?bucket=wdi
 *
 * Query Parameters:
 * - bucket: The name of the R2 bucket to list objects from (required)
 * - prefix: Optional prefix to filter objects (optional)
 * - limit: Maximum number of objects to return (optional, default: 1000)
 *
 * Returns:
 * {
 *   "objects": [
 *     {
 *       "key": "path/to/file.pdf",
 *       "size": 12345,
 *       "etag": "abc123",
 *       "lastModified": "2024-01-15T10:30:00.000Z"
 *     }
 *   ],
 *   "truncated": false,
 *   "cursor": null
 * }
 */
export async function GET(event) {
	const url = new URL(event.request.url);
	const bucketName = url.searchParams.get('bucket');
	const prefix = url.searchParams.get('prefix') || undefined;
	const limit = Number.parseInt(url.searchParams.get('limit') || '1000');

	if (!bucketName) {
		return json({ error: 'bucket parameter is required' }, { status: 400 });
	}

	// Get the appropriate R2 bucket binding based on the bucket name
	let bucket;
	if (bucketName === 'ccbilling') {
		bucket = event.platform?.env?.R2_CCBILLING;
	} else if (bucketName === 'wdi') {
		bucket = event.platform?.env?.R2_WDI;
	} else {
		return json({ error: `Unknown bucket: ${bucketName}` }, { status: 400 });
	}

	if (!bucket) {
		return json({ error: `R2 bucket binding not available for ${bucketName}` }, { status: 500 });
	}

	try {
		// List objects in the bucket
		const listOptions = {
			limit: Math.min(limit, 1000), // Cap at 1000 objects per request
			...(prefix && { prefix })
		};

		const result = await bucket.list(listOptions);

		// Format the response to include useful object information
		const objects = result.objects.map((object) => ({
			key: object.key,
			size: object.size,
			etag: object.etag,
			lastModified: object.uploaded.toISOString()
		}));

		const response = {
			objects,
			truncated: result.truncated,
			cursor: result.cursor || null,
			bucket: bucketName,
			count: objects.length
		};

		// Add CORS headers to allow cross-origin requests from the script
		const headers = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Cache-Control': 'no-cache, no-store, must-revalidate'
		};

		return json(response, { headers });
	} catch (error) {
		console.error('Error listing R2 objects:', error);
		return json(
			{
				error: 'Failed to list objects',
				details: error.message
			},
			{ status: 500 }
		);
	}
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
}
