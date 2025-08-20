import { json, error } from '@sveltejs/kit';

export async function GET({ request, url }) {
	try {
		// Get the target URL from query parameters
		const targetUrl = url.searchParams.get('url');
		
		if (!targetUrl) {
			throw error(400, 'URL query parameter is required');
		}

		// We need to fetch the deployment info from the target worker
		// Try to get it from their deployment-info endpoint first
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
		
		// If no deployment-info endpoint, try to extract from the footer text
		// This is a temporary solution until we deploy the proper endpoint
		if (!workerInfo) {
			try {
				console.log('Fetching HTML from target URL to extract footer info:', targetUrl);
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
				
				// Extract information from the footer text that's already visible
				// Look for the footer pattern: "Branch: {branch} | Commit: {commit} | Env: {env}"
				const footerMatch = html.match(/Branch:\s*([^\s|]+)\s*\|\s*Commit:\s*([^\s|]+)/);
				
				// Look for build time in the "Built:" text
				const builtMatch = html.match(/Built:\s*([^<]+)/);
				
				let buildTime = null;
				if (builtMatch) {
					try {
						const builtDate = new Date(builtMatch[1].trim());
						if (!isNaN(builtDate.getTime())) {
							buildTime = builtDate.toISOString();
						}
					} catch (e) {
						console.warn('Could not parse built date:', builtMatch[1]);
					}
				}
				
				if (footerMatch || buildTime) {
					workerInfo = {
						buildTime: buildTime,
						gitBranch: footerMatch ? footerMatch[1] : null,
						gitCommit: footerMatch ? footerMatch[2] : null,
						lastUpdated: buildTime,
						note: 'Extracted from footer text (temporary solution)'
					};
					
					console.log('Extracted from footer:', {
						buildTime: buildTime,
						gitBranch: footerMatch ? footerMatch[1] : null,
						gitCommit: footerMatch ? footerMatch[2] : null
					});
				}
				
			} catch (htmlError) {
				console.log('Could not parse HTML:', htmlError.message);
			}
		}
		
		// If we found worker info, process it
		if (workerInfo) {
			// If we found build time, use it as the last updated time
			if (workerInfo.buildTime && !workerInfo.lastUpdated) {
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
				lastUpdated: workerInfo.lastUpdated,
				note: workerInfo.note
			});
			
			return json(workerInfo);
		}
		
		// If no information available at all, return error
		throw error(404, `Deployment info not available for ${targetUrl}. The worker does not have a /api/deployment-info endpoint and footer information could not be extracted.`);
		
	} catch (err) {
		console.error('Worker info API error:', err);
		
		if (err.status) {
			throw err;
		}
		
		throw error(500, `Failed to fetch worker info: ${err.message}`);
	}
}