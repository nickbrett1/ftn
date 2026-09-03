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

/**
 * Expands a capability selection with its declared dependencies (recursively,
 * depth-first, dependencies before dependents). Unknown IDs pass through
 * unchanged. This makes e.g. `circleci` pull in its required `doppler`
 * capability so generated projects actually receive the dependency (goose MCP
 * extension, doppler install, secrets config) instead of just warning about it.
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {string[]} Selection including all required dependencies
 */
export function resolveCapabilityDependencies(selectedCapabilities) {
	const resolved = [];
	const seen = new Set();

	const visit = (id) => {
		if (seen.has(id)) {
			return;
		}
		seen.add(id);
		const capability = capabilities.find((c) => c.id === id);
		if (capability?.dependencies?.length) {
			for (const dependency of capability.dependencies) {
				visit(dependency);
			}
		}
		resolved.push(id);
	};

	for (const id of selectedCapabilities) {
		visit(id);
	}
	return resolved;
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
				message:
					'Repository already exists. Pass `overwrite: true` to regenerate into the existing repository (existing app code is preserved; generated infra files are updated).',
				code: 'REPOSITORY_EXISTS'
			},
			{ status: 409 }
		);
	}
	return json({ message: result.error || 'Project generation failed' }, { status: 500 });
}

export function buildAuthTokensFromStored(storedTokens = [], cookies = null) {
	// GitHub token precedence for repo creation:
	// 1. Per-user OAuth token stored in D1 (serviceName 'GitHub'); the goose
	//    MCP path (generate_project) passes none, so this is usually skipped.
	// 2. GITHUB_TOKEN env var on the Worker (synced from Doppler webapp/prd,
	//    falling back to Doppler common when webapp doesn't override it).
	// 3. GITHUB_ACCESS_TOKEN env var fallback.
	// 4. Session cookie (browser-only; never used by the MCP).
	//
	// The Worker env var is provisioned by the deploy job's Doppler->Cloudflare
	// secret sync (sync-doppler-secrets.sh), so a token rotation only goes live
	// once that sync + redeploy has run.
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
	const { name, repositoryUrl, selectedCapabilities, overwrite, resolutions, configuration } =
		payload;

	// Mutual exclusion guard: deployment systems (and any other declared
	// conflicts) may not be selected together.
	const conflicts = findCapabilityConflicts(selectedCapabilities);
	if (conflicts.length > 0) {
		throw new Error(`Conflicting capabilities selected: ${conflicts.join('; ')}`);
	}

	return {
		projectName: name,
		repositoryUrl: repositoryUrl || '',
		// Expand the selection with declared dependencies (e.g. circleci
		// requires doppler so the goose CircleCI MCP extension gets its tokens).
		capabilities: resolveCapabilityDependencies(selectedCapabilities),
		// Capability-specific configuration (e.g. docker-container publishPort,
		// dataMounts, hostname). Defaults are applied by the generators.
		configuration: configuration || {},
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
