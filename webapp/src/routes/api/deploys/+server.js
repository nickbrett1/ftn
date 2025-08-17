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

		// Check if the 'ftn' Worker exists
		const ftnWorker = workersList.result.find(worker => worker.id === 'ftn');
		if (!ftnWorker) {
			// Worker doesn't exist, return a helpful message
			const availableWorkers = workersList.result.map(w => w.id).join(', ');
			throw error(404, `Worker 'ftn' not found on your Cloudflare account. Available Workers: ${availableWorkers || 'none'}. You may need to deploy the Worker first.`);
		}

		// Now fetch the specific Worker's versions
		const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn/versions`;
		console.log('Deploys API: Making request to:', apiUrl);
		
		const response = await fetch(apiUrl, {
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		console.log('Deploys API: Response status:', response.status, response.statusText);

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Deploys API: Response error:', errorText);
			
			// Provide more helpful error messages for common cases
			if (response.status === 404) {
				throw error(404, `Worker 'ftn' not found. This usually means the Worker hasn't been deployed yet. Please deploy the Worker first using 'npm run deploy-preview' or 'npm run deploy'.`);
			}
			
			throw error(500, `Cloudflare API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
		}

		const data = await response.json();
		
		if (!data.success) {
			throw error(500, `Cloudflare API error: ${data.errors?.[0]?.message || 'Unknown error'}`);
		}

		// Transform Cloudflare data into our format
		const deployments = data.result.map(version => ({
			name: `Worker Version ${version.id}`,
			status: 'active',
			environment: 'production',
			url: 'https://ftn.nick-brett1.workers.dev',
			version: version.id,
			deployedAt: version.created_on
		}));

		// Add preview environment
		deployments.unshift({
			name: 'Preview Environment',
			status: 'active',
			environment: 'preview',
			url: 'https://ftn-preview.nick-brett1.workers.dev',
			version: 'latest',
			deployedAt: new Date().toISOString()
		});

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