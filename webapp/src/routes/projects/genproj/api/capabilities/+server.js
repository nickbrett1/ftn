/**
 * Capabilities API Endpoint
 *
 * Provides REST API for retrieving available project capabilities
 * and their definitions for the genproj tool.
 *
 * @fileoverview Server-side capabilities API endpoint
 */

import { json } from '@sveltejs/kit';
import {
	CAPABILITIES as capabilities,
	CAPABILITY_CATEGORIES as capabilityCategories
} from '$lib/utils/capabilities.js';
import {
	validateCapabilitySelection,
	getCapabilitySelectionSummary
} from '$lib/utils/capability-resolver.js';
import { RouteUtils } from '$lib/server/route-utils.js';

/**
 * GET /projects/genproj/api/capabilities
 *
 * Returns all available project capabilities with their definitions
 *
 * Query Parameters:
 * - selected: Comma-separated list of selected capability IDs (optional)
 * - validate: Boolean flag to validate selection (optional)
 * - summary: Boolean flag to include selection summary (optional)
 *
 * Response:
 * - capabilities: Array of capability definitions
 * - categories: Object of capability categories
 * - validation: Validation result (if validate=true)
 * - summary: Selection summary (if summary=true)
 */
export async function GET({ url, platform }) {
	try {
		// Parse query parameters
		const selectedParam = url.searchParams.get('selected');
		const validateParam = url.searchParams.get('validate') === 'true';
		const summaryParam = url.searchParams.get('summary') === 'true';

		const selectedCapabilities = selectedParam
			? selectedParam.split(',').filter((id) => id.trim())
			: [];

		// Prepare response data
		const responseData = {
			capabilities: Object.values(capabilities),
			categories: capabilityCategories,
			timestamp: new Date().toISOString()
		};

		// Add validation if requested
		if (validateParam && selectedCapabilities.length > 0) {
			responseData.validation = validateCapabilitySelection(selectedCapabilities);
		}

		// Add summary if requested
		if (summaryParam && selectedCapabilities.length > 0) {
			responseData.summary = getCapabilitySelectionSummary(selectedCapabilities);
		}

		return json(responseData, {
			headers: {
				'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error('❌ Error fetching capabilities:', error);
		return RouteUtils.handleError(error, 'Failed to fetch capabilities');
	}
}

/**
 * POST /projects/genproj/api/capabilities
 *
 * Validates a capability selection and returns validation results
 *
 * Request Body:
 * - selectedCapabilities: Array of selected capability IDs
 * - includeSummary: Boolean flag to include selection summary (optional)
 *
 * Response:
 * - validation: Validation result
 * - summary: Selection summary (if includeSummary=true)
 */
export async function POST({ request, platform }) {
	try {
		const body = await request.json();
		const { selectedCapabilities = [], includeSummary = false } = body;

		if (!Array.isArray(selectedCapabilities)) {
			return json(
				{
					error: 'Invalid request',
					message: 'selectedCapabilities must be an array'
				},
				{ status: 400 }
			);
		}

		// Validate capability selection
		const validation = validateCapabilitySelection(selectedCapabilities);

		const responseData = {
			validation,
			timestamp: new Date().toISOString()
		};

		// Add summary if requested
		if (includeSummary) {
			responseData.summary = getCapabilitySelectionSummary(selectedCapabilities);
		}

		return json(responseData);
	} catch (error) {
		console.error('❌ Error validating capabilities:', error);
		return RouteUtils.handleError(error, 'Failed to validate capabilities');
	}
}
