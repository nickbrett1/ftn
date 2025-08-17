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

		// Fetch real deployment data from Cloudflare API
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