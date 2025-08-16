import { json } from '@sveltejs/kit';

export async function GET() {
	// This would typically fetch from Cloudflare's API or your deployment tracking system
	// For now, I'll return mock data that you can replace with real API calls
	
	const deployments = [
		{
			name: 'Production',
			status: 'active',
			environment: 'production',
			url: 'https://ftn.nick-brett1.workers.dev',
			adminUrl: 'https://dash.cloudflare.com/workers',
			version: 'latest',
			deployedAt: new Date().toISOString()
		},
		{
			name: 'Preview Environment',
			status: 'active',
			environment: 'preview',
			url: 'https://ftn-preview.nick-brett1.workers.dev',
			adminUrl: 'https://dash.cloudflare.com/workers',
			version: 'latest',
			deployedAt: new Date().toISOString()
		},
		{
			name: 'Mobile Navigation Fixes',
			status: 'active',
			environment: 'preview',
			branch: 'cursor/fix-mobile-menu-shortcut-navigation-9b86',
			url: 'https://ftn-preview.nick-brett1.workers.dev',
			adminUrl: 'https://dash.cloudflare.com/workers',
			version: 'latest',
			deployedAt: new Date().toISOString()
		}
	];

	return json(deployments);
}