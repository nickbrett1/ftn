/**
 * genproj/+page.server.js
 *
 * Server-side logic for the main genproj page.
 * Handles initial data loading and server-side rendering.
 *
 * @fileoverview Server-side page logic for genproj main page
 */

import { error } from '@sveltejs/kit';
import {
	CAPABILITIES as capabilities,
	CAPABILITY_CATEGORIES as capabilityCategories
} from '$lib/utils/capabilities.js';
import { validateCapabilitySelection } from '$lib/utils/capability-resolver.js';

/**
 * Loads initial data for the genproj page
 * @param {Object} params - Route parameters
 * @param {Object} url - URL object with searchParams
 * @param {Object} platform - Platform context (Cloudflare Workers)
 * @returns {Object} Page data
 */
export async function load({ params, url, platform }) {
	try {
		console.log('🔍 Loading genproj page data');
		console.log('📊 Capabilities count:', Object.keys(capabilities).length);
		console.log('📊 Categories count:', Object.keys(capabilityCategories).length);

		// Get query parameters
		const selectedParam = url.searchParams.get('selected');
		const validateParam = url.searchParams.get('validate') === 'true';

		const selectedCapabilities = selectedParam
			? selectedParam.split(',').filter((id) => id.trim())
			: [];

		// Prepare initial data
		const pageData = {
			capabilities: Object.values(capabilities),
			categories: capabilityCategories,
			selectedCapabilities,
			timestamp: new Date().toISOString()
		};

		// Add validation if requested
		if (validateParam && selectedCapabilities.length > 0) {
			pageData.validation = validateCapabilitySelection(selectedCapabilities);
		}

		console.log(`✅ Loaded genproj page data: ${pageData.capabilities.length} capabilities`);

		return pageData;
	} catch (err) {
		console.error('❌ Error loading genproj page data:', err);
		throw error(500, 'Failed to load page data');
	}
}
