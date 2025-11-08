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
		body { font-family: system-ui, sans-serif; padding: 2rem; background: #2d3748; color: #e2e8f0; }
		.container { max-width: 600px; margin: 0 auto; background: #1a202c; padding: 2rem; border-radius: 0.5rem; border: 1px solid #4a5568; }
		h1 { color: #f6e05e; margin-bottom: 1rem; }
		.error { background: #c53030; border: 1px solid #e53e3e; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; color: #fff; }
		.code { background: #2d3748; padding: 0.5rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.9em; margin: 0.5rem 0; color: #a0aec0; }
		a { color: #63b3ed; text-decoration: underline; }
		ul { list-style-type: disc; margin-left: 1.5rem; }
		li { margin-bottom: 0.5rem; }
	</style>
</head>
<body>
	<div class="container">
		<h1>GitHub OAuth Configuration Required</h1>
		<div class="error">
			<p><strong>Error:</strong> ${errorMessage}</p>
			<p>This usually means the <code>GITHUB_CLIENT_ID</code> or <code>GITHUB_CLIENT_SECRET</code> environment variables are not set correctly.</p>
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
