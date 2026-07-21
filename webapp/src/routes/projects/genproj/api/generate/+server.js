import { json } from '@sveltejs/kit';
import { ProjectGeneratorService } from '$lib/server/project-generator';

import { getCurrentUser } from '$lib/server/auth';
import { logger } from '$lib/utils/logging';
import {
	handleGenprojErrorResult,
	buildAuthTokensFromStored,
	buildProjectContext
} from '$lib/server/genproj-api-utils';

export async function POST({ request, platform, cookies }) {
	try {
		const body = await request.json();
		const { name, selectedCapabilities } = body;

		if (!name || !selectedCapabilities) {
			return json({ message: 'Missing required fields' }, { status: 400 });
		}

		// Get user to fetch tokens
		const user = await getCurrentUser({ request, platform });
		if (!user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		// Construct authTokens object
		const authTokens = buildAuthTokensFromStored([], cookies);

		// Instantiate the robust service
		const service = new ProjectGeneratorService(authTokens);

		// Prepare context for generation
		const projectContext = buildProjectContext(body, user.id, authTokens);

		// Run generation
		const result = await service.generateProject(projectContext);

		if (!result.success) {
			return handleGenprojErrorResult(result);
		}

		// Return success response
		// The service returns `repository` object with `htmlUrl`
		return json({
			message: 'Project generated successfully',
			repositoryUrl: result.repository?.htmlUrl || ''
		});
	} catch (error) {
		logger.error('Project generation failed', error);
		return json({ message: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
