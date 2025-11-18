// webapp/src/lib/utils/validation.js
import { capabilities, getCapabilityById } from '$lib/config/capabilities';

/**
 * Provides utility functions for common data validation tasks.
 */

/**
 * Checks if a given string is not empty or consists only of whitespace.
 * @param {string | null | undefined} value The string to check.
 * @returns {boolean} True if the string is not empty and contains non-whitespace characters, false otherwise.
 */
export function isNotEmpty(value) {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if a given value is a valid UUID format.
 * @param {string | null | undefined} value The string to check.
 * @returns {boolean} True if the string is a valid UUID, false otherwise.
 */
export function isValidUuid(value) {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return typeof value === 'string' && uuidRegex.test(value);
}

/**
 * Checks if a given value is a valid email format.
 * @param {string | null | undefined} value The string to check.
 * @returns {boolean} True if the string is a valid email, false otherwise.
 */
export function isValidEmail(value) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return typeof value === 'string' && emailRegex.test(value);
}

/**
 * Checks if a given value is a valid URL format.
 * @param {string | null | undefined} value The string to check.
 * @returns {boolean} True if the string is a valid URL, false otherwise.
 */
export function isValidUrl(value) {
	if (!value) return false;
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validates a project name.
 * @param {string | null | undefined} name The project name to validate.
 * @returns {{valid: boolean, error?: string}}
 */
export function validateProjectName(name) {
	if (typeof name !== 'string' || name.trim().length === 0) {
		return { valid: false, error: 'Project name is required' };
	}
	if (name.length < 3) {
		return { valid: false, error: 'Project name must be at least 3 characters long' };
	}
	if (name.length > 50) {
		return { valid: false, error: 'Project name must be no more than 50 characters long' };
	}
	if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
		return {
			valid: false,
			error: 'Project name can only contain letters, numbers, hyphens, and underscores'
		};
	}
	if (['admin', 'root', 'test'].includes(name.toLowerCase())) {
		return { valid: false, error: 'Project name is reserved and cannot be used' };
	}
	return { valid: true };
}

/**
 * Validates a repository URL.
 * @param {string | null | undefined} url The URL to validate.
 * @returns {{valid: boolean, error?: string}}
 */
export function validateRepositoryUrl(url) {
	if (url === undefined || url === null || url === '') {
		return { valid: true };
	}
	if (typeof url !== 'string') {
		return { valid: false, error: 'Repository URL must be a string' };
	}
	if (!/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\.git)?$/.test(url)) {
		return {
			valid: false,
			error: 'Repository URL must be a valid GitHub URL (https://github.com/owner/repo)'
		};
	}
	return { valid: true };
}

/**
 * Validates selected capabilities.
 * @param {any} selected The selected capabilities.
 * @returns {{valid: boolean, error?: string}}
 */
export function validateSelectedCapabilities(selected) {
	if (!Array.isArray(selected)) {
		return { valid: false, error: 'Selected capabilities must be an array' };
	}
	if (selected.length === 0) {
		return { valid: false, error: 'At least one capability must be selected' };
	}
	if (selected.length > 20) {
		return { valid: false, error: 'Too many capabilities selected (maximum 20)' };
	}
	const capabilityIds = new Set(capabilities.map((c) => c.id));
	for (const id of selected) {
		if (!capabilityIds.has(id)) {
			return { valid: false, error: `Invalid capability ID: ${id}` };
		}
	}
	const duplicates = selected.filter((item, index) => selected.indexOf(item) !== index);
	if (duplicates.length > 0) {
		return { valid: false, error: 'Duplicate capabilities are not allowed' };
	}
	return { valid: true };
}

const validationRules = {
	'devcontainer-node': (config) =>
		!['18', '20', '22'].includes(config.nodeVersion) ? 'Invalid Node.js version' : null,
	'devcontainer-python': (config) =>
		!['pip', 'poetry'].includes(config.packageManager) ? 'Invalid package manager' : null,
	'devcontainer-java': (config) =>
		!['11', '17', '22'].includes(config.javaVersion) ? 'Invalid Java version' : null,
	circleci: (config) =>
		!['none', 'cloudflare'].includes(config.deployTarget) ? 'Invalid deploy target' : null,
	'github-actions': (config) =>
		!['18', '20', '22'].includes(config.nodeVersion) ? 'Invalid Node.js version' : null,
	sonarcloud: (config) =>
		!['js', 'py', 'java'].includes(config.language) ? 'Invalid language' : null,
	doppler: (config) =>
		!['web', 'backend'].includes(config.projectType) ? 'Invalid project type' : null,
	'cloudflare-wrangler': (config) =>
		!['web', 'api'].includes(config.workerType) ? 'Invalid worker type' : null,
	dependabot: (config) =>
		config.ecosystems && !config.ecosystems.every((e) => ['npm', 'github-actions'].includes(e))
			? 'Invalid ecosystem: ' +
				config.ecosystems.find((e) => !['npm', 'github-actions'].includes(e))
			: null,
	'lighthouse-ci': (config) =>
		config.thresholds && (config.thresholds.performance < 0 || config.thresholds.performance > 100)
			? 'Threshold performance must be a number between 0 and 100'
			: null,
	playwright: (config) =>
		config.browsers &&
		!config.browsers.every((b) => ['chromium', 'firefox', 'webkit'].includes(b))
			? 'Invalid browser: ' +
				config.browsers.find((b) => !['chromium', 'firefox', 'webkit'].includes(b))
			: null,
	'spec-kit': (config) =>
		!['md', 'yaml'].includes(config.specFormat) ? 'Invalid spec format' : null
};

/**
 * Validates capability configuration.
 * @param {any} configuration The configuration object.
 * @param {string[]} selectedCapabilities The selected capabilities.
 * @returns {{valid: boolean, error?: string}}
 */
export function validateCapabilityConfiguration(configuration, selectedCapabilities) {
	const errors = [];

	if (configuration === null || typeof configuration !== 'object') {
		errors.push('Configuration must be an object');
		return { valid: false, errors };
	}

	for (const id of selectedCapabilities) {
		const capability = getCapabilityById(id);
		const config = configuration[id];
		const schema = capability?.configurationSchema;

		if (schema && config) {
			if (schema.required) {
				for (const requiredProp of schema.required) {
					if (config[requiredProp] === undefined) {
						errors.push(`${id}.${requiredProp} is required`);
					}
				}
			}

			const rule = validationRules[id];
			if (rule) {
				const error = rule(config);
				if (error) {
					errors.push(error);
				}
			}
		}
	}

	return { valid: errors.length === 0, errors };
}
/**
 * Validates the entire project configuration.
 * @param {object} config The project configuration.
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateProjectConfiguration(config) {
	const errors = [];

	const projectNameValidation = validateProjectName(config.projectName);
	if (!projectNameValidation.valid) {
		errors.push(projectNameValidation.error);
	}

	const repoUrlValidation = validateRepositoryUrl(config.repositoryUrl);
	if (!repoUrlValidation.valid) {
		errors.push(repoUrlValidation.error);
	}

	const capabilitiesValidation = validateSelectedCapabilities(config.selectedCapabilities);
	if (!capabilitiesValidation.valid) {
		errors.push(capabilitiesValidation.error);
	}

	if (config.selectedCapabilities && config.configuration) {
		const configValidation = validateCapabilityConfiguration(
			config.configuration,
			config.selectedCapabilities
		);
		if (!configValidation.valid) {
			errors.push(...configValidation.errors);
		}
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Sanitizes a project name into a slug.
 * @param {string | null | undefined} name The project name.
 * @returns {string} The sanitized slug.
 */
export function sanitizeProjectName(name) {
	if (typeof name !== 'string') {
		return '';
	}
	return name
		.toLowerCase()
		.replaceAll(/[^a-z0-9-]+/g, '-')
		.replaceAll(/-+/g, '-')
		.replaceAll(/^-|-$/g, '');
}

/**
 * Generates a project slug from a project name.
 * @param {string} name The project name.
 * @returns {string} The project slug.
 */
export function generateProjectSlug(name) {
	return sanitizeProjectName(name);
}
