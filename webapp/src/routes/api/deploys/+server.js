import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ request }) {
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
			deployments.push({
				name: 'Preview Environment',
				status: 'active',
				environment: 'preview',
				url: 'https://ftn-preview.nick-brett1.workers.dev',
				version: 'latest',
				deployedAt: new Date().toISOString()
			});
		}
		
		// Add production environment if it exists
		if (productionWorker) {
			deployments.push({
				name: 'Production Environment',
				status: 'active',
				environment: 'production',
				url: 'https://ftn-production.nick-brett1.workers.dev',
				version: 'latest',
				deployedAt: new Date().toISOString()
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
								version: version.id,
								deployedAt: version.created_on
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