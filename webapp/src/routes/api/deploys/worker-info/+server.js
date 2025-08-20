import { json, error } from '@sveltejs/kit';

export async function GET({ request, url }) {
	try {
		// Get the target URL from query parameters
		const targetUrl = url.searchParams.get('url');
		
		if (!targetUrl) {
			throw error(400, 'URL query parameter is required');
		}

		// The constants are injected by Vite at build time, so we can use them directly
		const workerInfo = {
			buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null,
			gitBranch: typeof __GIT_BRANCH__ !== 'undefined' ? __GIT_BRANCH__ : null,
			gitCommit: typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : null,
			lastUpdated: null
		};
		
		// If we found build time, use it as the last updated time
		if (workerInfo.buildTime) {
			try {
				workerInfo.lastUpdated = new Date(workerInfo.buildTime).toISOString();
			} catch (e) {
				console.warn('Could not parse build time:', workerInfo.buildTime);
			}
		}
		
		// Log what we found for debugging
		console.log('Worker info extracted:', {
			url: targetUrl,
			buildTime: workerInfo.buildTime,
			gitBranch: workerInfo.gitBranch,
			gitCommit: workerInfo.gitCommit,
			lastUpdated: workerInfo.lastUpdated
		});
		
		return json(workerInfo);
	} catch (err) {
		console.error('Worker info API error:', err);
		
		if (err.status) {
			throw err;
		}
		
		throw error(500, `Failed to fetch worker info: ${err.message}`);
	}
}