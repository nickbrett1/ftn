import { json } from '@sveltejs/kit';
import { ProjectGeneratorService } from '$lib/server/project-generator';
import { TokenService } from '$lib/server/token-service';
import { getCurrentUser } from '$lib/server/auth';
import { logger } from '$lib/utils/logging';

export async function POST({ request, platform, cookies }) {
	try {
		const body = await request.json();
		const { name, repositoryUrl, selectedCapabilities } = body;

		if (!name || !selectedCapabilities) {
			return json({ message: 'Missing required fields' }, { status: 400 });
		}

		// Get user to fetch tokens
		const user = await getCurrentUser({ request, platform });
		if (!user) {
			return json({ message: 'Unauthorized' }, { status: 401 });
		}

		// Get stored tokens
		const tokenService = new TokenService(platform.env.D1_DATABASE);
		const storedTokens = await tokenService.getTokensByUserId(user.id);

		// Construct authTokens object
		const authTokens = {
			github: storedTokens.find((t) => t.serviceName === 'GitHub')?.accessToken,
			circleci: storedTokens.find((t) => t.serviceName === 'CircleCI')?.accessToken,
			doppler: storedTokens.find((t) => t.serviceName === 'Doppler')?.accessToken,
			sonarcloud: storedTokens.find((t) => t.serviceName === 'SonarCloud')?.accessToken
		};

		// Also check cookies for GitHub token if not in DB (fallback/hybrid auth)
		// The client-side auth flow sets 'github_access_token' cookie
		if (!authTokens.github) {
			authTokens.github = cookies.get('github_access_token');
		}

		// Instantiate the robust service
		const service = new ProjectGeneratorService(authTokens);

		// Prepare context for generation
		const projectContext = {
			projectName: name,
			repositoryUrl: repositoryUrl || '',
			capabilities: selectedCapabilities,
			configuration: {}, // Defaults will be applied by generators
			authTokens, // Redundant but harmless if included
			userId: user.id
		};

		// Run generation
		const result = await service.generateProject(projectContext);

		if (!result.success) {
			// Handle authentication errors specifically
			if (
				result.error &&
				(result.error.includes('Unauthorized') || result.error.includes('GitHub token not found'))
			) {
				return json({ message: result.error }, { status: 401 });
			}
			return json({ message: result.error || 'Project generation failed' }, { status: 500 });
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
