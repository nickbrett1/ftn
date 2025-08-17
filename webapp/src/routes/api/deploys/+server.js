import { json, error } from '@sveltejs/kit';

export async function GET({ request, env }) {
	try {
		// Temporarily removed auth check for testing

		// Get Cloudflare account ID and API token from environment
		const accountId = env.CLOUDFLARE_ACCOUNT_ID;
		const apiToken = env.CLOUDFLARE_DEPLOYS_TOKEN;
		
		if (!accountId || !apiToken) {
			throw error(500, 'Cloudflare credentials not available. This is expected in development. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_DEPLOYS_TOKEN environment variables for production.');
		}

		// Fetch real deployment data from Cloudflare API
		const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn/versions`, {
			headers: {
				'Authorization': `Bearer ${apiToken}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw error(500, `Cloudflare API error: ${response.status}`);
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
		if (err.status) {
			throw err; // Re-throw SvelteKit errors
		}
		throw error(500, err.message);
	}
}