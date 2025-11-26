import { redirect } from '@sveltejs/kit';

/**
 * @param {import('./$types').PageServerLoadEvent} event
 */
export async function load({ url, cookies, fetch }) {
	const accessToken = cookies.get('github_access_token');
	if (!accessToken) {
		throw redirect(302, '/projects/genproj?error=not_authenticated');
	}

	const projectName = url.searchParams.get('projectName') || 'my-project';
	const repositoryUrl = url.searchParams.get('repositoryUrl') || '';
	const selected = url.searchParams.get('selected') || '';

	try {
		const response = await fetch('/projects/genproj/api/preview', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				name: projectName,
				repositoryUrl: repositoryUrl,
				selectedCapabilities: selected.split(',')
			})
		});

		if (!response.ok) {
			const error = await response.json();
			return {
				error: error.message || 'Failed to generate preview'
			};
		}

		const previewData = await response.json();

		return {
			projectName,
			repositoryUrl,
			selected,
			previewData
		};
	} catch (e) {
		return {
			error: 'Failed to fetch preview'
		};
	}
}
