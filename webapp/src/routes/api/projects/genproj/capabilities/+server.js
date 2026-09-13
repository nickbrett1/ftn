// webapp/src/routes/api/projects/genproj/capabilities/+server.js
import { getCatalogCapabilities } from '$lib/server/catalog.js';
import { json } from '@sveltejs/kit';

/**
 * Serves the capability catalog from the genproj service, so the UI has one
 * source of truth for capability metadata.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ platform }) {
	return json(await getCatalogCapabilities(platform));
}
