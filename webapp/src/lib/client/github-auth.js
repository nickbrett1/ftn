// webapp/src/lib/client/github-auth.js
import { logger } from '$lib/utils/logging.js';

/**
 * Initiates the GitHub OAuth flow.
 * @param {string} currentHref - The current window.location.href to extract existing query parameters.
 */
export async function initiateGitHubAuth(currentHref) {
	try {
		// Build GitHub auth URL with current state to preserve selections
		// We need to pass the selections through the OAuth flow so they're preserved on redirect
		let authUrl = '/projects/genproj/api/auth/github';

		// Get current selections from parent (if available via URL)
		if (currentHref) {
			const url = new URL(currentHref);
			const selectedParameter = url.searchParams.get('selected');
			const projectNameParameter = url.searchParams.get('projectName');
			const repositoryUrlParameter = url.searchParams.get('repositoryUrl');

			const parameters = new URLSearchParams();
			if (selectedParameter) parameters.set('selected', selectedParameter);
			if (projectNameParameter) parameters.set('projectName', projectNameParameter);
			if (repositoryUrlParameter) parameters.set('repositoryUrl', repositoryUrlParameter);

			const queryString = parameters.toString();
			if (queryString) {
				authUrl += `?${queryString}`;
			}
		}

		// Redirect to GitHub OAuth
		globalThis.location.href = authUrl;
	} catch (error_) {
		logger.error('GitHub auth failed', { error: error_.message });
		throw error_; // Re-throw to be handled by caller
	}
}
