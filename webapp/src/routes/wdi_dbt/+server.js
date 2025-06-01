import { error } from '@sveltejs/kit';

export const GET = async ({ platform }) => {
	if (!platform?.env?.R2_WDI) {
		console.error('R2_WDI binding not available on platform.env');
		throw error(500, 'R2 bucket binding not configured correctly.');
	}

	const bucket = platform.env.R2_WDI;
	const objectKey = 'docs/static_index.html';

	try {
		const object = await bucket.get(objectKey);

		if (object === null) {
			throw error(404, `File not found in R2 bucket: ${objectKey}`);
		}

		const headers = new Headers();
		// Copy R2 object metadata (e.g., ETag, Cache-Control) to the response
		object.writeHttpMetadata(headers);
		headers.set('content-type', 'text/html; charset=utf-8');

		return new Response(object.body, { headers });
	} catch (e) {
		const errorMessage = e instanceof Error && e.message ? e.message : String(e);
		// Log the raw error object for more detailed debugging information
		console.error(`Error fetching ${objectKey} from R2. Details: ${errorMessage}. Raw error:`, e);
		throw error(e?.status || 500, `Failed to retrieve file from R2: ${errorMessage}`);
	}
};
