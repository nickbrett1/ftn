import { json, error } from '@sveltejs/kit';

export async function GET({ request, url }) {
	try {
		// Get the target URL from query parameters
		const targetUrl = url.searchParams.get('url');
		
		if (!targetUrl) {
			throw error(400, 'URL query parameter is required');
		}

		// We need to fetch the deployment info from the target worker
		// Try to get it from their deployment-info endpoint
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
		
		// If we found worker info, process it
		if (workerInfo) {
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
		}
		
		// If no deployment-info endpoint available, return error
		throw error(404, `Deployment info not available for ${targetUrl}. The worker does not have a /api/deployment-info endpoint.`);
		
	} catch (err) {
		console.error('Worker info API error:', err);
		
		if (err.status) {
			throw err;
		}
		
		throw error(500, `Failed to fetch worker info: ${err.message}`);
	}
}