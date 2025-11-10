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
		// Manually set important headers from the R2 object to avoid potential
		// issues with object.writeHttpMetadata() in the local dev environment.
		if (object.httpEtag) {
			headers.set('etag', object.httpEtag);
		}
		if (object.httpMetadata?.cacheControl) {
			headers.set('cache-control', object.httpMetadata.cacheControl);
		}
		// Ensure the content type is set correctly for HTML.
		headers.set('content-type', 'text/html; charset=utf-8');

		return new Response(object.body, { headers });
	} catch (error_) {
		const errorMessage =
			error_ instanceof Error && error_.message ? error_.message : String(error_);
		// Log the raw error object for more detailed debugging information
		console.error(
			`Error fetching ${objectKey} from R2. Details: ${errorMessage}. Raw error:`,
			error_
		);
		throw error(error_?.status || 500, `Failed to retrieve file from R2: ${errorMessage}`);
	}
};
