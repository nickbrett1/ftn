import { json } from '@sveltejs/kit';
import { ProjectGeneratorService } from '$lib/server/project-generator';
import { buildAuthTokensFromStored } from '$lib/server/genproj-api-utils';
import { getCurrentUser } from '$lib/server/auth';
import { logger } from '$lib/utils/logging';

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

		// Prepare context for conflict check
		const projectContext = {
			projectName: name,
			capabilities: selectedCapabilities,
			configuration: {},
			authTokens,
			userId: user.id
		};

		// Run conflict check
		const conflicts = await service.checkConflicts(projectContext);

		return json({
			conflicts
		});
	} catch (error) {
		logger.error('Conflict check failed', error);
		if (error.message.includes('GitHub authentication required')) {
			return json({ message: error.message }, { status: 401 });
		}
		return json({ message: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
