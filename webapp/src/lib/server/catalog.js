// webapp/src/lib/server/catalog.js

/**
 * Access to the genproj catalog service — the single source of truth for
 * capability metadata (see the genproj repo).
 *
 * In deployed environments we reach it over the `GENPROJ` service binding:
 * no DNS lookup, no egress, and no dependency on the public route. Locally
 * (`vite dev`, and tests) there is no binding, so we fall back to the public
 * workers.dev origin, which serves the same catalog. That route is cached for a
 * short time and carries no validator, so a client that wants to know whether
 * its copy is stale re-fetches it.
 */

/** Public origin of the catalog service. Used when the binding is absent. */
export const CATALOG_ORIGIN = 'https://genproj.nick-brett1.workers.dev';

/**
 * Fetches the catalog.
 * @param {{ env?: Record<string, any> }} [platform] SvelteKit platform, providing the bindings.
 * @returns {Promise<{ capabilities: object[], count: number }>} The catalog.
 * @throws {Error} If the catalog service is unavailable or returns a non-OK status.
 */
export async function fetchCatalog(platform) {
	const binding = platform?.env?.GENPROJ;
	const response = binding
		? await binding.fetch('https://genproj/v1/catalog')
		: await fetch(`${CATALOG_ORIGIN}/v1/catalog`);

	if (!response.ok) {
		throw new Error(`genproj catalog request failed with status ${response.status}`);
	}

	return response.json();
}

/**
 * Fetches just the capability list.
 * @param {{ env?: Record<string, any> }} [platform] SvelteKit platform, providing the bindings.
 * @returns {Promise<object[]>} The capabilities.
 */
export async function getCatalogCapabilities(platform) {
	const catalog = await fetchCatalog(platform);
	return catalog.capabilities;
}
