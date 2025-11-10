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
export async function load({ url, platform, cookies }) {
	try {
		// Get query parameters
		const selectedParameter = url.searchParams.get('selected');
		const projectNameParameter = url.searchParams.get('projectName');
		const repositoryUrlParameter = url.searchParams.get('repositoryUrl');
		const validateParameter = url.searchParams.get('validate') === 'true';
		const errorParameter = url.searchParams.get('error');
		const authParameter = url.searchParams.get('auth');

		const selectedCapabilities = selectedParameter
			? selectedParameter.split(',').filter((id) => id.trim())
			: [];

		// Check if user is authenticated
		const authCookie = cookies.get('auth');
		const isAuthenticated =
			authCookie && authCookie !== 'deleted' && platform.env.KV
				? await platform.env.KV.get(authCookie).then((token) => !!token)
				: false;

		// Prepare initial data
		const pageData = {
			// The capabilities object contains functions which are not serializable and cannot be
			// sent to the client. We create a deep clone that is serializable by converting to
			// and from JSON, which safely strips out any functions from the object.
			// `structuredClone` is not suitable here as it would throw an error.
			capabilities: JSON.parse(JSON.stringify(capabilities)),
			selectedCapabilities,
			projectName: projectNameParameter || '',
			repositoryUrl: repositoryUrlParameter || '',
			timestamp: new Date().toISOString(),
			isAuthenticated,
			error: errorParameter || null,
			authResult: authParameter || null
		};

		// Add validation if requested
		if (validateParameter && selectedCapabilities.length > 0) {
			const findCapability = (id) => capabilities.find((cap) => cap.id === id);
			const errors = selectedCapabilities
				.filter((id) => !findCapability(id))
				.map((id) => `Unknown capability: ${id}`);
			const requiredAuth = [
				...new Set(selectedCapabilities.flatMap((id) => findCapability(id)?.requiresAuth ?? []))
			];

			pageData.validation = {
				valid: errors.length === 0,
				errors,
				warnings: [],
				requiredAuth
			};
		}

		return pageData;
	} catch (error_) {
		console.error('❌ Error loading genproj page data:', error_);
		throw error(500, 'Failed to load page data');
	}
}
