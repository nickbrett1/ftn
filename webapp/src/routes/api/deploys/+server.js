import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ request }) {
	// Helper function to format dates clearly
	function formatDate(dateString) {
		const date = new Date(dateString);
		const options = { 
			year: 'numeric', 
			month: 'long', 
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		};
		return date.toLocaleDateString('en-US', options);
	}

	try {
		// Temporarily removed auth check for testing

		// Get Cloudflare account ID and API token from environment
		const accountId = env.CLOUDFLARE_ACCOUNT_ID;
		const apiToken = env.CLOUDFLARE_DEPLOYS_TOKEN;
		
		console.log('Deploys API: Environment variables check:', {
			hasAccountId: !!accountId,
			hasApiToken: !!apiToken,
			accountIdLength: accountId?.length || 0,
			apiTokenLength: apiToken?.length || 0
		});
		
		if (!accountId || !apiToken) {
			const missingVars = [];
			if (!accountId) missingVars.push('CLOUDFLARE_ACCOUNT_ID');
			if (!apiToken) missingVars.push('CLOUDFLARE_DEPLOYS_TOKEN');
			
			throw error(500, `Missing Cloudflare environment variables: ${missingVars.join(', ')}. Please check your environment configuration.`);
		}

		// First, let's check what Workers exist on this account
		const listWorkersUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`;
		console.log('Deploys API: Checking available Workers at:', listWorkersUrl);
		
		const listResponse = await fetch(listWorkersUrl, {
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!listResponse.ok) {
			const errorText = await listResponse.text();
			console.error('Deploys API: Failed to list Workers:', errorText);
			throw error(500, `Failed to list Cloudflare Workers: ${listResponse.status} ${listResponse.statusText}. Response: ${errorText}`);
		}

		const workersList = await listResponse.json();
		console.log('Deploys API: Available Workers:', workersList);

		if (!workersList.success) {
			throw error(500, `Failed to list Workers: ${workersList.errors?.[0]?.message || 'Unknown error'}`);
		}

		// Look for our main Workers (ftn-preview and ftn-production)
		const previewWorker = workersList.result.find(worker => worker.id === 'ftn-preview');
		const productionWorker = workersList.result.find(worker => worker.id === 'ftn-production');
		
		if (!previewWorker && !productionWorker) {
			// Neither main Worker exists, return a helpful message
			const availableWorkers = workersList.result.map(w => w.id).join(', ');
			throw error(404, `Main Workers 'ftn-preview' and 'ftn-production' not found on your Cloudflare account. Available Workers: ${availableWorkers || 'none'}. You may need to deploy the Workers first.`);
		}

		// Build deployments list from available Workers
		const deployments = [];
		
		// Add preview environment if it exists
		if (previewWorker) {
			// Try to get the actual deployment time for preview
			let previewDeployedAt = previewWorker.created_on || new Date().toISOString();
			let previewVersion = 'latest';
			
			try {
				// Get deployment information for the preview worker
				const previewDeployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-preview/deployments`;
				console.log('Deploys API: Getting preview deployment info from:', previewDeployUrl);
				
				const previewDeployResponse = await fetch(previewDeployUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					}
				});

				if (previewDeployResponse.ok) {
					const previewDeployData = await previewDeployResponse.json();
					if (previewDeployData.result.length > 0) {
						// Use the most recent deployment time
						const latestDeployment = previewDeployData.result[0]; // Assuming sorted by most recent first
						previewDeployedAt = latestDeployment.created_on || previewDeployedAt;
						
						// Build comprehensive version info from deployment metadata
						let versionParts = ['preview'];
						
						if (latestDeployment.metadata) {
							if (latestDeployment.metadata.branch) {
								versionParts.push(latestDeployment.metadata.branch);
							}
							if (latestDeployment.metadata.git_commit) {
								versionParts.push(latestDeployment.metadata.git_commit.substring(0, 8));
							}
						}
						
						// Fallback to deployment ID if no metadata
						if (versionParts.length === 1) {
							versionParts.push(latestDeployment.id);
						}
						
						previewVersion = versionParts.join('-');
						
						console.log('Deploys API: Found preview deployment at:', previewDeployedAt, 'version:', previewVersion);
					}
				}
			} catch (error) {
				console.log('Could not fetch preview deployment info:', error.message);
				// Continue with created_on as fallback
			}
			
			deployments.push({
				name: 'Preview Environment',
				status: 'active',
				environment: 'preview',
				url: 'https://ftn-preview.nick-brett1.workers.dev',
				version: previewVersion,
				deployedAt: formatDate(previewDeployedAt)
			});
		}
		
		// Add production environment if it exists
		if (productionWorker) {
			// Try to get the actual deployment time for production
			let productionDeployedAt = productionWorker.created_on || new Date().toISOString();
			let productionVersion = 'latest';
			
			try {
				// Get deployment information for the production worker
				const productionDeployUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/deployments`;
				console.log('Deploys API: Getting production deployment info from:', productionDeployUrl);
				
				const productionDeployResponse = await fetch(productionDeployUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json`
					}
				});

				if (productionDeployResponse.ok) {
					const productionDeployData = await productionDeployResponse.json();
					if (productionDeployData.result.length > 0) {
						// Use the most recent deployment time
						const latestDeployment = productionDeployData.result[0]; // Assuming sorted by most recent first
						productionDeployedAt = latestDeployment.created_on || productionDeployedAt;
						
						// Build comprehensive version info from deployment metadata
						let versionParts = ['prod'];
						
						if (latestDeployment.metadata) {
							if (latestDeployment.metadata.branch) {
								versionParts.push(latestDeployment.metadata.branch);
							}
							if (latestDeployment.metadata.git_commit) {
								versionParts.push(latestDeployment.metadata.git_commit.substring(0, 8));
							}
						}
						
						// Fallback to deployment ID if no metadata
						if (versionParts.length === 1) {
							versionParts.push(latestDeployment.id);
						}
						
						productionVersion = versionParts.join('-');
						
						console.log('Deploys API: Found production deployment at:', productionDeployedAt, 'version:', productionVersion);
					}
				}
			} catch (error) {
				console.log('Could not fetch production deployment info:', error.message);
				// Continue with created_on as fallback
			}
			
			deployments.push({
				name: 'Production Environment',
				status: 'active',
				environment: 'production',
				url: 'https://ftn-production.nick-brett1.workers.dev',
				version: productionVersion,
				deployedAt: formatDate(productionDeployedAt)
			});
		}
		
		// If we have Workers, try to get version information for production
		if (productionWorker) {
			try {
				const productionApiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn-production/versions`;
				console.log('Deploys API: Making request to production:', productionApiUrl);
				
				const productionResponse = await fetch(productionApiUrl, {
					headers: {
						'Authorization': `Bearer ${apiToken}`,
						'Content-Type': 'application/json'
					}
				});

				if (productionResponse.ok) {
					const productionData = await productionResponse.json();
					if (productionData.success && productionData.result.length > 0) {
						// Add production versions
						productionData.result.forEach(version => {
							deployments.push({
								name: `Production Version ${version.id}`,
								status: 'active',
								environment: 'production',
								url: 'https://ftn-production.nick-brett1.workers.dev',
								version: `v${version.id}`,
								deployedAt: formatDate(version.created_on)
							});
						});
					}
				}
			} catch (error) {
				console.log('Could not fetch production versions:', error.message);
				// Continue without production versions
			}
		}

		return json(deployments);
	} catch (err) {
		console.error('Deploys API: Caught error:', err);
		
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		
		// Give more specific error information
		const errorMessage = err.message || 'Unknown error occurred';
		console.error('Deploys API: Error details:', {
			message: errorMessage,
			stack: err.stack,
			name: err.name
		});
		
		throw error(500, `Deploys API error: ${errorMessage}`);
	}
}