import { json } from '@sveltejs/kit';

/**
 * Deployment Info API Endpoint
 *
 * This endpoint exposes build-time constants that are injected by Vite during the build process.
 * It provides a reliable way for external services (like the deployments page) to get accurate
 * deployment information including:
 * - Build time (when the code was last built and deployed)
 * - Git branch (which branch was deployed)
 * - Git commit (which commit hash was deployed)
 *
 * Usage:
 * GET /api/deployment-info
 *
 * Returns:
 * {
 *   "buildTime": "2024-01-15T10:30:00.000Z",
 *   "gitBranch": "main",
 *   "gitCommit": "abc1234",
 *   "environment": "production",
 *   "lastUpdated": "2024-01-15T10:30:00.000Z"
 * }
 */
export async function GET() {
	// This endpoint exposes the build-time constants that are injected by Vite
	// It provides a reliable way for external services to get deployment information
	const deploymentInfo = {
		buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null,
		gitBranch: typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : null,
		gitCommit: typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : null,
		environment: 'production', // This will be overridden by the worker
		lastUpdated: null
	};

	// If we have build time, use it as the last updated time
	if (deploymentInfo.buildTime) {
		try {
			deploymentInfo.lastUpdated = new Date(deploymentInfo.buildTime).toISOString();
		} catch (e) {
			console.warn('Could not parse build time:', deploymentInfo.buildTime);
		}
	}

	// Add CORS headers to allow cross-origin requests
	const headers = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Cache-Control': 'no-cache, no-store, must-revalidate'
	};

	return json(deploymentInfo, { headers });
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
}
