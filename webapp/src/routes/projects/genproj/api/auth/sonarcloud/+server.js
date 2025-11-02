/**
 * @fileoverview SonarCloud API token authentication endpoint
 * @description Handles SonarCloud API token validation and storage
 */

import { json } from '@sveltejs/kit';
import {
	generateSonarCloudAuthUrl,
	generateAuthState,
	validateSonarCloudToken
} from '$lib/utils/auth-helpers.js';
import { genprojAuth } from '$lib/server/genproj-auth.js';
import { getCurrentUser } from '$lib/server/auth-helpers.js';

const logPrefix = '[SONARCLOUD_AUTH]';

/**
 * GET handler for SonarCloud auth initiation
 * Returns URL for user to create API token
 * @param {Object} params - Request parameters
 * @param {Object} params.request - Request object
 * @returns {Response} Auth URL or error
 */
export async function GET({ request }) {
	try {
		const url = new URL(request.url);
		const stateParam = url.searchParams.get('state');

		// Generate state if not provided
		const state = stateParam || generateAuthState();

		// Generate SonarCloud auth URL (token creation page)
		const redirectUri = `${url.origin}/projects/genproj/api/auth/sonarcloud/callback`;
		const authUrl = generateSonarCloudAuthUrl(redirectUri, state);

		return json({
			authUrl,
			state,
			instructions:
				'Create a SonarCloud user token from your account settings and use it to authenticate.'
		});
	} catch (error) {
		console.error(`${logPrefix} SonarCloud auth initiation error:`, error);
		return json({ error: error.message || 'SonarCloud auth initiation failed' }, { status: 500 });
	}
}

/**
 * POST handler for SonarCloud token validation
 * Validates and stores SonarCloud API token
 * @param {Object} params - Request parameters
 * @param {Object} params.request - Request object
 * @param {Object} params.platform - Platform object with env
 * @returns {Response} Success or error
 */
export async function POST({ request, platform }) {
	try {
		const body = await request.json();
		const { token } = body;

		if (!token) {
			return json({ error: 'Token is required' }, { status: 400 });
		}

		// Validate token with SonarCloud API
		const validationResult = await validateSonarCloudToken(token);

		if (!validationResult.success) {
			console.error(`${logPrefix} Token validation failed: ${validationResult.error}`);
			return json({ error: validationResult.error || 'Invalid SonarCloud token' }, { status: 401 });
		}

		const { authState } = validationResult;

		// Get current user
		const currentUser = await getCurrentUser(request, platform);

		if (!currentUser) {
			return json({ error: 'Google authentication required' }, { status: 401 });
		}

		// Initialize auth manager
		await genprojAuth.initialize(currentUser);

		// Update SonarCloud authentication
		const updated = await genprojAuth.updateSonarCloudAuth({
			token: authState.token,
			expiresAt: authState.expiresAt
		});

		if (!updated) {
			return json({ error: 'Failed to update SonarCloud authentication' }, { status: 500 });
		}

		console.log(`${logPrefix} SonarCloud authentication successful for user: ${currentUser.email}`);

		return json({
			success: true,
			message: 'SonarCloud authentication successful',
			user: authState.metadata
		});
	} catch (error) {
		console.error(`${logPrefix} SonarCloud auth error:`, error);
		return json({ error: error.message || 'SonarCloud authentication failed' }, { status: 500 });
	}
}
