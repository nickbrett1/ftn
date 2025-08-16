import { json } from '@sveltejs/kit';

export async function GET() {
	// Get Cloudflare account ID and API token from environment
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;
	
	if (!accountId || !apiToken) {
		throw new Error('Cloudflare credentials not available. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.');
	}

	// Fetch real deployment data from Cloudflare API
	const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/ftn/versions`, {
		headers: {
			'Authorization': `Bearer ${apiToken}`,
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error(`Cloudflare API error: ${response.status}`);
	}

	const data = await response.json();
	
	if (!data.success) {
		throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message || 'Unknown error'}`);
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
}