/**
 * @fileoverview Capabilities API endpoint for genproj feature
 * @description Serves capability definitions to the frontend
 */

import { json } from '@sveltejs/kit';
import { capabilities } from '$lib/config/capabilities.js';
import { withErrorHandling } from '$lib/utils/genproj-errors.js';
import { logger } from '$lib/utils/logging.js';

/**
 * GET /projects/genproj/api/capabilities
 * Returns all available project capabilities
 */
export const GET = withErrorHandling(async ({ url, request }) => {
	try {
		// Return capabilities with additional metadata
		const response = {
			capabilities,
			metadata: {
				total: capabilities.length,
				categories: [...new Set(capabilities.map((c) => c.category))],
				timestamp: new Date().toISOString()
			}
		};

		return json(response);
	} catch (error) {
		logger.error('Capabilities API error', { error: error.message });
		throw error;
	}
});

/**
 * POST /projects/genproj/api/capabilities
 * Validates capability selection and returns validation results
 */
export const POST = withErrorHandling(async ({ request }) => {
	try {
		const body = await request.json();
		const { selectedCapabilities, configuration } = body;

		// Validate selected capabilities
		if (!Array.isArray(selectedCapabilities)) {
			return json({ error: 'Selected capabilities must be an array' }, { status: 400 });
		}

		if (selectedCapabilities.length === 0) {
			return json({ error: 'At least one capability must be selected' }, { status: 400 });
		}

		// Check for valid capability IDs
		const validCapabilityIds = new Set(capabilities.map((c) => c.id));
		const invalidCapabilities = selectedCapabilities.filter((id) => !validCapabilityIds.has(id));

		if (invalidCapabilities.length > 0) {
			return json(
				{
					error: 'Invalid capability IDs',
					invalidCapabilities
				},
				{ status: 400 }
			);
		}

		// Check for duplicates
		const uniqueCapabilities = new Set(selectedCapabilities);
		if (uniqueCapabilities.size !== selectedCapabilities.length) {
			return json({ error: 'Duplicate capabilities are not allowed' }, { status: 400 });
		}

		// Validate dependencies and conflicts
		const validation = validateCapabilitySelection(selectedCapabilities);

		if (!validation.valid) {
			return json(
				{
					error: 'Capability validation failed',
					missing: validation.missing,
					conflicts: validation.conflicts
				},
				{ status: 400 }
			);
		}

		// Validate configuration if provided
		if (configuration) {
			const configValidation = validateCapabilityConfiguration(selectedCapabilities, configuration);
			if (!configValidation.valid) {
				return json(
					{
						error: 'Configuration validation failed',
						details: configValidation.errors
					},
					{ status: 400 }
				);
			}
		}

		// Get required authentication services
		const requiredAuth = getRequiredAuthServices(selectedCapabilities);

		const response = {
			valid: true,
			selectedCapabilities,
			requiredAuth,
			validation: {
				dependencies: validation.missing,
				conflicts: validation.conflicts
			}
		};

		return json(response);
	} catch (error) {
		logger.error('Capability validation error', { error: error.message });
		throw error;
	}
});

/**
 * Validate capability selection for dependencies and conflicts
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {Object} Validation result
 */
function validateCapabilitySelection(selectedCapabilities) {
	const missing = [];
	const conflicts = [];

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((cap) => cap.id === capabilityId);
		if (!capability) continue;

		// Check dependencies
		for (const depId of capability.dependencies) {
			if (!selectedCapabilities.includes(depId)) {
				missing.push({
					capability: capabilityId,
					dependency: depId,
					dependencyName: capabilities.find((c) => c.id === depId)?.name || depId
				});
			}
		}

		// Check conflicts
		for (const conflictId of capability.conflicts) {
			if (selectedCapabilities.includes(conflictId)) {
				conflicts.push({
					capability: capabilityId,
					conflict: conflictId,
					conflictName: capabilities.find((c) => c.id === conflictId)?.name || conflictId
				});
			}
		}
	}

	return {
		missing,
		conflicts,
		valid: missing.length === 0 && conflicts.length === 0
	};
}

/**
 * Validate configuration field against schema rules
 * @param {string} capabilityId - Capability ID
 * @param {string} field - Field name
 * @param {*} value - Field value
 * @param {Object} rules - Validation rules
 * @returns {string[]} Array of error messages
 */
function validateField(capabilityId, field, value, rules) {
	const errors = [];

	if (rules.required && (value === undefined || value === null || value === '')) {
		errors.push(`${capabilityId}.${field} is required`);
		return errors;
	}

	if (value !== undefined && value !== null) {
		if (rules.type && typeof value !== rules.type) {
			errors.push(`${capabilityId}.${field} must be a ${rules.type}`);
		}

		if (rules.enum && !rules.enum.includes(value)) {
			errors.push(`${capabilityId}.${field} must be one of: ${rules.enum.join(', ')}`);
		}
	}

	return errors;
}

/**
 * Validate capability configuration
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @param {Object} configuration - Capability configuration
 * @returns {Object} Validation result
 */
function validateCapabilityConfiguration(selectedCapabilities, configuration) {
	const errors = [];

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((cap) => cap.id === capabilityId);
		if (!capability) continue;

		const capabilityConfig = configuration[capabilityId];
		if (capabilityConfig === undefined) continue;

		// Validate configuration against schema
		const schemaProperties = capability.configurationSchema?.properties;
		if (schemaProperties) {
			for (const [field, rules] of Object.entries(schemaProperties)) {
				const value = capabilityConfig[field];
				const fieldErrors = validateField(capabilityId, field, value, rules);
				errors.push(...fieldErrors);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Get required authentication services for selected capabilities
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {string[]} Required authentication service IDs
 */
function getRequiredAuthServices(selectedCapabilities) {
	const required = new Set();

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((cap) => cap.id === capabilityId);
		if (capability) {
			for (const service of capability.requiresAuth) {
				required.add(service);
			}
		}
	}

	return Array.from(required);
}
