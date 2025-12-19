// webapp/src/routes/projects/genproj/+page.server.js
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, url = new URL('http://localhost/') }) {
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
		repositoryUrl
	};
}
