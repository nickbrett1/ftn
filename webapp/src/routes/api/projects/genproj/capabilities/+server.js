// webapp/src/routes/api/projects/genproj/capabilities/+server.js
import { fetchCatalog } from '$lib/server/catalog.js';
import { json } from '@sveltejs/kit';

/**
 * Serves the capability catalog from the genproj service, so the UI has one
 * source of truth for capability metadata. The categories travel with it: the
 * UI takes its sections' order and headings from the catalog rather than
 * keeping its own copy. The project-level `configurationSchema` travels too:
 * it declares the fields that apply to the project as a whole (today,
 * `language`), which are not attached to any single capability.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ platform }) {
	const catalog = await fetchCatalog(platform);
	return json({
		capabilities: catalog.capabilities ?? [],
		categories: catalog.categories ?? [],
		configurationSchema: catalog.configurationSchema ?? null
	});
}
