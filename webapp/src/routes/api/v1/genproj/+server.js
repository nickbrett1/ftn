import { json } from '@sveltejs/kit';
import { ProjectGeneratorService } from '$lib/server/project-generator';
import { TokenService } from '$lib/server/token-service';
import { logger } from '$lib/utils/logging';
import { handleGenprojErrorResult, buildAuthTokensFromStored, buildProjectContext, validatePatAuth } from '$lib/server/genproj-api-utils';

export async function POST({ request, platform }) {
	try {
		// 1. Verify PAT from Authorization header
		const { userEmail, errorResponse } = await validatePatAuth(request, platform);
		if (errorResponse) return errorResponse;

		// 2. Parse request body
		let body;
		try {
			body = await request.json();
		} catch (err) {
			return json({ message: 'Invalid JSON payload' }, { status: 400 });
		}

		const { name, selectedCapabilities } = body;

		if (!name || !selectedCapabilities) {
			return json({ message: 'Missing required fields: name, selectedCapabilities' }, { status: 400 });
		}

		// 3. Fetch stored tokens using userEmail as userId
		// In auth.js, userId is set to user.email
		const userId = userEmail;
		const tokenService = new TokenService(platform.env.D1_DATABASE);
		const storedTokens = await tokenService.getTokensByUserId(userId);

		// Construct authTokens object
		const authTokens = buildAuthTokensFromStored(storedTokens);

		// 4. Instantiate ProjectGeneratorService
		const service = new ProjectGeneratorService(authTokens);

		// Prepare context for generation
		const projectContext = buildProjectContext(body, userId, authTokens);

		// 5. Run generation
		const result = await service.generateProject(projectContext);

		if (!result.success) {
			return handleGenprojErrorResult(result);
		}

		// 6. Return success response
		return json({
			message: 'Project generated successfully',
			repositoryUrl: result.repository?.htmlUrl || ''
		});
	} catch (error) {
		logger.error('API Project generation failed', error);
		return json({ message: error.message || 'Internal Server Error' }, { status: 500 });
	}
}
