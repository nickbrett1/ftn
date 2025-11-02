/**
 * @fileoverview CircleCI API token authentication endpoint
 * @description Handles CircleCI API token validation and storage
 */

import { json } from '@sveltejs/kit';
import {
	generateCircleCIAuthUrl,
	generateAuthState,
	validateCircleCIToken
} from '$lib/utils/auth-helpers.js';
import { genprojAuth } from '$lib/server/genproj-auth.js';
import { getCurrentUser } from '$lib/server/auth-helpers.js';

const logPrefix = '[CIRCLECI_AUTH]';

/**
 * GET handler for CircleCI auth initiation
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

		// Generate CircleCI auth URL (token creation page)
		const redirectUri = `${url.origin}/projects/genproj/api/auth/circleci/callback`;
		const authUrl = generateCircleCIAuthUrl(redirectUri, state);

		return json({
			authUrl,
			state,
			instructions:
				'Create a CircleCI API token from your account settings and use it to authenticate.'
		});
	} catch (error) {
		console.error(`${logPrefix} CircleCI auth initiation error:`, error);
		return json({ error: error.message || 'CircleCI auth initiation failed' }, { status: 500 });
	}
}

/**
 * POST handler for CircleCI token validation
 * Validates and stores CircleCI API token
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

		// Validate token with CircleCI API
		const validationResult = await validateCircleCIToken(token);

		if (!validationResult.success) {
			console.error(`${logPrefix} Token validation failed: ${validationResult.error}`);
			return json({ error: validationResult.error || 'Invalid CircleCI token' }, { status: 401 });
		}

		const { authState } = validationResult;

		// Get current user
		const currentUser = await getCurrentUser(request, platform);

		if (!currentUser) {
			return json({ error: 'Google authentication required' }, { status: 401 });
		}

		// Initialize auth manager with platform
		await genprojAuth.initialize(currentUser, platform);

		// Update CircleCI authentication
		const updated = await genprojAuth.updateCircleCIAuth({
			token: authState.token,
			expiresAt: authState.expiresAt
		});

		if (!updated) {
			return json({ error: 'Failed to update CircleCI authentication' }, { status: 500 });
		}

		console.log(`${logPrefix} CircleCI authentication successful for user: ${currentUser.email}`);

		return json({
			success: true,
			message: 'CircleCI authentication successful',
			user: authState.metadata
		});
	} catch (error) {
		console.error(`${logPrefix} CircleCI auth error:`, error);
		return json({ error: error.message || 'CircleCI authentication failed' }, { status: 500 });
	}
}
