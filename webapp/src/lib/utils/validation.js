/**
 * @fileoverview Base validation utilities for genproj feature
 * @description Validation functions for project configurations and user inputs
 */

/**
 * Validate project name
 * @param {string} projectName - Project name to validate
 * @returns {Object} Validation result
 */
export function validateProjectName(projectName) {
	if (!projectName || typeof projectName !== 'string') {
		return { valid: false, error: 'Project name is required' };
	}

	if (projectName.length < 3) {
		return { valid: false, error: 'Project name must be at least 3 characters long' };
	}

	if (projectName.length > 50) {
		return { valid: false, error: 'Project name must be no more than 50 characters long' };
	}

	// Allow alphanumeric characters, hyphens, and underscores
	const validPattern = /^[a-zA-Z0-9-_]+$/;
	if (!validPattern.test(projectName)) {
		return {
			valid: false,
			error: 'Project name can only contain letters, numbers, hyphens, and underscores'
		};
	}

	// Check for reserved names
	const reservedNames = [
		'admin',
		'api',
		'app',
		'www',
		'mail',
		'ftp',
		'root',
		'test',
		'dev',
		'staging',
		'prod'
	];
	if (reservedNames.includes(projectName.toLowerCase())) {
		return { valid: false, error: 'Project name is reserved and cannot be used' };
	}

	return { valid: true };
}

/**
 * Validate repository URL
 * @param {string} repositoryUrl - Repository URL to validate
 * @returns {Object} Validation result
 */
export function validateRepositoryUrl(repositoryUrl) {
	if (!repositoryUrl) {
		return { valid: true }; // Optional field
	}

	if (typeof repositoryUrl !== 'string') {
		return { valid: false, error: 'Repository URL must be a string' };
	}

	// GitHub URL pattern
	const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/;
	if (!githubPattern.test(repositoryUrl)) {
		return {
			valid: false,
			error: 'Repository URL must be a valid GitHub URL (https://github.com/owner/repo)'
		};
	}

	return { valid: true };
}

/**
 * Validate selected capabilities
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {Object} Validation result
 */
export function validateSelectedCapabilities(selectedCapabilities) {
	if (!Array.isArray(selectedCapabilities)) {
		return { valid: false, error: 'Selected capabilities must be an array' };
	}

	if (selectedCapabilities.length === 0) {
		return { valid: false, error: 'At least one capability must be selected' };
	}

	if (selectedCapabilities.length > 20) {
		return { valid: false, error: 'Too many capabilities selected (maximum 20)' };
	}

	// Check for valid capability IDs
	const validCapabilityIds = new Set([
		'devcontainer-node',
		'devcontainer-python',
		'devcontainer-java',
		'circleci',
		'github-actions',
		'sonarcloud',
		'sonarlint',
		'doppler',
		'cloudflare-wrangler',
		'dependabot',
		'lighthouse-ci',
		'playwright',
		'spec-kit'
	]);

	for (const capabilityId of selectedCapabilities) {
		if (!validCapabilityIds.has(capabilityId)) {
			return { valid: false, error: `Invalid capability ID: ${capabilityId}` };
		}
	}

	// Check for duplicates
	const uniqueCapabilities = new Set(selectedCapabilities);
	if (uniqueCapabilities.size !== selectedCapabilities.length) {
		return { valid: false, error: 'Duplicate capabilities are not allowed' };
	}

	return { valid: true };
}

/**
 * Validate capability configuration
 * @param {Object} configuration - Capability configuration
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {Object} Validation result
 */
export function validateCapabilityConfiguration(configuration, selectedCapabilities) {
	if (!configuration || typeof configuration !== 'object') {
		return { valid: false, error: 'Configuration must be an object' };
	}

	// Validate each capability's configuration
	for (const capabilityId of selectedCapabilities) {
		const capabilityConfig = configuration[capabilityId];

		if (capabilityConfig !== undefined && typeof capabilityConfig !== 'object') {
			return { valid: false, error: `Configuration for ${capabilityId} must be an object` };
		}

		// Validate specific capability configurations
		const validationResult = validateSpecificCapabilityConfig(capabilityId, capabilityConfig);
		if (!validationResult.valid) {
			return validationResult;
		}
	}

	return { valid: true };
}

/**
 * Validate specific capability configuration
 * @param {string} capabilityId - Capability ID
 * @param {Object} config - Capability configuration
 * @returns {Object} Validation result
 */
function validateSpecificCapabilityConfig(capabilityId, config) {
	if (!config) {
		return { valid: true }; // Optional configuration
	}

	switch (capabilityId) {
		case 'devcontainer-node':
			return validateDevContainerNodeConfig(config);
		case 'devcontainer-python':
			return validateDevContainerPythonConfig(config);
		case 'devcontainer-java':
			return validateDevContainerJavaConfig(config);
		case 'circleci':
			return validateCircleCIConfig(config);
		case 'github-actions':
			return validateGitHubActionsConfig(config);
		case 'sonarcloud':
			return validateSonarCloudConfig(config);
		case 'doppler':
			return validateDopplerConfig(config);
		case 'cloudflare-wrangler':
			return validateCloudflareWranglerConfig(config);
		case 'dependabot':
			return validateDependabotConfig(config);
		case 'lighthouse-ci':
			return validateLighthouseCIConfig(config);
		case 'playwright':
			return validatePlaywrightConfig(config);
		case 'spec-kit':
			return validateSpecKitConfig(config);
		default:
			return { valid: true }; // Unknown capability, allow any config
	}
}

/**
 * Validate DevContainer Node configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateDevContainerNodeConfig(config) {
	const validNodeVersions = ['18', '20', '22'];
	const validPackageManagers = ['npm', 'yarn', 'pnpm'];

	if (config.nodeVersion && !validNodeVersions.includes(config.nodeVersion)) {
		return { valid: false, error: 'Invalid Node.js version' };
	}

	if (config.packageManager && !validPackageManagers.includes(config.packageManager)) {
		return { valid: false, error: 'Invalid package manager' };
	}

	return { valid: true };
}

/**
 * Validate DevContainer Python configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateDevContainerPythonConfig(config) {
	const validPythonVersions = ['3.9', '3.10', '3.11', '3.12'];
	const validPackageManagers = ['pip', 'poetry', 'pipenv'];

	if (config.pythonVersion && !validPythonVersions.includes(config.pythonVersion)) {
		return { valid: false, error: 'Invalid Python version' };
	}

	if (config.packageManager && !validPackageManagers.includes(config.packageManager)) {
		return { valid: false, error: 'Invalid package manager' };
	}

	return { valid: true };
}

/**
 * Validate DevContainer Java configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateDevContainerJavaConfig(config) {
	const validJavaVersions = ['11', '17', '21'];
	const validBuildTools = ['maven', 'gradle'];

	if (config.javaVersion && !validJavaVersions.includes(config.javaVersion)) {
		return { valid: false, error: 'Invalid Java version' };
	}

	if (config.buildTool && !validBuildTools.includes(config.buildTool)) {
		return { valid: false, error: 'Invalid build tool' };
	}

	return { valid: true };
}

/**
 * Validate CircleCI configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateCircleCIConfig(config) {
	const validNodeVersions = ['18', '20', '22'];
	const validDeployTargets = ['cloudflare', 'vercel', 'aws'];

	if (config.nodeVersion && !validNodeVersions.includes(config.nodeVersion)) {
		return { valid: false, error: 'Invalid Node.js version' };
	}

	if (config.deployTarget && !validDeployTargets.includes(config.deployTarget)) {
		return { valid: false, error: 'Invalid deploy target' };
	}

	return { valid: true };
}

/**
 * Validate GitHub Actions configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateGitHubActionsConfig(config) {
	// Same validation as CircleCI
	return validateCircleCIConfig(config);
}

/**
 * Validate SonarCloud configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateSonarCloudConfig(config) {
	const validLanguages = ['javascript', 'typescript', 'python', 'java'];
	const validQualityGates = ['default', 'strict'];

	if (config.language && !validLanguages.includes(config.language)) {
		return { valid: false, error: 'Invalid language' };
	}

	if (config.qualityGate && !validQualityGates.includes(config.qualityGate)) {
		return { valid: false, error: 'Invalid quality gate' };
	}

	return { valid: true };
}

/**
 * Validate Doppler configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateDopplerConfig(config) {
	const validProjectTypes = ['web', 'api', 'mobile'];

	if (config.environments && !Array.isArray(config.environments)) {
		return { valid: false, error: 'Environments must be an array' };
	}

	if (config.projectType && !validProjectTypes.includes(config.projectType)) {
		return { valid: false, error: 'Invalid project type' };
	}

	return { valid: true };
}

/**
 * Validate Cloudflare Wrangler configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateCloudflareWranglerConfig(config) {
	const validWorkerTypes = ['web', 'api', 'scheduled'];

	if (config.workerType && !validWorkerTypes.includes(config.workerType)) {
		return { valid: false, error: 'Invalid worker type' };
	}

	if (config.compatibilityDate && typeof config.compatibilityDate !== 'string') {
		return { valid: false, error: 'Compatibility date must be a string' };
	}

	return { valid: true };
}

/**
 * Validate Dependabot configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateDependabotConfig(config) {
	const validEcosystems = new Set([
		'npm',
		'yarn',
		'pip',
		'maven',
		'gradle',
		'docker',
		'github-actions'
	]);
	const validSchedules = ['daily', 'weekly', 'monthly'];

	if (config.ecosystems && !Array.isArray(config.ecosystems)) {
		return { valid: false, error: 'Ecosystems must be an array' };
	}

	if (config.ecosystems && Array.isArray(config.ecosystems)) {
		for (const ecosystem of config.ecosystems) {
			if (!validEcosystems.has(ecosystem)) {
				return { valid: false, error: `Invalid ecosystem: ${ecosystem}` };
			}
		}
	}

	if (config.updateSchedule && !validSchedules.includes(config.updateSchedule)) {
		return { valid: false, error: 'Invalid update schedule' };
	}

	return { valid: true };
}

/**
 * Validate Lighthouse CI configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateLighthouseCIConfig(config) {
	if (config.thresholds && typeof config.thresholds === 'object') {
		const validThresholds = new Set(['performance', 'accessibility', 'bestPractices', 'seo']);

		for (const [key, value] of Object.entries(config.thresholds)) {
			if (!validThresholds.has(key)) {
				return { valid: false, error: `Invalid threshold: ${key}` };
			}

			if (typeof value !== 'number' || value < 0 || value > 100) {
				return { valid: false, error: `Threshold ${key} must be a number between 0 and 100` };
			}
		}
	}

	return { valid: true };
}

/**
 * Validate Playwright configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validatePlaywrightConfig(config) {
	const validBrowsers = new Set(['chromium', 'firefox', 'webkit']);

	if (config.browsers && !Array.isArray(config.browsers)) {
		return { valid: false, error: 'Browsers must be an array' };
	}

	if (config.browsers && Array.isArray(config.browsers)) {
		for (const browser of config.browsers) {
			if (!validBrowsers.has(browser)) {
				return { valid: false, error: `Invalid browser: ${browser}` };
			}
		}
	}

	if (config.testDir && typeof config.testDir !== 'string') {
		return { valid: false, error: 'Test directory must be a string' };
	}

	return { valid: true };
}

/**
 * Validate Spec Kit configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result
 */
function validateSpecKitConfig(config) {
	const validFormats = ['markdown', 'yaml', 'json'];

	if (config.specFormat && !validFormats.includes(config.specFormat)) {
		return { valid: false, error: 'Invalid spec format' };
	}

	if (config.includeTemplates && typeof config.includeTemplates !== 'boolean') {
		return { valid: false, error: 'Include templates must be a boolean' };
	}

	return { valid: true };
}

/**
 * Validate complete project configuration
 * @param {Object} config - Complete project configuration
 * @returns {Object} Validation result
 */
export function validateProjectConfiguration(config) {
	const errors = [];

	// Validate project name
	const nameValidation = validateProjectName(config.projectName);
	if (!nameValidation.valid) {
		errors.push(nameValidation.error);
	}

	// Validate repository URL
	const urlValidation = validateRepositoryUrl(config.repositoryUrl);
	if (!urlValidation.valid) {
		errors.push(urlValidation.error);
	}

	// Validate selected capabilities
	const capabilitiesValidation = validateSelectedCapabilities(config.selectedCapabilities);
	if (!capabilitiesValidation.valid) {
		errors.push(capabilitiesValidation.error);
	}

	// Validate capability configuration
	const configValidation = validateCapabilityConfiguration(
		config.configuration,
		config.selectedCapabilities
	);
	if (!configValidation.valid) {
		errors.push(configValidation.error);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Sanitize project name for file system usage
 * @param {string} projectName - Project name to sanitize
 * @returns {string} Sanitized project name
 */
export function sanitizeProjectName(projectName) {
	if (!projectName) return '';

	// Note: replaceAll() doesn't support regex patterns, so we use replace() with global flag
	// This is acceptable per SonarQube standards for regex-based replacements
	// eslint-disable-next-line unicorn/prefer-string-replace-all
	let sanitized = projectName.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
	// eslint-disable-next-line unicorn/prefer-string-replace-all
	sanitized = sanitized.replace(/-+/g, '-');
	// Group regex parts to make precedence explicit: (^[-])|([-]$)
	// eslint-disable-next-line unicorn/prefer-string-replace-all
	return sanitized.replace(/(^-)|(-$)/g, '');
}

/**
 * Generate project slug from project name
 * @param {string} projectName - Project name
 * @returns {string} Project slug
 */
export function generateProjectSlug(projectName) {
	return sanitizeProjectName(projectName);
}
