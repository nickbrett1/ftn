import { json, error } from '@sveltejs/kit';

export async function POST({ request }) {
	try {
		const { url } = await request.json();
		
		if (!url) {
			throw error(400, 'URL is required');
		}

		// First, try to fetch from a potential deployment info endpoint
		let workerInfo = null;
		
		try {
			const deploymentInfoUrl = new URL('/api/deployment-info', url);
			const deploymentResponse = await fetch(deploymentInfoUrl.toString(), {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Mozilla/5.0 (compatible; Deployment-Info-Fetcher/1.0)'
				}
			});
			
			if (deploymentResponse.ok) {
				workerInfo = await deploymentResponse.json();
				console.log('Found deployment info endpoint:', workerInfo);
			}
		} catch (endpointError) {
			console.log('No deployment info endpoint found, trying HTML parsing');
		}
		
		// If no endpoint found, try parsing HTML
		if (!workerInfo) {
			// Make a request to the worker to get deployment info
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'User-Agent': 'Mozilla/5.0 (compatible; Deployment-Info-Fetcher/1.0)'
				}
			});

			if (!response.ok) {
				throw error(response.status, `Failed to fetch worker info: ${response.status} ${response.statusText}`);
			}

			const html = await response.text();
			
			// Try multiple patterns to extract the constants
			// Pattern 1: Direct variable assignment in script tags
			let buildTimeMatch = html.match(/__BUILD_TIME__\s*=\s*['"]([^'"]+)['"]/);
			let gitBranchMatch = html.match(/__GIT_BRANCH__\s*=\s*['"]([^'"]+)['"]/);
			let gitCommitMatch = html.match(/__GIT_COMMIT__\s*=\s*['"]([^'"]+)['"]/);
			
			// Pattern 2: Constants defined in script tags with different syntax
			if (!buildTimeMatch) {
				buildTimeMatch = html.match(/__BUILD_TIME__\s*:\s*['"]([^'"]+)['"]/);
			}
			if (!gitBranchMatch) {
				gitBranchMatch = html.match(/__GIT_BRANCH__\s*:\s*['"]([^'"]+)['"]/);
			}
			if (!gitCommitMatch) {
				gitCommitMatch = html.match(/__GIT_COMMIT__\s*:\s*['"]([^'"]+)['"]/);
			}
			
			// Pattern 3: Look for constants in JSON-like structures
			if (!buildTimeMatch) {
				buildTimeMatch = html.match(/["']__BUILD_TIME__["']\s*:\s*["']([^"']+)["']/);
			}
			if (!gitBranchMatch) {
				gitBranchMatch = html.match(/["']__GIT_BRANCH__["']\s*:\s*["']([^"']+)["']/);
			}
			if (!gitCommitMatch) {
				gitCommitMatch = html.match(/["']__GIT_COMMIT__["']\s*:\s*["']([^"']+)["']/);
			}
			
			// Pattern 4: Look for constants in meta tags or data attributes
			if (!buildTimeMatch) {
				buildTimeMatch = html.match(/data-build-time=["']([^"']+)["']/);
			}
			if (!gitBranchMatch) {
				gitBranchMatch = html.match(/data-git-branch=["']([^"']+)["']/);
			}
			if (!gitCommitMatch) {
				gitCommitMatch = html.match(/data-git-commit=["']([^"']+)["']/);
			}
			
			workerInfo = {
				buildTime: buildTimeMatch ? buildTimeMatch[1] : null,
				gitBranch: gitBranchMatch ? gitBranchMatch[1] : null,
				gitCommit: gitCommitMatch ? gitCommitMatch[1] : null,
				lastUpdated: null
			};
		}
		
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
			url,
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