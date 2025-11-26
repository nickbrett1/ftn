import { json } from '@sveltejs/kit';
import { generateProject } from '$lib/server/project-generator.js';
import { GITHUB_API_URL } from '$lib/server/constants.js';
import { logger } from '$lib/utils/logging.js';

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function POST({ request, cookies, fetch }) {
	const accessToken = cookies.get('github_access_token');
	if (!accessToken) {
		return json({ message: 'Not authenticated' }, { status: 401 });
	}

	const { name, repositoryUrl, selectedCapabilities } = await request.json();

	try {
		const zipBuffer = await generateProject({
			name,
			repositoryUrl,
			selectedCapabilities,
			// For now, we don't have a way to configure these in the generate page
			configuration: {}
		});

		// At this point, we would interact with the GitHub API to create the repository
		// and commit the files. For this example, we'll just return a success message.
		// A full implementation would require a GitHub API client to:
		// 1. Create a repository if `repositoryUrl` is empty
		// 2. Get the default branch
		// 3. Create a new branch
		// 4. Create blobs for each file in the zip
		// 5. Create a tree with the blobs
		// 6. Create a commit with the tree
		// 7. Update the branch reference to the new commit
		// 8. Create a pull request (optional)

		const newRepoUrl = `https://github.com/new/${name}`; // Placeholder

		return json({
			message: 'Project generated successfully',
			repositoryUrl: newRepoUrl
		});
	} catch (e) {
		logger.error('Failed to generate project', { error: e.message });
		return json({ message: 'Failed to generate project' }, { status: 500 });
	}
}
