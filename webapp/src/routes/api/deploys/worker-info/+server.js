import { json, error } from '@sveltejs/kit';

export async function GET({ request, url }) {
	try {
		// Get the target URL from query parameters
		const targetUrl = url.searchParams.get('url');
		
		if (!targetUrl) {
			throw error(400, 'URL query parameter is required');
		}

		// We need to fetch the deployment info from the target worker
		// First try to get it from their deployment-info endpoint
		let workerInfo = null;
		
		try {
			const deploymentInfoUrl = new URL('/api/deployment-info', targetUrl);
			console.log('Trying to fetch from deployment-info endpoint:', deploymentInfoUrl.toString());
			
			const deploymentResponse = await fetch(deploymentInfoUrl.toString(), {
				method: 'GET',
				headers: {
					'Accept': 'application/json',
					'User-Agent': 'Mozilla/5.0 (compatible; Deployment-Info-Fetcher/1.0)'
				}
			});
			
			if (deploymentResponse.ok) {
				workerInfo = await deploymentResponse.json();
				console.log('Successfully fetched from deployment-info endpoint:', workerInfo);
			} else {
				console.log('Deployment-info endpoint not available, status:', deploymentResponse.status);
			}
		} catch (endpointError) {
			console.log('Could not fetch from deployment-info endpoint:', endpointError.message);
		}
		
		// If no deployment-info endpoint, try to extract from the HTML
		if (!workerInfo) {
			try {
				console.log('Fetching HTML from target URL:', targetUrl);
				const response = await fetch(targetUrl, {
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
				
				// Try to find the constants in the HTML content
				// Look for constants in script tags
				let buildTimeMatch = html.match(/__BUILD_TIME__\s*=\s*['"]([^'"]+)['"]/);
				let gitBranchMatch = html.match(/__GIT_BRANCH__\s*=\s*['"]([^'"]+)['"]/);
				let gitCommitMatch = html.match(/__GIT_COMMIT__\s*=\s*['"]([^'"]+)['"]/);
				
				// Look for constants in the footer text
				if (!gitBranchMatch) {
					gitBranchMatch = html.match(/Branch:\s*([^\s|]+)/);
				}
				if (!gitCommitMatch) {
					gitCommitMatch = html.match(/Commit:\s*([^\s|]+)/);
				}
				
				// Look for build time in the footer "Built:" text
				if (!buildTimeMatch) {
					const builtMatch = html.match(/Built:\s*([^<]+)/);
					if (builtMatch) {
						try {
							const builtDate = new Date(builtMatch[1].trim());
							if (!isNaN(builtDate.getTime())) {
								buildTimeMatch = [null, builtDate.toISOString()];
							}
						} catch (e) {
							console.warn('Could not parse built date:', builtMatch[1]);
						}
					}
				}
				
				workerInfo = {
					buildTime: buildTimeMatch ? buildTimeMatch[1] : null,
					gitBranch: gitBranchMatch ? gitBranchMatch[1] : null,
					gitCommit: gitCommitMatch ? gitCommitMatch[1] : null,
					lastUpdated: null
				};
				
				console.log('Extracted from HTML:', {
					buildTime: buildTimeMatch ? buildTimeMatch[1] : null,
					gitBranch: gitBranchMatch ? gitBranchMatch[1] : null,
					gitCommit: gitCommitMatch ? gitCommitMatch[1] : null
				});
				
			} catch (htmlError) {
				console.log('Could not parse HTML:', htmlError.message);
			}
		}
		
		// If we found build time, use it as the last updated time
		if (workerInfo && workerInfo.buildTime) {
			try {
				workerInfo.lastUpdated = new Date(workerInfo.buildTime).toISOString();
			} catch (e) {
				console.warn('Could not parse build time:', workerInfo.buildTime);
			}
		}
		
		// If we still don't have worker info, create a fallback
		if (!workerInfo) {
			workerInfo = {
				buildTime: null,
				gitBranch: null,
				gitCommit: null,
				lastUpdated: null,
				note: 'Worker info not available - could not fetch from target worker'
			};
		}
		
		// Log what we found for debugging
		console.log('Worker info extracted:', {
			url: targetUrl,
			buildTime: workerInfo.buildTime,
			gitBranch: workerInfo.gitBranch,
			gitCommit: workerInfo.gitCommit,
			lastUpdated: workerInfo.lastUpdated,
			note: workerInfo.note
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