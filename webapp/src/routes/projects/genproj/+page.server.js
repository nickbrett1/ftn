// webapp/src/routes/projects/genproj/+page.server.js
import { redirect } from '@sveltejs/kit';
import { logger } from '$lib/utils/logging.js';
import { fetchCatalog } from '$lib/server/catalog.js';

/**
 * Loads the capability catalog from the genproj service so the page renders
 * with it. A catalog failure must not take the page down: we pass an empty list
 * and let the client-side fetch retry.
 *
 * @param {{ platform?: { env?: Record<string, any> } }} event SvelteKit event.
 * @returns {Promise<{ capabilities: object[], catalogVersion: string | null }>} The catalog.
 */
async function loadCatalog(platform) {
	try {
		const catalog = await fetchCatalog(platform);
		return { capabilities: catalog.capabilities, catalogVersion: catalog.catalogVersion };
	} catch (error) {
		logger.error('Failed to load the capability catalog from genproj', {
			error: error.message
		});
		return { capabilities: [], catalogVersion: null };
	}
}

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url = new URL('http://localhost/'), platform }) {
	const user = locals.user;
	const isAuthenticated = !!user;

	const authError = url.searchParams.get('error');
	const authResult = url.searchParams.get('auth');

	// Restore selected capabilities, project name, and repository URL from URL parameters
	const selectedCapabilitiesParameter = url.searchParams.get('selected');
	const projectNameParameter = url.searchParams.get('projectName');
	const repositoryUrlParameter = url.searchParams.get('repositoryUrl');

	const selectedCapabilities = selectedCapabilitiesParameter
		? selectedCapabilitiesParameter.split(',')
		: [];

	const projectName = projectNameParameter || '';
	const repositoryUrl = repositoryUrlParameter || '';

	// If there's an error, redirect to /notauthorised after displaying a message
	if (authError) {
		throw redirect(302, `/notauthorised?message=${encodeURIComponent(authError)}`);
	}

	// Pass data to the page
	return {
		isAuthenticated,
		authResult,
		selectedCapabilities,
		projectName,
		repositoryUrl,
		...(await loadCatalog(platform))
	};
}
