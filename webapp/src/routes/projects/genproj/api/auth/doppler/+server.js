/**
 * @fileoverview Doppler API token authentication endpoint
 * @description Handles Doppler API token validation and storage
 */

import { json } from '@sveltejs/kit';
import {
	generateDopplerAuthUrl,
	generateAuthState,
	validateDopplerToken
} from '$lib/utils/auth-helpers.js';
import { genprojAuth } from '$lib/server/genproj-auth.js';
import { getCurrentUser } from '$lib/server/auth-helpers.js';

const logPrefix = '[DOPPLER_AUTH]';

/**
 * GET handler for Doppler auth initiation
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

		// Generate Doppler auth URL (token creation page)
		const redirectUri = `${url.origin}/projects/genproj/api/auth/doppler/callback`;
		const authUrl = generateDopplerAuthUrl(redirectUri, state);

		return json({
			authUrl,
			state,
			instructions: 'Create a Doppler service token from your dashboard and use it to authenticate.'
		});
	} catch (error) {
		console.error(`${logPrefix} Doppler auth initiation error:`, error);
		return json({ error: error.message || 'Doppler auth initiation failed' }, { status: 500 });
	}
}

/**
 * POST handler for Doppler token validation
 * Validates and stores Doppler API token
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

		// Validate token with Doppler API
		const validationResult = await validateDopplerToken(token);

		if (!validationResult.success) {
			console.error(`${logPrefix} Token validation failed: ${validationResult.error}`);
			return json({ error: validationResult.error || 'Invalid Doppler token' }, { status: 401 });
		}

		const { authState } = validationResult;

		// Get current user
		const currentUser = await getCurrentUser(request, platform);

		if (!currentUser) {
			return json({ error: 'Google authentication required' }, { status: 401 });
		}

		// Initialize auth manager with platform
		if (!genprojAuth.kv) {
			genprojAuth.initializePlatform(platform);
		}
		await genprojAuth.initialize(currentUser, platform);

		// Update Doppler authentication
		const updated = await genprojAuth.updateDopplerAuth({
			token: authState.token,
			expiresAt: authState.expiresAt
		});

		if (!updated) {
			return json({ error: 'Failed to update Doppler authentication' }, { status: 500 });
		}

		console.log(`${logPrefix} Doppler authentication successful for user: ${currentUser.email}`);

		return json({
			success: true,
			message: 'Doppler authentication successful',
			user: authState.metadata
		});
	} catch (error) {
		console.error(`${logPrefix} Doppler auth error:`, error);
		return json({ error: error.message || 'Doppler authentication failed' }, { status: 500 });
	}
}
