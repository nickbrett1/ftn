import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { ApiKeyService } from '$lib/server/api-key-service';
import { capabilities } from '$lib/config/capabilities.js';

/**
 * Detects mutually exclusive capability selections (symmetric conflicts).
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {string[]} Human-readable conflict descriptions
 */
export function findCapabilityConflicts(selectedCapabilities) {
	const selected = new Set(selectedCapabilities);
	const conflicting = [];
	for (const id of selectedCapabilities) {
		const capability = capabilities.find((c) => c.id === id);
		if (!capability) continue;
		for (const conflictId of capability.conflicts) {
			if (selected.has(conflictId)) {
				conflicting.push(`${id} conflicts with ${conflictId}`);
			}
		}
	}
	return conflicting;
}

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

export function buildAuthTokensFromStored(storedTokens = [], cookies = null) {
	const authTokens = {
		github:
			storedTokens.find((t) => t.serviceName === 'GitHub')?.accessToken ||
			env.GITHUB_TOKEN ||
			env.GITHUB_ACCESS_TOKEN,
		circleci:
			storedTokens.find((t) => t.serviceName === 'CircleCI')?.accessToken || env.CIRCLECI_TOKEN,
		doppler:
			storedTokens.find((t) => t.serviceName === 'Doppler')?.accessToken || env.DOPPLER_TOKEN,
		sonarcloud:
			storedTokens.find((t) => t.serviceName === 'SonarCloud')?.accessToken || env.SONARQUBE_TOKEN
	};

	if (!authTokens.github && cookies) {
		authTokens.github = cookies.get('github_access_token');
	}

	return authTokens;
}

export function buildProjectContext(payload, userId, authTokens) {
	const { name, repositoryUrl, selectedCapabilities, overwrite, resolutions } = payload;

	// Mutual exclusion guard: deployment systems (and any other declared
	// conflicts) may not be selected together.
	const conflicts = findCapabilityConflicts(selectedCapabilities);
	if (conflicts.length > 0) {
		throw new Error(`Conflicting capabilities selected: ${conflicts.join('; ')}`);
	}

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

export async function validatePatAuth(request, platform) {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return {
			errorResponse: json({ message: 'Unauthorized: Missing or invalid PAT' }, { status: 401 })
		};
	}

	const pat = authHeader.split(' ')[1];
	if (!pat || typeof pat !== 'string' || pat === '' || pat === 'undefined') {
		return { errorResponse: json({ message: 'Unauthorized: Missing PAT token' }, { status: 401 }) };
	}

	// Use ApiKeyService to validate PAT
	const apiKeyService = new ApiKeyService(platform.env);
	const userEmail = await apiKeyService.validateKey(pat);

	if (!userEmail) {
		return { errorResponse: json({ message: 'Unauthorized: Invalid PAT' }, { status: 401 }) };
	}

	return { userEmail };
}
