/**
 * Project Configuration Validation Utility
 *
 * Provides validation functions for project configurations, capability selections,
 * and external service configurations in the genproj tool.
 *
 * @fileoverview Universal validation utilities for genproj project configurations
 */

/**
 * @typedef {Object} ProjectConfiguration
 * @property {string} projectName - Name of the project
 * @property {string} [repositoryUrl] - Optional existing repository URL
 * @property {string[]} capabilities - Array of selected capability IDs
 * @property {Object} configuration - Capability-specific configuration
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 */

/**
 * Validates project name format and rules
 * @param {string} projectName - The project name to validate
 * @param {string[]} errors - Array to collect errors
 * @param {string[]} warnings - Array to collect warnings
 */
function validateProjectNameFormat(projectName, errors, warnings) {
	// GitHub repository name rules
	if (projectName.length > 100) {
		errors.push('Project name must be 100 characters or less');
	}

	if (projectName.length < 1) {
		errors.push('Project name must be at least 1 character');
	}

	// Must start and end with alphanumeric character
	if (!/^[a-zA-Z0-9]/.test(projectName)) {
		errors.push('Project name must start with a letter or number');
	}

	if (!/[a-zA-Z0-9]$/.test(projectName)) {
		errors.push('Project name must end with a letter or number');
	}

	// Can contain hyphens, underscores, and dots
	if (!/^[a-zA-Z0-9._-]+$/.test(projectName)) {
		errors.push('Project name can only contain letters, numbers, hyphens, underscores, and dots');
	}
}

/**
 * Validates project name against reserved names
 * @param {string} projectName - The project name to validate
 * @param {string[]} errors - Array to collect errors
 */
function validateReservedNames(projectName, errors) {
	const reservedNames = [
		'con',
		'prn',
		'aux',
		'nul',
		'com1',
		'com2',
		'com3',
		'com4',
		'com5',
		'com6',
		'com7',
		'com8',
		'com9',
		'lpt1',
		'lpt2',
		'lpt3',
		'lpt4',
		'lpt5',
		'lpt6',
		'lpt7',
		'lpt8',
		'lpt9'
	];

	if (reservedNames.includes(projectName.toLowerCase())) {
		errors.push('Project name cannot be a reserved system name');
	}
}

/**
 * Adds best practice warnings for project names
 * @param {string} projectName - The project name to validate
 * @param {string[]} warnings - Array to collect warnings
 */
function addProjectNameWarnings(projectName, warnings) {
	// Warnings for best practices
	if (projectName.includes('_') && projectName.includes('-')) {
		warnings.push('Consider using consistent naming convention (either hyphens or underscores)');
	}

	if (projectName.length > 50) {
		warnings.push('Consider using a shorter project name for better readability');
	}
}

/**
 * Validates a project name according to GitHub repository naming conventions
 * @param {string} projectName - The project name to validate
 * @returns {ValidationResult} Validation result with errors/warnings
 */
export function validateProjectName(projectName) {
	const errors = [];
	const warnings = [];

	if (!projectName) {
		errors.push('Project name is required');
		return { isValid: false, errors, warnings };
	}

	// Validate format and rules
	validateProjectNameFormat(projectName, errors, warnings);

	// Check for reserved names
	validateReservedNames(projectName, errors);

	// Add best practice warnings
	addProjectNameWarnings(projectName, warnings);

	return {
		isValid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Validates a GitHub repository URL
 * @param {string} repositoryUrl - The repository URL to validate
 * @returns {ValidationResult} Validation result with errors/warnings
 */
export function validateRepositoryUrl(repositoryUrl) {
	const errors = [];
	const warnings = [];

	if (!repositoryUrl) {
		// Repository URL is optional - user can create new repo
		return { isValid: true, errors, warnings };
	}

	// GitHub URL patterns
	const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\/)?$/;
	const githubSshPattern = /^git@github\.com:[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\.git$/;

	if (!githubUrlPattern.test(repositoryUrl) && !githubSshPattern.test(repositoryUrl)) {
		errors.push(
			'Repository URL must be a valid GitHub URL (https://github.com/owner/repo or git@github.com:owner/repo.git)'
		);
	}

	// Extract owner and repo name for additional validation
	const httpsRegex = /^https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)/;
	const sshRegex = /^git@github\.com:([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)\.git$/;
	const httpsMatch = httpsRegex.exec(repositoryUrl);
	const sshMatch = sshRegex.exec(repositoryUrl);

	const match = httpsMatch || sshMatch;
	if (match) {
		const [, owner, repo] = match;

		// Validate owner and repo names
		const ownerValidation = validateProjectName(owner);
		if (!ownerValidation.isValid) {
			errors.push(`Repository owner name is invalid: ${ownerValidation.errors.join(', ')}`);
		}

		const repoValidation = validateProjectName(repo);
		if (!repoValidation.isValid) {
			errors.push(`Repository name is invalid: ${repoValidation.errors.join(', ')}`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Validates capability array format
 * @param {string[]} capabilities - Array of selected capability IDs
 * @param {string[]} errors - Array to collect errors
 * @param {string[]} warnings - Array to collect warnings
 * @returns {boolean} Whether validation passed
 */
function validateCapabilityArray(capabilities, errors, warnings) {
	if (!Array.isArray(capabilities)) {
		errors.push('Capabilities must be an array');
		return false;
	}

	if (capabilities.length === 0) {
		warnings.push('No capabilities selected - consider adding some project features');
	}

	return true;
}

/**
 * Validates capability IDs against definitions
 * @param {string[]} capabilities - Array of selected capability IDs
 * @param {Object} capabilityDefinitions - Available capability definitions
 * @param {string[]} errors - Array to collect errors
 */
function validateCapabilityIds(capabilities, capabilityDefinitions, errors) {
	const validCapabilityIds = Object.keys(capabilityDefinitions);
	const invalidCapabilities = capabilities.filter((cap) => !validCapabilityIds.includes(cap));

	if (invalidCapabilities.length > 0) {
		errors.push(`Invalid capabilities: ${invalidCapabilities.join(', ')}`);
	}
}

/**
 * Validates capability dependencies
 * @param {string[]} capabilities - Array of selected capability IDs
 * @param {Object} capabilityDefinitions - Available capability definitions
 * @param {string[]} errors - Array to collect errors
 */
function validateCapabilityDependencies(capabilities, capabilityDefinitions, errors) {
	for (const capabilityId of capabilities) {
		const capability = capabilityDefinitions[capabilityId];
		if (!capability) continue;

		if (capability.dependencies) {
			for (const dependency of capability.dependencies) {
				if (!capabilities.includes(dependency)) {
					const dependencyName = capabilityDefinitions[dependency]?.name || dependency;
					errors.push(
						`Capability '${capability.name}' requires '${dependencyName}' to be selected`
					);
				}
			}
		}
	}
}

/**
 * Validates capability conflicts
 * @param {string[]} capabilities - Array of selected capability IDs
 * @param {Object} capabilityDefinitions - Available capability definitions
 * @param {string[]} errors - Array to collect errors
 */
function validateCapabilityConflicts(capabilities, capabilityDefinitions, errors) {
	for (const capabilityId of capabilities) {
		const capability = capabilityDefinitions[capabilityId];
		if (!capability) continue;

		if (capability.conflicts) {
			for (const conflict of capability.conflicts) {
				if (capabilities.includes(conflict)) {
					const conflictName = capabilityDefinitions[conflict]?.name || conflict;
					errors.push(`Capability '${capability.name}' conflicts with '${conflictName}'`);
				}
			}
		}
	}
}

/**
 * Validates capability selections and their dependencies
 * @param {string[]} capabilities - Array of selected capability IDs
 * @param {Object} capabilityDefinitions - Available capability definitions
 * @returns {ValidationResult} Validation result with errors/warnings
 */
export function validateCapabilities(capabilities, capabilityDefinitions) {
	const errors = [];
	const warnings = [];

	// Validate array format
	if (!validateCapabilityArray(capabilities, errors, warnings)) {
		return { isValid: false, errors, warnings };
	}

	// Validate capability IDs
	validateCapabilityIds(capabilities, capabilityDefinitions, errors);

	// Validate dependencies
	validateCapabilityDependencies(capabilities, capabilityDefinitions, errors);

	// Validate conflicts
	validateCapabilityConflicts(capabilities, capabilityDefinitions, errors);

	return {
		isValid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Validates a complete project configuration
 * @param {ProjectConfiguration} config - The project configuration to validate
 * @param {Object} capabilityDefinitions - Available capability definitions
 * @returns {ValidationResult} Validation result with errors/warnings
 */
export function validateProjectConfiguration(config, capabilityDefinitions) {
	const errors = [];
	const warnings = [];

	// Validate project name
	const nameValidation = validateProjectName(config.projectName);
	errors.push(...nameValidation.errors);
	warnings.push(...nameValidation.warnings);

	// Validate repository URL
	const urlValidation = validateRepositoryUrl(config.repositoryUrl);
	errors.push(...urlValidation.errors);
	warnings.push(...urlValidation.warnings);

	// Validate capabilities
	const capabilitiesValidation = validateCapabilities(config.capabilities, capabilityDefinitions);
	errors.push(...capabilitiesValidation.errors);
	warnings.push(...capabilitiesValidation.warnings);

	// Validate capability-specific configuration
	if (config.configuration && typeof config.configuration === 'object') {
		for (const capabilityId of config.capabilities) {
			const capability = capabilityDefinitions[capabilityId];
			if (!capability) continue;

			const capabilityConfig = config.configuration[capabilityId];
			if (capabilityConfig && capability.validateConfiguration) {
				const configValidation = capability.validateConfiguration(capabilityConfig);
				if (!configValidation.isValid) {
					errors.push(
						`Configuration for '${capability.name}': ${configValidation.errors.join(', ')}`
					);
				}
				warnings.push(
					...configValidation.warnings.map((w) => `Configuration for '${capability.name}': ${w}`)
				);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Sanitizes a project name to make it GitHub-compatible
 * @param {string} projectName - The project name to sanitize
 * @returns {string} Sanitized project name
 */
export function sanitizeProjectName(projectName) {
	if (!projectName) return '';

	// Convert to lowercase and replace spaces with hyphens
	let sanitized = projectName.toLowerCase().replaceAll(/\s+/g, '-');

	// Remove invalid characters
	sanitized = sanitized.replaceAll(/[^a-z0-9._-]/g, '');

	// Ensure it starts and ends with alphanumeric
	sanitized = sanitized.replace(/^[^a-z0-9]+/, '').replace(/[^a-z0-9]+$/, '');

	// Limit length
	if (sanitized.length > 100) {
		sanitized = sanitized.substring(0, 100);
	}

	// Ensure it's not empty
	if (!sanitized) {
		sanitized = 'project';
	}

	return sanitized;
}
