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
		const projectNameParam = url.searchParams.get('projectName');
		const repositoryUrlParam = url.searchParams.get('repositoryUrl');
		const validateParam = url.searchParams.get('validate') === 'true';
		const errorParam = url.searchParams.get('error');
		const authParam = url.searchParams.get('auth');

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
			projectName: projectNameParam || '',
			repositoryUrl: repositoryUrlParam || '',
			timestamp: new Date().toISOString(),
			isAuthenticated,
			error: errorParam || null,
			authResult: authParam || null
		};

		// Add validation if requested
		if (validateParam && selectedCapabilities.length > 0) {
			const findCapability = (id) => capabilities.find((cap) => cap.id === id);
			const errors = selectedCapabilities
				.filter((id) => !findCapability(id))
				.map((id) => `Unknown capability: ${id}`);
			const requiredAuth = Array.from(
				new Set(selectedCapabilities.flatMap((id) => findCapability(id)?.requiresAuth ?? []))
			);

			pageData.validation = {
				valid: errors.length === 0,
				errors,
				warnings: [],
				requiredAuth
			};
		}

		return pageData;
	} catch (err) {
		console.error('❌ Error loading genproj page data:', err);
		throw error(500, 'Failed to load page data');
	}
}
