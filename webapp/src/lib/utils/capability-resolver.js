/**
 * Capability Dependency Resolver
 *
 * Handles capability dependency resolution, conflict detection,
 * and validation for the genproj tool.
 *
 * @fileoverview Universal capability dependency resolution utilities
 */

import { CAPABILITIES as capabilities } from './capabilities.js';

/**
 * @typedef {Object} DependencyResolution
 * @property {string[]} resolvedCapabilities - All capabilities including dependencies
 * @property {string[]} addedDependencies - Newly added dependencies
 * @property {string[]} conflicts - Conflicting capabilities
 * @property {boolean} isValid - Whether the resolution is valid
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the capability selection is valid
 * @property {string[]} errors - List of validation errors
 * @property {string[]} warnings - List of validation warnings
 */

/**
 * Resolves dependencies for a set of selected capabilities
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @returns {DependencyResolution} Resolution result with dependencies and conflicts
 */
export function resolveDependencies(selectedCapabilities) {
	const resolvedCapabilities = new Set(selectedCapabilities);
	const addedDependencies = [];
	const conflicts = [];
	
	// Process each selected capability to resolve dependencies
	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities[capabilityId];
		if (!capability) continue;
		
		// Add dependencies
		for (const depId of capability.dependencies) {
			if (!resolvedCapabilities.has(depId)) {
				resolvedCapabilities.add(depId);
				addedDependencies.push(depId);
			}
		}
		
		// Check for conflicts
		for (const conflictId of capability.conflicts) {
			if (resolvedCapabilities.has(conflictId)) {
				conflicts.push(conflictId);
			}
		}
	}
	
	return {
		resolvedCapabilities: Array.from(resolvedCapabilities),
		addedDependencies,
		conflicts,
		isValid: conflicts.length === 0
	};
}

/**
 * Validates a capability selection for completeness and consistency
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @returns {ValidationResult} Validation result with errors and warnings
 */
export function validateCapabilitySelection(selectedCapabilities) {
	const errors = [];
	const warnings = [];
	
	// Check if all capabilities exist
	validateCapabilityExistence(selectedCapabilities, errors);
	
	// Resolve dependencies and check for conflicts
	const resolution = resolveDependencies(selectedCapabilities);
	validateConflicts(resolution, errors);
	
	// Check for missing dependencies
	validateDependencies(selectedCapabilities, resolution, warnings);
	
	// Check for authentication requirements
	validateAuthRequirements(selectedCapabilities, warnings);
	
	return {
		isValid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Validates that all selected capabilities exist
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @param {string[]} errors - Array to add errors to
 */
function validateCapabilityExistence(selectedCapabilities, errors) {
	for (const capabilityId of selectedCapabilities) {
		if (!capabilities[capabilityId]) {
			errors.push(`Unknown capability: ${capabilityId}`);
		}
	}
}

/**
 * Validates conflicts in capability selection
 * @param {DependencyResolution} resolution - Dependency resolution result
 * @param {string[]} errors - Array to add errors to
 */
function validateConflicts(resolution, errors) {
	if (!resolution.isValid) {
		for (const conflictId of resolution.conflicts) {
			const capability = capabilities[conflictId];
			errors.push(`Conflicting capability: ${capability?.name || conflictId}`);
		}
	}
}

/**
 * Validates dependencies for selected capabilities
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @param {DependencyResolution} resolution - Dependency resolution result
 * @param {string[]} warnings - Array to add warnings to
 */
function validateDependencies(selectedCapabilities, resolution, warnings) {
	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities[capabilityId];
		if (!capability) continue;
		
		for (const depId of capability.dependencies) {
			if (!selectedCapabilities.includes(depId) && !resolution.addedDependencies.includes(depId)) {
				const depCapability = capabilities[depId];
				warnings.push(`Missing dependency: ${capability.name} requires ${depCapability?.name || depId}`);
			}
		}
	}
}

/**
 * Validates authentication requirements for selected capabilities
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @param {string[]} warnings - Array to add warnings to
 */
function validateAuthRequirements(selectedCapabilities, warnings) {
	const authServices = getRequiredAuthServices(selectedCapabilities);
	if (authServices.length > 0) {
		warnings.push(`Authentication required for: ${authServices.join(', ')}`);
	}
}

/**
 * Gets all capabilities that require authentication
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @returns {string[]} Array of capability IDs that require authentication
 */
export function getCapabilitiesRequiringAuth(selectedCapabilities) {
	return selectedCapabilities.filter(capabilityId => {
		const capability = capabilities[capabilityId];
		return capability?.requiresAuth === true;
	});
}

/**
 * Gets required authentication services for selected capabilities
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @returns {string[]} Array of required authentication service names
 */
export function getRequiredAuthServices(selectedCapabilities) {
	const services = new Set();
	
	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities[capabilityId];
		if (capability?.authService) {
			services.add(capability.authService);
		}
	}
	
	return Array.from(services);
}

/**
 * Sorts capabilities by dependency order (dependencies first)
 * @param {string[]} capabilityIds - Array of capability IDs to sort
 * @returns {string[]} Sorted array with dependencies first
 */
export function sortCapabilitiesByDependency(capabilityIds) {
	const sorted = [];
	const visited = new Set();
	const visiting = new Set();
	
	/**
	 * Recursive function to visit capabilities and their dependencies
	 * @param {string} capabilityId - Capability ID to visit
	 */
	function visit(capabilityId) {
		if (visiting.has(capabilityId)) {
			// Circular dependency detected
			return;
		}
		
		if (visited.has(capabilityId)) {
			return;
		}
		
		visiting.add(capabilityId);
		
		const capability = capabilities[capabilityId];
		if (capability) {
			// Visit dependencies first
			for (const depId of capability.dependencies) {
				visit(depId);
			}
		}
		
		visiting.delete(capabilityId);
		visited.add(capabilityId);
		sorted.push(capabilityId);
	}
	
	// Visit all capabilities
	for (const capabilityId of capabilityIds) {
		visit(capabilityId);
	}
	
	return sorted;
}

/**
 * Gets capability execution order for project generation
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @returns {string[]} Array of capability IDs in execution order
 */
export function getCapabilityExecutionOrder(selectedCapabilities) {
	const resolution = resolveDependencies(selectedCapabilities);
	return sortCapabilitiesByDependency(resolution.resolvedCapabilities);
}

/**
 * Checks if a capability can be added to the current selection
 * @param {string} capabilityId - Capability ID to check
 * @param {string[]} currentSelection - Current capability selection
 * @returns {Object} Result with canAdd flag and reason
 */
export function canAddCapability(capabilityId, currentSelection) {
	const capability = capabilities[capabilityId];
	if (!capability) {
		return {
			canAdd: false,
			reason: 'Unknown capability'
		};
	}
	
	// Check if already selected
	if (currentSelection.includes(capabilityId)) {
		return {
			canAdd: false,
			reason: 'Already selected'
		};
	}
	
	// Check for conflicts
	for (const conflictId of capability.conflicts) {
		if (currentSelection.includes(conflictId)) {
			const conflictCapability = capabilities[conflictId];
			return {
				canAdd: false,
				reason: `Conflicts with ${conflictCapability?.name || conflictId}`
			};
		}
	}
	
	return {
		canAdd: true,
		reason: null
	};
}

/**
 * Gets capability selection summary for display
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @returns {Object} Summary information
 */
export function getCapabilitySelectionSummary(selectedCapabilities) {
	const resolution = resolveDependencies(selectedCapabilities);
	const authServices = getRequiredAuthServices(selectedCapabilities);
	const validation = validateCapabilitySelection(selectedCapabilities);
	
	return {
		totalSelected: selectedCapabilities.length,
		totalResolved: resolution.resolvedCapabilities.length,
		addedDependencies: resolution.addedDependencies.length,
		conflicts: resolution.conflicts.length,
		authServices: authServices.length,
		isValid: validation.isValid,
		errors: validation.errors,
		warnings: validation.warnings,
		executionOrder: getCapabilityExecutionOrder(selectedCapabilities)
	};
}
