/**
 * @fileoverview GitHub OAuth initiation endpoint
 * @description Handles GitHub OAuth flow initiation for project generation
 */

import { redirect } from '@sveltejs/kit';
import { generateGitHubAuthUrl, generateAuthState } from '$lib/utils/auth-helpers.js';

// Try to import environment variables, with fallbacks for build time
let GITHUB_CLIENT_ID;
try {
	const env = await import('$env/static/private');
	GITHUB_CLIENT_ID = env.GITHUB_CLIENT_ID;
} catch (error) {
	console.warn(
		'[GITHUB_AUTH] Environment variables not available at build time, using placeholder',
		error instanceof Error ? error.message : String(error)
	);
	GITHUB_CLIENT_ID = process.env?.GITHUB_CLIENT_ID || 'placeholder';
}

const logPrefix = '[GITHUB_AUTH]';

/**
 * GET handler for GitHub OAuth initiation
 * @param {Object} params - Request parameters
 * @param {Object} params.request - Request object
 * @param {Object} params.platform - Platform object with env
 * @returns {Response} Redirect to GitHub OAuth or error
 */
export async function GET({ request, platform }) {
	try {
		const url = new URL(request.url);
		const stateParam = url.searchParams.get('state');

		// Get user selections from query params to preserve through OAuth flow
		const selectedParam = url.searchParams.get('selected');
		const projectNameParam = url.searchParams.get('projectName');
		const repositoryUrlParam = url.searchParams.get('repositoryUrl');

		// Generate state if not provided
		const state = stateParam || generateAuthState();

		if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID === 'placeholder') {
			console.error(`${logPrefix} GitHub client ID not configured`);

			// In development, return a helpful HTML error page instead of JSON
			const isDev = process.env.NODE_ENV === 'development';
			const errorMessage = isDev
				? 'GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables. For development, you can create a GitHub OAuth app at https://github.com/settings/developers'
				: 'GitHub OAuth not configured';

			if (isDev) {
				return new Response(
					`<!DOCTYPE html>
<html>
<head>
	<title>GitHub OAuth Not Configured</title>
	<style>
		body { font-family: system-ui, sans-serif; padding: 2rem; background: #1a1a1a; color: #e0e0e0; }
		.container { max-width: 600px; margin: 0 auto; }
		.error { background: #7c2d12; border: 1px solid #ea580c; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
		.code { background: #27272a; padding: 0.5rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.9em; margin: 0.5rem 0; }
		a { color: #3b82f6; }
	</style>
</head>
<body>
	<div class="container">
		<h1>GitHub OAuth Configuration Required</h1>
		<div class="error">
			<p><strong>Error:</strong> ${errorMessage}</p>
		</div>
		<p>To configure GitHub OAuth:</p>
		<ol>
			<li>Create a GitHub OAuth App at <a href="https://github.com/settings/developers" target="_blank">https://github.com/settings/developers</a></li>
			<li>Set the Authorization callback URL to: <span class="code">${url.origin}/projects/genproj/api/auth/github/callback</span></li>
			<li>Set environment variables:
				<ul>
					<li><span class="code">GITHUB_CLIENT_ID</span> - Your GitHub OAuth app Client ID</li>
					<li><span class="code">GITHUB_CLIENT_SECRET</span> - Your GitHub OAuth app Client Secret</li>
				</ul>
			</li>
			<li>Restart your development server</li>
		</ol>
		<p><a href="/projects/genproj">← Back to Project Generator</a></p>
	</div>
</body>
</html>`,
					{
						status: 500,
						headers: { 'Content-Type': 'text/html' }
					}
				);
			}

			return new Response(JSON.stringify({ error: errorMessage }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Store state in KV for validation during callback
		// Also store user selections to preserve them through the OAuth flow
		if (platform?.env?.KV) {
			const stateKey = `github_oauth_state_${state}`;
			const stateData = {
				state: state,
				selected: selectedParam || null,
				projectName: projectNameParam || null,
				repositoryUrl: repositoryUrlParam || null
			};
			// Store state with 10 minute expiration
			const expiration = Math.floor(Date.now() / 1000) + 600;
			await platform.env.KV.put(stateKey, JSON.stringify(stateData), { expiration });
			console.log(`${logPrefix} Stored OAuth state with selections: ${state}`);
		}

		// Generate redirect URI
		const redirectUri = `${url.origin}/projects/genproj/api/auth/github/callback`;

		// Generate GitHub OAuth URL
		const authUrl = generateGitHubAuthUrl(GITHUB_CLIENT_ID, redirectUri, state, [
			'repo',
			'user:email'
		]);

		console.log(`${logPrefix} Redirecting to GitHub OAuth`);
		throw redirect(302, authUrl);
	} catch (error) {
		// SvelteKit redirect throws, so we need to catch it
		if (
			error.status === 302 ||
			error.status === 301 ||
			error.status === 307 ||
			error.status === 308
		) {
			throw error; // Re-throw redirects
		}

		console.error(`${logPrefix} GitHub OAuth initiation error:`, error);
		return new Response(
			JSON.stringify({ error: error.message || 'GitHub OAuth initiation failed' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
}
