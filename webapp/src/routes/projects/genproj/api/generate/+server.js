import { json } from '@sveltejs/kit';
import { ProjectGeneratorService } from '$lib/services/project-generator';
import { logger } from '$lib/utils/logging';

export async function POST({ request, platform }) {
	try {
		const body = await request.json();
		const { name, repositoryUrl, selectedCapabilities } = body;

		if (!name || !selectedCapabilities) {
			return json({ message: 'Missing required fields' }, { status: 400 });
		}

		const projectConfig = {
			projectName: name,
			repositoryUrl: repositoryUrl || '',
			selectedCapabilities,
			configuration: {} // Defaults will be applied by the service/generators
		};

		const service = new ProjectGeneratorService();
		const result = await service.generateProject(projectConfig, platform, request);

		if (!result.success) {
			return json({ message: result.message }, { status: 500 });
		}

		// Use the repository URL returned by the service, or fallback to the input
		// The service update will ensure result.repository contains the info
		const repoUrl = result.repository?.htmlUrl || repositoryUrl || '';

		return json({
			message: result.message,
			repositoryUrl: repoUrl
		});
	} catch (error) {
		logger.error('Project generation failed', error);
		return json({ message: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
