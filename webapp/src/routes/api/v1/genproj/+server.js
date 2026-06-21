import { json } from '@sveltejs/kit';
import { ProjectGeneratorService } from '$lib/server/project-generator';
import { TokenService } from '$lib/server/token-service';
import { ApiKeyService } from '$lib/server/api-key-service';
import { logger } from '$lib/utils/logging';

export async function POST({ request, platform }) {
	try {
		// 1. Verify PAT from Authorization header
		const authHeader = request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return json({ message: 'Unauthorized: Missing or invalid PAT' }, { status: 401 });
		}

		const pat = authHeader.split(' ')[1];
		if (!pat) {
			return json({ message: 'Unauthorized: Missing PAT token' }, { status: 401 });
		}

		// Use ApiKeyService to validate PAT
		const apiKeyService = new ApiKeyService(platform.env);
		const userEmail = await apiKeyService.validateKey(pat);

		if (!userEmail) {
			return json({ message: 'Unauthorized: Invalid PAT' }, { status: 401 });
		}

		// 2. Parse request body
		let body;
		try {
			body = await request.json();
		} catch (err) {
			return json({ message: 'Invalid JSON payload' }, { status: 400 });
		}

		const { name, repositoryUrl, selectedCapabilities, overwrite, resolutions } = body;

		if (!name || !selectedCapabilities) {
			return json({ message: 'Missing required fields: name, selectedCapabilities' }, { status: 400 });
		}

		// 3. Fetch stored tokens using userEmail as userId
		// In auth.js, userId is set to user.email
		const userId = userEmail;
		const tokenService = new TokenService(platform.env.D1_DATABASE);
		const storedTokens = await tokenService.getTokensByUserId(userId);

		// Construct authTokens object
		const authTokens = {
			github: storedTokens.find((t) => t.serviceName === 'GitHub')?.accessToken,
			circleci: storedTokens.find((t) => t.serviceName === 'CircleCI')?.accessToken,
			doppler: storedTokens.find((t) => t.serviceName === 'Doppler')?.accessToken,
			sonarcloud: storedTokens.find((t) => t.serviceName === 'SonarCloud')?.accessToken
		};

		// 4. Instantiate ProjectGeneratorService
		const service = new ProjectGeneratorService(authTokens);

		// Prepare context for generation
		const projectContext = {
			projectName: name,
			repositoryUrl: repositoryUrl || '',
			capabilities: selectedCapabilities,
			configuration: {}, // Defaults will be applied by generators
			authTokens, // Passed down for specific needs
			userId: userId,
			overwrite: overwrite || false,
			resolutions: resolutions || null
		};

		// 5. Run generation
		const result = await service.generateProject(projectContext);

		if (!result.success) {
			// Handle specific errors
			if (
				result.error &&
				(result.error.includes('Unauthorized') || result.error.includes('GitHub token not found'))
			) {
				return json({ message: result.error }, { status: 401 });
			}
			if (result.errorCode === 'REPOSITORY_EXISTS') {
				return json(
					{
						message: 'Repository already exists',
						code: 'REPOSITORY_EXISTS'
					},
					{ status: 409 }
				);
			}
			return json({ message: result.error || 'Project generation failed' }, { status: 500 });
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
