import { json } from '@sveltejs/kit';

export function handleGenprojErrorResult(result) {
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

export function buildAuthTokensFromStored(storedTokens, cookies = null) {
	const authTokens = {
		github: storedTokens.find((t) => t.serviceName === 'GitHub')?.accessToken,
		circleci: storedTokens.find((t) => t.serviceName === 'CircleCI')?.accessToken,
		doppler: storedTokens.find((t) => t.serviceName === 'Doppler')?.accessToken,
		sonarcloud: storedTokens.find((t) => t.serviceName === 'SonarCloud')?.accessToken
	};

	if (!authTokens.github && cookies) {
		authTokens.github = cookies.get('github_access_token');
	}

	return authTokens;
}

export function buildProjectContext(payload, userId, authTokens) {
	const { name, repositoryUrl, selectedCapabilities, overwrite, resolutions } = payload;
	return {
		projectName: name,
		repositoryUrl: repositoryUrl || '',
		capabilities: selectedCapabilities,
		configuration: {}, // Defaults will be applied by generators
		authTokens, // Passed down for specific needs
		userId: userId,
		overwrite: overwrite || false,
		resolutions: resolutions || null
	};
}
