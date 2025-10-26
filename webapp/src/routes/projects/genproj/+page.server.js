/**
 * genproj/+page.server.js
 *
 * Server-side logic for the main genproj page.
 * Handles initial data loading and server-side rendering.
 *
 * @fileoverview Server-side page logic for genproj main page
 */

import { error } from '@sveltejs/kit';
import { capabilities } from '$lib/config/capabilities.js';

/**
 * Loads initial data for the genproj page
 * @param {Object} params - Route parameters
 * @param {Object} url - URL object with searchParams
 * @param {Object} platform - Platform context (Cloudflare Workers)
 * @param {Object} cookies - Cookie context
 * @returns {Object} Page data
 */
export async function load({ params, url, platform, cookies }) {
	try {
		// Get query parameters
		const selectedParam = url.searchParams.get('selected');
		const validateParam = url.searchParams.get('validate') === 'true';

		const selectedCapabilities = selectedParam
			? selectedParam.split(',').filter((id) => id.trim())
			: [];

		// Check if user is authenticated
		const authCookie = cookies.get('auth');
		const isAuthenticated =
			authCookie && authCookie !== 'deleted' && platform.env.KV
				? await platform.env.KV.get(authCookie).then((token) => !!token)
				: false;

		// Prepare initial data
		const pageData = {
			capabilities: capabilities,
			selectedCapabilities,
			timestamp: new Date().toISOString(),
			isAuthenticated
		};

		// Add validation if requested
		if (validateParam && selectedCapabilities.length > 0) {
			// TODO: Add validation logic if needed
			pageData.validation = { valid: true, errors: [] };
		}

		return pageData;
	} catch (err) {
		console.error('❌ Error loading genproj page data:', err);
		throw error(500, 'Failed to load page data');
	}
}
