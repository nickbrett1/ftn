/**
 * @fileoverview Preview API endpoint for genproj feature
 * @description Generates preview of files and external service changes without authentication
 */

import { json } from '@sveltejs/kit';
import { withErrorHandling } from '$lib/utils/genproj-errors.js';
import { logger } from '$lib/utils/logging.js';
import { capabilities } from '$lib/config/capabilities.js';

/**
 * Validates a single field value
 * @param {string} capabilityId - Capability ID
 * @param {string} field - Field name
 * @param {*} value - Field value
 * @param {Object} rules - Field validation rules
 * @returns {string|null} Error message or null
 */
function validateField(capabilityId, field, value, rules) {
	// Check required fields
	if (rules.required && (value === undefined || value === null || value === '')) {
		return `${capabilityId}.${field} is required`;
	}

	// Check type
	if (value !== undefined && value !== null && rules.type) {
		if (rules.type === 'number' && typeof value !== 'number') {
			return `${capabilityId}.${field} must be a number`;
		}
		if (rules.type === 'string' && typeof value !== 'string') {
			return `${capabilityId}.${field} must be a string`;
		}
		if (rules.type === 'boolean' && typeof value !== 'boolean') {
			return `${capabilityId}.${field} must be a boolean`;
		}
	}

	// Check enum values
	if (rules.enum && !rules.enum.includes(value)) {
		return `${capabilityId}.${field} must be one of: ${rules.enum.join(', ')}`;
	}

	return null;
}

/**
 * Validates configuration for a single capability
 * @param {string} capabilityId - Capability ID
 * @param {Object} capabilityConfig - Capability configuration
 * @returns {string[]} Array of validation errors
 */
function validateCapabilityConfig(capabilityId, capabilityConfig) {
	const capability = capabilities.find((c) => c.id === capabilityId);
	if (!capability) return [];

	const schema = capability.configurationSchema;
	const errors = [];

	if (!schema || !schema.properties) return errors;

	for (const [field, rules] of Object.entries(schema.properties)) {
		// Apply default value if not provided
		let value = capabilityConfig[field];
		if (value === undefined && rules.default !== undefined) {
			value = rules.default;
		}
		const error = validateField(capabilityId, field, value, rules);
		if (error) {
			errors.push(error);
		}
	}

	return errors;
}

function validateConfigurations(selectedCapabilities, configuration) {
	const validationErrors = [];

	for (const capabilityId of selectedCapabilities) {
		const capabilityConfig = configuration[capabilityId] || {};
		const errors = validateCapabilityConfig(capabilityId, capabilityConfig);
		validationErrors.push(...errors);
	}

	return validationErrors;
}

/**
 * Validates the request body
 * @param {Object} body - Request body
 * @returns {Object|null} Error response or null if valid
 */
function validateRequest(body) {
	const { projectName, selectedCapabilities } = body;

	// For preview API, we apply a default project name if none provided
	// The actual project generation (not preview) will require a real user-entered name
	if (!projectName || projectName.trim().length < 3) {
		// Apply default for preview only
		if (projectName) {
			// Only reject if they provided something but it's too short
			return json({ error: 'Project name must be at least 3 characters' }, { status: 400 });
		}
		// If empty, we'll use default in the request body (handled in the calling function)
	}

	if (!Array.isArray(selectedCapabilities) || selectedCapabilities.length === 0) {
		return json({ error: 'At least one capability must be selected' }, { status: 400 });
	}

	return null;
}

/**
 * Validates capability IDs
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {Object|null} Error response or null if valid
 */
function validateCapabilityIds(selectedCapabilities) {
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

	return null;
}

/**
 * POST /projects/genproj/api/preview
 * Generates preview of project files and external service changes
 */
export const POST = withErrorHandling(async ({ request }) => {
	try {
		const body = await request.json();
		const { projectName, repositoryUrl, selectedCapabilities, configuration } = body;

		// Validate request
		const validationError = validateRequest(body);
		if (validationError) return validationError;

		// Validate capability IDs
		const capabilityError = validateCapabilityIds(selectedCapabilities);
		if (capabilityError) return capabilityError;

		// Validate configuration schemas
		const configErrors = validateConfigurations(selectedCapabilities, configuration);
		if (configErrors.length > 0) {
			return json(
				{
					error: 'Configuration validation failed',
					details: configErrors
				},
				{ status: 400 }
			);
		}

		// Generate preview data
		const previewData = generatePreview({
			projectName,
			repositoryUrl,
			selectedCapabilities,
			configuration
		});

		return json(previewData);
	} catch (error) {
		logger.error('❌ Preview generation error', { error: error.message });
		return json({ error: error.message }, { status: 500 });
	}
});

/**
 * Generates preview data for files and external services
 * @param {Object} params - Preview parameters
 * @param {string} params.projectName - Project name
 * @param {string} params.repositoryUrl - Repository URL
 * @param {string[]} params.selectedCapabilities - Selected capability IDs
 * @param {Object} params.configuration - Capability configurations
 * @returns {Object} Preview data
 */

/**
 * Generates files for a capability
 * @param {Object} params - Generation parameters
 * @param {string} params.capabilityId - Capability ID
 * @param {Object} params.capability - Capability definition
 * @param {Object} params.configuration - Capability configuration
 * @param {Object} params.context - Template context
 * @returns {Array} Array of file objects
 */
function generateCapabilityFiles({ capabilityId, capability, configuration, context }) {
	const files = [];

	if (!capability.templates || !Array.isArray(capability.templates)) {
		return files;
	}

	// Apply defaults from configurationSchema
	const configWithDefaults = { ...configuration };
	if (capability.configurationSchema?.properties) {
		for (const [field, rules] of Object.entries(capability.configurationSchema.properties)) {
			if (configWithDefaults[field] === undefined && rules.default !== undefined) {
				configWithDefaults[field] = rules.default;
			}
		}
	}

	// Add capability-specific defaults
	if (capabilityId === 'devcontainer-node' && !configWithDefaults.nodeVersion) {
		configWithDefaults.nodeVersion = '22';
	}
	if (capabilityId === 'devcontainer-python' && !configWithDefaults.pythonVersion) {
		configWithDefaults.pythonVersion = '3.12';
	}
	if (capabilityId === 'devcontainer-java' && !configWithDefaults.javaVersion) {
		configWithDefaults.javaVersion = '21';
	}

	for (const template of capability.templates) {
		const filePath = template.filePath || template.id || 'unknown';
		const fileContent = generateFileContent(template, {
			...context,
			capabilityId,
			capability,
			configuration: configWithDefaults,
			// Preserve full configuration object for template generation functions
			fullConfiguration: context.configuration || {}
		});

		files.push({
			filePath,
			content: fileContent,
			capabilityId,
			isExecutable: template.isExecutable || false
		});
	}

	return files;
}

/**
 * Generates external service changes for a capability
 * @param {Object} capability - Capability definition
 * @param {string} capabilityId - Capability ID
 * @param {Array} existingServices - Existing service changes
 * @returns {Array} Array of service changes
 */
function generateCapabilityServices(capability, capabilityId, existingServices) {
	const services = [];

	if (capability.externalService) {
		const action = capability.externalService.action || 'configure';
		services.push({
			service: capability.externalService.service || capabilityId,
			action,
			status: action === 'configure' ? 'pending' : action,
			description: capability.externalService.description || `${capability.name} configuration`,
			instructions: capability.externalService.instructions
		});
	}

	// Add auth requirements
	if (capability.requiresAuth && capability.requiresAuth.length > 0) {
		for (const service of capability.requiresAuth) {
			if (
				!existingServices.some((s) => s.service === service) &&
				!services.some((s) => s.service === service)
			) {
				services.push({
					service,
					action: 'authenticate',
					status: 'required',
					description: `Authentication required for ${service}`,
					instructions: `Please authenticate with ${service} to enable this capability`
				});
			}
		}
	}

	return services;
}

/**
 * Generate files for all selected capabilities
 * @param {Array} selectedCapabilities - Selected capabilities
 * @param {Object} configuration - Configuration object
 * @param {Object} context - Template context
 * @param {Array} devcontainerCapabilities - Devcontainer capabilities
 * @param {string} projectName - Project name
 * @returns {Array} Array of generated files
 */
function generateCapabilityFilesMap(
	selectedCapabilities,
	configuration,
	context,
	devcontainerCapabilities,
	projectName
) {
	const fileMap = new Map();

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) continue;

		const capabilityConfig = configuration[capabilityId] || {};
		const capabilityFiles = generateCapabilityFiles({
			capabilityId,
			capability,
			configuration: capabilityConfig,
			context: { ...context, configuration }
		});

		// Handle file conflicts, especially for devcontainer files
		addFilesToMap(fileMap, capabilityFiles, devcontainerCapabilities, configuration, projectName);
	}

	return Array.from(fileMap.values());
}

/**
 * Add speckit installation to Dockerfile
 * @param {Array} files - Files array
 * @param {boolean} hasSpecKit - Whether spec-kit is selected
 * @param {Array} devcontainerCapabilities - Devcontainer capabilities
 * @returns {void}
 */
function addSpeckitToDockerfile(files, hasSpecKit, devcontainerCapabilities) {
	if (!hasSpecKit || devcontainerCapabilities.length === 0) {
		return;
	}

	const dockerfile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
	if (!dockerfile || dockerfile.content.includes('speckit')) {
		return;
	}

	const lines = dockerfile.content.split('\n');
	let insertIndex = -1;

	for (let i = 0; i < lines.length; i++) {
		if (lines[i].includes('ENV PATH') && lines[i].includes('.local/bin')) {
			insertIndex = i + 1;
			break;
		}
	}

	if (insertIndex > 0) {
		const installCommands = [
			'',
			'# Install speckit via uv',
			'RUN uv tool install --python 3.11 git+https://github.com/github/spec-kit.git'
		];
		lines.splice(insertIndex, 0, ...installCommands);
		dockerfile.content = lines.join('\n');
	}
}

/**
 * Add SonarLint extension to devcontainer.json
 * @param {Array} files - Files array
 * @param {boolean} hasSonarLint - Whether sonarlint is selected
 * @param {Array} devcontainerCapabilities - Devcontainer capabilities
 * @returns {void}
 */
function addSonarLintToDevcontainer(files, hasSonarLint, devcontainerCapabilities) {
	if (!hasSonarLint || devcontainerCapabilities.length === 0) {
		return;
	}

	const devcontainerJson = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
	if (!devcontainerJson) {
		return;
	}

	try {
		const config = JSON.parse(devcontainerJson.content);
		if (config.customizations?.vscode?.extensions) {
			const extensions = new Set(config.customizations.vscode.extensions);
			extensions.add('SonarSource.sonarlint-vscode');
			config.customizations.vscode.extensions = Array.from(extensions);
			devcontainerJson.content = JSON.stringify(config, null, 2);
		}
	} catch (e) {
		console.error('Failed to parse devcontainer.json:', e);
	}
}

/**
 * Add Doppler CLI installation to Dockerfile
 * @param {Array} files - Files array
 * @param {Array} selectedCapabilities - Selected capabilities
 * @param {Array} devcontainerCapabilities - Devcontainer capabilities
 * @returns {void}
 */
function addDopplerToDockerfile(files, selectedCapabilities, devcontainerCapabilities) {
	if (!selectedCapabilities.includes('doppler') || devcontainerCapabilities.length === 0) {
		return;
	}

	const dockerfile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
	if (!dockerfile || dockerfile.content.includes('cli.doppler.com/install.sh')) {
		return;
	}

	const lines = dockerfile.content.split('\n');
	let insertIndex = lines.findIndex((line) => line.trim().startsWith('USER node'));
	const dopplerInstall = [
		'',
		'# Install Doppler CLI',
		'RUN (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh'
	];

	if (insertIndex > -1) {
		lines.splice(insertIndex, 0, ...dopplerInstall);
	} else {
		lines.push(...dopplerInstall);
	}
	dockerfile.content = lines.join('\n');
}

/**
 * Generate cloud-login.sh script content
 * @param {boolean} hasDoppler - Whether Doppler is selected
 * @param {boolean} hasCloudflare - Whether Cloudflare is selected
 * @param {string} projectName - Project name
 * @returns {string} Cloud login script content
 */
function generateCloudLoginScript(hasDoppler, hasCloudflare, projectName) {
	let cloudLoginContent = '#!/bin/bash\nset -e\n';

	if (hasDoppler) {
		cloudLoginContent += `\n# Doppler login/setup
if command -v doppler &> /dev/null; then
  if doppler whoami &> /dev/null; then
    echo "Already logged in to Doppler."
  else
    echo "INFO: Logging into Doppler..."
    doppler login --no-check-version --no-timeout --yes
    echo "INFO: Setting up Doppler..."
    doppler setup --no-interactive --project ${projectName || 'project'} --config dev
  fi
else
  echo "Doppler CLI not found. Skipping Doppler login."
fi
`;
	}

	if (hasCloudflare) {
		cloudLoginContent += `\necho
# Cloudflare Wrangler login
# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Wrangler CLI not found. Installing globally with npm..."
  npm install -g wrangler
fi

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\\.0\\.0\\.0/localhost/g'" /dev/null
`;

		if (hasDoppler) {
			cloudLoginContent += `\necho
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project ${projectName || 'project'} --config dev -- ./scripts/setup-wrangler-config.sh
`;
		}
	}

	cloudLoginContent += '\necho "Cloud login script finished."\n';
	return cloudLoginContent;
}

/**
 * Determine capability ID for cloud-login.sh
 * @param {boolean} hasDoppler - Whether Doppler is selected
 * @param {boolean} hasCloudflare - Whether Cloudflare is selected
 * @returns {string} Capability ID
 */
function getCloudLoginCapabilityId(hasDoppler, hasCloudflare) {
	if (hasDoppler && hasCloudflare) {
		return 'doppler+cloudflare';
	}
	if (hasDoppler) {
		return 'doppler';
	}
	return 'cloudflare-wrangler';
}

/**
 * Update setup.sh to mention cloud-login.sh
 * @param {Array} files - Files array
 * @returns {void}
 */
function updateSetupScript(files) {
	const setupSh = files.find((f) => f.filePath === '.devcontainer/setup.sh');
	if (!setupSh) {
		return;
	}

	const message = `echo "INFO: Custom container setup script finished."
echo ""
echo "⚠️  To complete cloud login, run:"
echo "    bash scripts/cloud-login.sh"
`;

	const setupLines = setupSh.content.split('\n');
	for (let i = setupLines.length - 1; i >= 0; i--) {
		if (setupLines[i].includes('Setup complete!')) {
			setupLines[i] = message;
			break;
		}
	}
	setupSh.content = setupLines.join('\n');
}

/**
 * Generate external services for all selected capabilities
 * @param {Array} selectedCapabilities - Selected capabilities
 * @param {Array} externalServices - Existing external services
 * @returns {Array} Array of external services
 */
function generateAllExternalServices(selectedCapabilities, externalServices) {
	const services = [];

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) continue;

		const capabilityServices = generateCapabilityServices(
			capability,
			capabilityId,
			externalServices
		);
		services.push(...capabilityServices);
	}

	return services;
}

function generatePreview({ projectName, repositoryUrl, selectedCapabilities, configuration }) {
	const files = [];
	const externalServices = [];
	const context = { projectName, repositoryUrl, selectedCapabilities, configuration };

	// Track which devcontainer capabilities are selected
	const devcontainerCapabilities = selectedCapabilities.filter(
		(id) => capabilities.find((c) => c.id === id)?.category === 'devcontainer'
	);

	// Track if spec-kit is selected
	const hasSpecKit = selectedCapabilities.includes('spec-kit');

	// Generate files for each selected capability
	const generatedFiles = generateCapabilityFilesMap(
		selectedCapabilities,
		configuration,
		context,
		devcontainerCapabilities,
		projectName
	);
	files.push(...generatedFiles);

	// Add speckit installation to Dockerfile if spec-kit is selected and devcontainer exists
	addSpeckitToDockerfile(files, hasSpecKit, devcontainerCapabilities);

	// Add SonarLint extension to devcontainer.json if sonarlint is selected
	const hasSonarLint = selectedCapabilities.includes('sonarlint');
	addSonarLintToDevcontainer(files, hasSonarLint, devcontainerCapabilities);

	// Add Doppler CLI installation to Dockerfile if doppler is selected
	addDopplerToDockerfile(files, selectedCapabilities, devcontainerCapabilities);

	// Generate cloud-login.sh script if doppler or cloudflare are selected
	const hasDoppler = selectedCapabilities.includes('doppler');
	const hasCloudflare = selectedCapabilities.includes('cloudflare-wrangler');
	if (hasDoppler || hasCloudflare) {
		const cloudLoginContent = generateCloudLoginScript(hasDoppler, hasCloudflare, projectName);
		const capabilityId = getCloudLoginCapabilityId(hasDoppler, hasCloudflare);

		files.push({
			filePath: 'scripts/cloud-login.sh',
			content: cloudLoginContent,
			capabilityId,
			isExecutable: true
		});

		updateSetupScript(files);
	}

	// Generate README.md
	const hasCloudLogin = hasDoppler || hasCloudflare;
	const readmeContent = generateReadme(projectName, selectedCapabilities, hasCloudLogin);
	files.push({
		filePath: 'README.md',
		content: readmeContent,
		capabilityId: 'README',
		isExecutable: false
	});

	// Generate external service changes
	const services = generateAllExternalServices(selectedCapabilities, externalServices);
	externalServices.push(...services);

	return {
		files,
		externalServices,
		metadata: {
			projectName,
			capabilityCount: selectedCapabilities.length,
			fileCount: files.length,
			serviceCount: externalServices.length,
			timestamp: new Date().toISOString()
		}
	};
}

/**
 * Adds files to the file map, handling conflicts especially for devcontainer files
 */
function addFilesToMap(
	fileMap,
	capabilityFiles,
	devcontainerCapabilities,
	configuration,
	projectName
) {
	for (const file of capabilityFiles) {
		const existingFile = fileMap.get(file.filePath);

		// No conflict, just add the file
		if (!existingFile || !file.filePath.includes('.devcontainer/')) {
			fileMap.set(file.filePath, file);
			continue;
		}

		// Handle devcontainer conflicts
		if (
			devcontainerCapabilities.length > 1 &&
			file.filePath === '.devcontainer/devcontainer.json'
		) {
			handleDevcontainerMerge(
				file,
				existingFile,
				devcontainerCapabilities,
				configuration,
				projectName
			);
			fileMap.set(file.filePath, file);
		} else if (
			devcontainerCapabilities.length > 1 &&
			file.filePath === '.devcontainer/Dockerfile'
		) {
			file.content = mergeDockerfiles(existingFile.content, file.content);
			file.capabilityId = 'devcontainer-merged';
			fileMap.set(file.filePath, file);
		} else {
			// Keep the later file (last selected wins for non-devcontainer files)
			fileMap.set(file.filePath, file);
		}
	}
}

/**
 * Handles merging of devcontainer.json files
 */
function handleDevcontainerMerge(
	file,
	existingFile,
	devcontainerCapabilities,
	configuration,
	projectName
) {
	try {
		file.content = mergeDevcontainerConfigs(
			existingFile.content,
			file.content,
			devcontainerCapabilities,
			configuration,
			projectName
		);
		file.capabilityId = 'devcontainer-merged';
	} catch (e) {
		console.error('Error merging devcontainer configs:', e);
		// Fall back to the new file content (already set)
	}
}

/**
 * Merges multiple devcontainer configurations
 */
function mergeDevcontainerConfigs(
	existingConfig,
	newConfig,
	devcontainerCapabilities,
	configuration,
	projectName
) {
	// Parse both configs - handle if they're already objects or strings
	let existing;
	let newConfigObj;

	// Helper to strip comments from JSON strings
	const stripComments = (str) => {
		if (typeof str !== 'string') return str;
		// Remove single-line comments
		// eslint-disable-next-line unicorn/prefer-string-replace-all
		// eslint-disable-next-line unicorn/prefer-string-replace-all
		return str.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
	};

	try {
		const contentToParse =
			typeof existingConfig === 'string' ? stripComments(existingConfig) : existingConfig;
		existing = typeof existingConfig === 'string' ? JSON.parse(contentToParse) : existingConfig;
	} catch (e) {
		console.error('Failed to parse existing config:', e);
		console.error('Config content:', existingConfig.substring(0, 200));
		throw new Error('Invalid existing devcontainer configuration');
	}

	try {
		const contentToParse = typeof newConfig === 'string' ? stripComments(newConfig) : newConfig;
		newConfigObj = typeof newConfig === 'string' ? JSON.parse(contentToParse) : newConfig;
	} catch (e) {
		console.error('Failed to parse new config:', e);
		console.error('Config content:', newConfig.substring(0, 200));
		throw new Error('Invalid new devcontainer configuration');
	}

	// Use a base image that supports both
	const hasNode = devcontainerCapabilities.includes('devcontainer-node');
	const hasPython = devcontainerCapabilities.includes('devcontainer-python');
	const hasJava = devcontainerCapabilities.includes('devcontainer-java');

	// Single capability - use existing config
	if (!hasNode && !hasPython && !hasJava) {
		return existingConfig;
	}

	const image = 'mcr.microsoft.com/devcontainers/base:ubuntu';
	const features = buildFeatures(hasNode, hasPython, hasJava);

	// Merge customizations (VSCode extensions)
	const extensions = new Set();
	if (existing.customizations?.vscode?.extensions) {
		for (const ext of existing.customizations.vscode.extensions) {
			extensions.add(ext);
		}
	}
	if (newConfigObj.customizations?.vscode?.extensions) {
		for (const ext of newConfigObj.customizations.vscode.extensions) {
			extensions.add(ext);
		}
	}

	const merged = {
		name: projectName || 'Project',
		image,
		runArgs: ['--sysctl', 'net.ipv6.conf.all.disable_ipv6=1'],
		features,
		customizations: {
			vscode: {
				extensions: Array.from(extensions)
			}
		},
		forwardPorts: [...(existing.forwardPorts || []), ...(newConfigObj.forwardPorts || [])].filter(
			(v, i, a) => a.indexOf(v) === i
		),
		postCreateCommand: 'bash .devcontainer/setup.sh'
	};

	return JSON.stringify(merged, null, 2);
}

/**
 * Builds features object for devcontainer configuration
 */
function buildFeatures(hasNode, hasPython, hasJava) {
	const features = {
		'ghcr.io/devcontainers/features/common-utils:2': {
			installZsh: true,
			configureZshAsDefaultShell: true,
			installOhMyZsh: true,
			username: 'node',
			uid: '1000',
			gid: '1000'
		},
		'ghcr.io/devcontainers/features/git:1': {}
	};

	if (hasNode) {
		features['ghcr.io/devcontainers/features/node:1'] = { version: '22' };
	}

	if (hasPython) {
		features['ghcr.io/devcontainers/features/python:1'] = { version: '3.12' };
	}

	if (hasJava) {
		features['ghcr.io/devcontainers/features/java:1'] = {
			version: '21',
			jdkDistro: 'ms',
			jdkVersion: '21'
		};
	}

	return features;
}

/**
 * Merges Dockerfile contents
 */
function mergeDockerfiles(existingDockerfile, newDockerfile) {
	// For multiple devcontainers, we'll use a universal base
	// Just return the first one since we're using features in the merged config
	return existingDockerfile;
}

/**
 * Get full configuration from context
 * @param {Object} fullConfiguration - Full configuration object
 * @param {Object} context - Template context
 * @param {Object} configuration - Fallback configuration
 * @returns {Object} Full configuration object
 */
function getFullConfig(fullConfiguration, context, configuration) {
	if (fullConfiguration && Object.keys(fullConfiguration).length > 0) {
		return fullConfiguration;
	}
	return context.configuration || configuration || {};
}

/**
 * Parse project key and organization from repository URL
 * @param {string} projectName - Project name
 * @param {string} repositoryUrl - Repository URL
 * @returns {Object} Object with projectKey and organization
 */
function parseProjectInfo(projectName, repositoryUrl) {
	// Note: replace() with global flag is acceptable for regex patterns
	// eslint-disable-next-line unicorn/prefer-string-replace-all
	let projectKey = projectName?.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'project';
	// eslint-disable-next-line unicorn/prefer-string-replace-all
	let organization = projectName?.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'project';

	if (repositoryUrl) {
		const githubMatch = repositoryUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
		if (githubMatch) {
			const owner = githubMatch[1];
			const repo = githubMatch[2].replace(/\.git$/, '');
			projectKey = `${owner}_${repo}`;
			organization = owner;
		}
	}

	return { projectKey, organization };
}

/**
 * Build source paths based on selected capabilities
 * @param {Array} selectedCapabilities - Selected capabilities
 * @returns {Array} Array of source paths
 */
function buildSourcePaths(selectedCapabilities) {
	const hasSvelteKit = selectedCapabilities.includes('sveltekit');
	const hasNode = selectedCapabilities.includes('devcontainer-node');
	const hasPython = selectedCapabilities.includes('devcontainer-python');
	const hasJava = selectedCapabilities.includes('devcontainer-java');

	const sourcePaths = [];

	if (hasSvelteKit || hasNode) {
		sourcePaths.push('webapp/src/routes', 'webapp/src/lib');
	}
	if (hasPython) {
		sourcePaths.push('src');
	}
	if (hasJava) {
		sourcePaths.push('src/main/java');
	}

	// Default to src if no specific paths found
	if (sourcePaths.length === 0) {
		sourcePaths.push('src');
	}

	return sourcePaths;
}

/**
 * Build coverage report paths based on languages
 * @param {Array} languages - Supported languages
 * @returns {Array} Array of coverage report paths
 */
function buildCoverageReportPaths(languages) {
	const coverageReportPaths = [];

	if (languages.includes('javascript') || languages.includes('typescript')) {
		coverageReportPaths.push('./coverage/lcov.info');
	}
	if (languages.includes('python')) {
		coverageReportPaths.push('./coverage.xml');
	}
	if (languages.includes('java')) {
		coverageReportPaths.push('./target/site/jacoco/jacoco.xml');
	}

	return coverageReportPaths;
}

/**
 * Generates sonar-project.properties based on project configuration
 * @param {Object} context - Template context with projectName, repositoryUrl, selectedCapabilities, configuration
 * @returns {string} sonar-project.properties content
 */
function generateSonarProjectProperties(context) {
	const {
		projectName,
		repositoryUrl,
		selectedCapabilities = [],
		fullConfiguration = {},
		configuration = {}
	} = context;

	const fullConfig = getFullConfig(fullConfiguration, context, configuration);
	const sonarcloudConfig = fullConfig.sonarcloud || configuration || {};
	const languages = sonarcloudConfig.languages || ['javascript'];

	const { projectKey, organization } = parseProjectInfo(projectName, repositoryUrl);
	const sourcePaths = buildSourcePaths(selectedCapabilities);
	const coverageReportPaths = buildCoverageReportPaths(languages);

	// Build exclusions (similar to FTN example)
	const coverageExclusions = [
		'**/tests/**',
		'**/*.test.js',
		'**/*.spec.js',
		'**/*.test.ts',
		'**/*.spec.ts',
		'**/*test-utils.js',
		'**/*test-helpers.js',
		'**/*-test-utils.js',
		'**/*-test-helpers.js',
		'**/shared-test-*.js',
		'**/test-*.js'
	];

	const generalExclusions = [
		'**/*.test.js',
		'**/*.spec.js',
		'**/*test-utils.js',
		'**/*test-helpers.js',
		'**/shared-test-*.js'
	];

	// Build the properties file
	let content = `sonar.projectKey=${projectKey}\n`;
	content += `sonar.organization=${organization}\n`;

	// Add language-specific coverage report paths
	for (const reportPath of coverageReportPaths) {
		if (reportPath.includes('lcov.info')) {
			content += `sonar.javascript.lcov.reportPaths=${reportPath}\n`;
		} else if (reportPath.includes('coverage.xml')) {
			content += `sonar.python.coverage.reportPaths=${reportPath}\n`;
		} else if (reportPath.includes('jacoco.xml')) {
			content += `sonar.java.coverage.reportPaths=${reportPath}\n`;
		}
	}

	content += '\n';
	content += '# This is the name and version displayed in the SonarCloud UI.\n';
	content += `#sonar.projectName=${projectName || 'Project'}\n`;
	content += '#sonar.projectVersion=1.0\n';
	content += '\n';
	content +=
		'# Path is relative to the sonar-project.properties file. Replace "\\" by "/" on Windows.\n';
	content += `sonar.sources=${sourcePaths.join(',')}\n`;
	content += '\n';
	content += '# Encoding of the source code. Default is default system encoding\n';
	content += '#sonar.sourceEncoding=UTF-8\n';
	content += '\n';
	content += '# Exclude test files, test utilities, and test directories from coverage analysis\n';
	content += `sonar.coverage.exclusions=${coverageExclusions.join(',')}\n`;
	content += '\n';
	content += '# Also exclude test utilities from general analysis (not just coverage)\n';
	content += `sonar.exclusions=${generalExclusions.join(',')}\n`;

	return content;
}

/**
 * Generates dependabot configuration based on selected capabilities
 * @param {Object} context - Template context
 * @returns {string} Dependabot configuration content
 */
function generateDependabotConfig(context) {
	const { selectedCapabilities = [] } = context;

	const ecosystemMappings = [
		{ capabilityId: 'devcontainer-node', ecosystem: 'npm', directory: '/' },
		{ capabilityId: 'devcontainer-python', ecosystem: 'pip', directory: '/' },
		{ capabilityId: 'devcontainer-java', ecosystem: 'gradle', directory: '/' }
	];

	const ecosystems = ecosystemMappings.filter((mapping) =>
		selectedCapabilities.includes(mapping.capabilityId)
	);

	if (ecosystems.length === 0) {
		return `version: 2
updates:
  # TODO: Specify the package ecosystem (e.g., npm, pip, gradle)
  # - package-ecosystem: "npm"
  #   directory: "/"
  #   schedule:
  #     interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
`;
	}

	const ecosystemEntries = ecosystems
		.map(
			(mapping) => `  - package-ecosystem: "${mapping.ecosystem}"
    directory: "${mapping.directory}"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5`
		)
		.join('\n');

	return `version: 2
updates:
${ecosystemEntries}
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
`;
}

/**
 * Generates smart CircleCI configuration based on selected capabilities
 * @param {Object} context - Template context with selectedCapabilities
 * @returns {string} CircleCI YAML configuration
 */
/**
 * Add cache restoration steps for Node
 * @param {Array} buildSteps - Build steps array
 * @returns {void}
 */
function addNodeCacheRestore(buildSteps) {
	const cacheSteps = [
		'      - restore_cache:',
		'          name: Restore node_modules',
		'          keys:',
		'            - node-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}',
		'            - node-{{ .Branch }}-',
		'            - node-'
	];
	buildSteps.push(...cacheSteps);
}

/**
 * Add cache restoration steps for Python
 * @param {Array} buildSteps - Build steps array
 * @returns {void}
 */
function addPythonCacheRestore(buildSteps) {
	const cacheSteps = [
		'      - restore_cache:',
		'          name: Restore Python cache',
		'          keys:',
		'            - python-{{ .Branch }}-{{ checksum "webapp/requirements.txt" }}',
		'            - python-{{ .Branch }}-'
	];
	buildSteps.push(...cacheSteps);
}

/**
 * Add Playwright cache restoration steps
 * @param {Array} buildSteps - Build steps array
 * @returns {void}
 */
function addPlaywrightCacheRestore(buildSteps) {
	const cacheSteps = [
		'      - restore_cache:',
		'          name: Restore Playwright cache',
		'          keys:',
		'            - playwright-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}',
		'            - playwright-{{ .Branch }}-',
		'            - playwright-'
	];
	buildSteps.push(...cacheSteps);
}

/**
 * Add install steps for Node
 * @param {Array} buildSteps - Build steps array
 * @returns {void}
 */
function addNodeInstallSteps(buildSteps) {
	const installSteps = [
		'      - run:',
		'          name: Install modules',
		'          command: npm install'
	];
	buildSteps.push(...installSteps);
}

/**
 * Add install steps for Python
 * @param {Array} buildSteps - Build steps array
 * @returns {void}
 */
function addPythonInstallSteps(buildSteps) {
	const installSteps = [
		'      - run:',
		'          name: Install Python dependencies',
		'          command: pip install -r requirements.txt'
	];
	buildSteps.push(...installSteps);
}

/**
 * Add Playwright installation and cache steps
 * @param {Array} buildSteps - Build steps array
 * @returns {void}
 */
function addPlaywrightInstallSteps(buildSteps) {
	const playwrightSteps = [
		'      - run:',
		'          name: Install Playwright Chromium',
		'          command: npx playwright install --with-deps chromium',
		'      - save_cache:',
		'          name: Cache Playwright',
		'          paths:',
		'            - ~/.cache/ms-playwright',
		'          key: playwright-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}'
	];
	buildSteps.push(...playwrightSteps);
}

/**
 * Add Node cache save steps
 * @param {Array} buildSteps - Build steps array
 * @returns {void}
 */
function addNodeCacheSave(buildSteps) {
	const cacheSteps = [
		'      - save_cache:',
		'          name: Update node_modules cache',
		'          paths:',
		'            - node_modules',
		'          key: node-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}'
	];
	buildSteps.push(...cacheSteps);
}

/**
 * Add code test steps for Node
 * @param {Array} codeTestSteps - Code test steps array
 * @returns {void}
 */
function addNodeCodeTestSteps(codeTestSteps) {
	const nodeSteps = [
		'      - restore_cache:',
		'          name: Restore node_modules',
		'          keys:',
		'            - node-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}',
		'            - node-{{ .Branch }}-',
		'            - node-'
	];
	codeTestSteps.push(...nodeSteps);
}

/**
 * Add workflow job steps
 * @param {Array} workflowJobs - Workflow jobs array
 * @param {boolean} hasLighthouse - Whether Lighthouse is selected
 * @param {boolean} hasCloudflare - Whether Cloudflare is selected
 * @param {boolean} hasSonarCloud - Whether SonarCloud is selected
 * @returns {void}
 */
/**
 * Add initial workflow steps
 * @param {Array} workflowJobs - Workflow jobs array
 * @returns {void}
 */
function addInitialWorkflowSteps(workflowJobs) {
	const initialSteps = [
		'      - ggshield/scan:',
		'          name: ggshield-scan',
		'          base_revision: << pipeline.git.base_revision >>',
		'          revision: <<pipeline.git.revision>>',
		'      - build',
		'      - code_test:',
		'          requires:',
		'            - build'
	];
	workflowJobs.push(...initialSteps);
}

/**
 * Add SonarCloud context to workflow
 * @param {Array} workflowJobs - Workflow jobs array
 * @param {boolean} hasSonarCloud - Whether SonarCloud is selected
 * @returns {void}
 */
function addSonarCloudContext(workflowJobs, hasSonarCloud) {
	if (hasSonarCloud) {
		workflowJobs.push('          context: SonarCloud');
	}
}

/**
 * Add Lighthouse browser test to workflow
 * @param {Array} workflowJobs - Workflow jobs array
 * @param {boolean} hasLighthouse - Whether Lighthouse is selected
 * @returns {void}
 */
function addLighthouseWorkflow(workflowJobs, hasLighthouse) {
	if (hasLighthouse) {
		const lighthouseSteps = ['      - browser_test:', '          requires:', '            - build'];
		workflowJobs.push(...lighthouseSteps);
	}
}

/**
 * Add Cloudflare deploy workflows
 * @param {Array} workflowJobs - Workflow jobs array
 * @param {boolean} hasCloudflare - Whether Cloudflare is selected
 * @param {boolean} hasLighthouse - Whether Lighthouse is selected
 * @returns {void}
 */
function addCloudflareWorkflows(workflowJobs, hasCloudflare, hasLighthouse) {
	if (!hasCloudflare) {
		return;
	}

	const deploySteps = ['      - deploy:', '          requires:'];
	if (hasLighthouse) {
		deploySteps.push('            - browser_test');
	}
	deploySteps.push(
		'            - code_test',
		'          filters:',
		'            branches:',
		'              only: main'
	);
	workflowJobs.push(...deploySteps);

	const deployPreviewSteps = ['      - deploy-preview:', '          requires:'];
	if (hasLighthouse) {
		deployPreviewSteps.push('            - browser_test');
	}
	deployPreviewSteps.push(
		'            - code_test',
		'          filters:',
		'            branches:',
		'              ignore: main'
	);
	workflowJobs.push(...deployPreviewSteps);
}

/**
 * Build code test job
 * @param {string} dockerImage - Docker image
 * @param {boolean} hasNode - Whether Node is selected
 * @param {boolean} hasDoppler - Whether Doppler is selected
 * @param {boolean} hasCloudflare - Whether Cloudflare is selected
 * @param {boolean} hasSonarCloud - Whether SonarCloud is selected
 * @returns {string} Code test job YAML
 */
function buildCodeTestJob(dockerImage, hasNode, hasDoppler, hasCloudflare, hasSonarCloud) {
	const codeTestSteps = ['      - checkout'];

	if (hasNode) {
		addNodeCodeTestSteps(codeTestSteps);
	}

	if (hasDoppler) {
		codeTestSteps.push('      - doppler/install');
	}

	if (hasCloudflare) {
		const wranglerSteps = [
			'      - run:',
			'          name: Setup Wrangler configuration',
			'          command: ./scripts/setup-wrangler-config.sh'
		];
		codeTestSteps.push(...wranglerSteps);
	}

	const testSteps = [
		'      - run:',
		'          name: Run tests',
		'          command: npm run test'
	];
	codeTestSteps.push(...testSteps);

	// Add SonarCloud scan
	if (hasSonarCloud) {
		codeTestSteps.push('      - sonarcloud/scan');
	}

	return `  code_test:
    docker:
      - image: ${dockerImage}
    steps:
${codeTestSteps.map((step) => step).join('\n')}
${hasSonarCloud ? '    context: SonarCloud' : ''}`;
}

/**
 * Build browser test job
 * @returns {string} Browser test job YAML
 */
function buildBrowserTestJob() {
	const browserTestSteps = [
		'      - checkout',
		'      - restore_cache:',
		'          name: Restore Lighthouse CLI cache',
		'          keys:',
		'            - lighthouse-cli-{{ .Branch }}-',
		'            - lighthouse-cli-',
		'      - run:',
		'          name: Install Lighthouse CLI',
		'          command: sudo npm install -g @lhci/cli@0.9.x',
		'      - save_cache:',
		'          name: Cache Lighthouse CLI',
		'          paths:',
		'            - /usr/local/lib/node_modules/@lhci',
		'          key: lighthouse-cli-{{ .Branch }}-',
		'      - run:',
		'          name: Run Lighthouse checks',
		'          command: npm run lighthouse'
	];

	return `  browser_test:
    docker:
      - image: cimg/node:current-browsers
    steps:
${browserTestSteps.map((step) => step).join('\n')}`;
}

/**
 * Add workflow job steps
 * @param {Array} workflowJobs - Workflow jobs array
 * @param {boolean} hasLighthouse - Whether Lighthouse is selected
 * @param {boolean} hasCloudflare - Whether Cloudflare is selected
 * @param {boolean} hasSonarCloud - Whether SonarCloud is selected
 * @returns {void}
 */
function addWorkflowJobSteps(workflowJobs, hasLighthouse, hasCloudflare, hasSonarCloud) {
	addInitialWorkflowSteps(workflowJobs);
	addSonarCloudContext(workflowJobs, hasSonarCloud);
	addLighthouseWorkflow(workflowJobs, hasLighthouse);
	addCloudflareWorkflows(workflowJobs, hasCloudflare, hasLighthouse);
}

function generateCircleCIConfig(context) {
	const selectedCapabilities = context.selectedCapabilities || [];

	// Determine what capabilities are present
	const hasNode = selectedCapabilities.includes('devcontainer-node');
	const hasPython = selectedCapabilities.includes('devcontainer-python');
	const hasPlaywright = selectedCapabilities.includes('playwright');
	const hasDoppler = selectedCapabilities.includes('doppler');
	const hasCloudflare = selectedCapabilities.includes('cloudflare');
	const hasSonarCloud = selectedCapabilities.includes('sonarcloud');
	const hasLighthouse = selectedCapabilities.includes('lighthouse');

	// Determine docker image
	const dockerImage = hasPython ? 'cimg/python:current' : 'cimg/node:current';

	// Build orbs section
	const orbs = ['ggshield: gitguardian/ggshield@volatile'];
	if (hasSonarCloud) {
		orbs.push('sonarcloud: sonarsource/sonarcloud@2.0.0');
	}
	if (hasDoppler) {
		orbs.push('doppler: conpago/doppler@1.3.5');
	}
	let indentedOrbs = orbs.map((orb) => `  ${orb}`).join('\n');

	// Build jobs
	const jobs = [];

	// Build job
	const buildSteps = ['      - checkout'];

	// Add cache restoration
	if (hasNode) {
		addNodeCacheRestore(buildSteps);
	}

	if (hasPython) {
		addPythonCacheRestore(buildSteps);
	}

	// Add Playwright cache if needed
	if (hasPlaywright) {
		addPlaywrightCacheRestore(buildSteps);
	}

	// Add install steps
	if (hasNode) {
		addNodeInstallSteps(buildSteps);
	}

	if (hasPython) {
		addPythonInstallSteps(buildSteps);
	}

	// Install Playwright if needed
	if (hasPlaywright) {
		addPlaywrightInstallSteps(buildSteps);
	}

	// Install Doppler if needed
	if (hasDoppler) {
		buildSteps.push('      - doppler/install');
	}

	// Install Wrangler if needed
	if (hasCloudflare) {
		const wranglerSteps = [
			'      - run:',
			'          name: Setup Wrangler configuration',
			'          command: ./scripts/setup-wrangler-config.sh'
		];
		buildSteps.push(...wranglerSteps);
	}

	// Build step
	if (hasNode) {
		const buildAppSteps = [
			'      - run:',
			'          name: Build app',
			'          command: npm run build'
		];
		buildSteps.push(...buildAppSteps);
	}

	// Save cache
	if (hasNode) {
		addNodeCacheSave(buildSteps);
	}

	// Build job YAML
	const buildJob = `  build:
    docker:
      - image: ${dockerImage}
    steps:
${buildSteps.map((step) => step).join('\n')}`;

	jobs.push(buildJob);

	// Code test job
	const codeTestJob = buildCodeTestJob(
		dockerImage,
		hasNode,
		hasDoppler,
		hasCloudflare,
		hasSonarCloud
	);
	jobs.push(codeTestJob);

	// Browser test job (if Lighthouse is selected)
	if (hasLighthouse) {
		const browserTestJob = buildBrowserTestJob();
		jobs.push(browserTestJob);
	}

	// Deploy jobs (if Cloudflare is selected)
	if (hasCloudflare) {
		const deploySteps = [
			'      - checkout',
			'      - restore_cache:',
			'          name: Restore node_modules',
			'          keys:',
			'            - node-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}',
			'            - node-{{ .Branch }}-',
			'            - node-',
			'      - doppler/install',
			'      - run:',
			'          name: Setup Wrangler configuration',
			'          command: ./scripts/setup-wrangler-config.sh',
			'      - run:',
			'          name: Deploying to Cloudflare',
			'          command: npm run deploy'
		];

		const deployJob = `  deploy:
    docker:
      - image: cimg/node:current
    steps:
${deploySteps.map((step) => step).join('\n')}`;

		jobs.push(deployJob);

		// Deploy preview job
		const deployPreviewSteps = [...deploySteps];
		deployPreviewSteps[deployPreviewSteps.length - 1] = '          command: npm run deploy-preview';

		const deployPreviewJob = `  deploy-preview:
    docker:
      - image: cimg/node:current
    steps:
${deployPreviewSteps.map((step) => step).join('\n')}`;

		jobs.push(deployPreviewJob);
	}

	// Build workflows
	const workflowJobs = [];
	addWorkflowJobSteps(workflowJobs, hasLighthouse, hasCloudflare, hasSonarCloud);

	return `version: 2.1

orbs:
${indentedOrbs}

jobs:
${jobs.join('\n\n')}

workflows:
  build_test_deploy:
    jobs:
${workflowJobs.map((step) => step).join('\n')}`;
	/* eslint-enable unicorn/no-array-push-push, sonarjs/no-array-push-push */
}

/**
 * Gets fallback template content by template ID
 * @param {string} templateId - Template ID
 * @param {Object} context - Template context
 * @returns {string|null} Template content
 */
function getFallbackTemplate(templateId, context) {
	// Handle CircleCI config generation
	if (templateId === 'circleci-config') {
		return generateCircleCIConfig(context);
	}

	// Handle SonarCloud config generation
	if (templateId === 'sonarcloud-config') {
		return generateSonarProjectProperties(context);
	}

	// Handle Dependabot config generation
	if (templateId === 'dependabot-config') {
		return generateDependabotConfig(context);
	}

	const fallbackTemplates = {
		'devcontainer-node-json': `{
  "name": "{{projectName}}",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:{{nodeVersion}}",
  "runArgs": ["--sysctl", "net.ipv6.conf.all.disable_ipv6=1"],
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "configureZshAsDefaultShell": true,
      "installOhMyZsh": true,
      "username": "node",
      "uid": "1000",
      "gid": "1000"
    },
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-eslint"
      ]
    }
  },
  "forwardPorts": [3000, 5173],
  "postCreateCommand": "bash .devcontainer/setup.sh"
}`,
		'devcontainer-node-dockerfile': `FROM mcr.microsoft.com/devcontainers/javascript-node:{{nodeVersion}}

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    && rm -rf /var/lib/apt/lists/* \\
    && curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

# Switch to node user for installing user-specific tools
USER node
ENV USER_HOME_DIR=/home/node

# Add uv tools to PATH for node user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

# Switch back to root
USER root

WORKDIR /workspace
`,
		'devcontainer-python-json': `{
  "name": "{{projectName}}",
  "image": "mcr.microsoft.com/devcontainers/python:{{pythonVersion}}",
  "runArgs": ["--sysctl", "net.ipv6.conf.all.disable_ipv6=1"],
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "configureZshAsDefaultShell": true,
      "installOhMyZsh": true,
      "username": "node",
      "uid": "1000",
      "gid": "1000"
    },
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.pylint",
        "ms-python.black-formatter"
      ]
    }
  },
  "postCreateCommand": "bash .devcontainer/setup.sh"
}`,
		'devcontainer-java-json': `{
  "name": "{{projectName}}",
  "image": "mcr.microsoft.com/devcontainers/java:{{javaVersion}}",
  "runArgs": ["--sysctl", "net.ipv6.conf.all.disable_ipv6=1"],
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "configureZshAsDefaultShell": true,
      "installOhMyZsh": true,
      "username": "node",
      "uid": "1000",
      "gid": "1000"
    },
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/java:1": {
      "version": "{{javaVersion}}",
      "jdkDistro": "ms"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "vscjava.vscode-java-pack",
        "vscjava.vscode-gradle"
      ]
    }
  },
  "forwardPorts": [8080, 9090],
  "postCreateCommand": "bash .devcontainer/setup.sh"
}`,
		'devcontainer-python-dockerfile': `FROM mcr.microsoft.com/devcontainers/python:{{pythonVersion}}

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    && rm -rf /var/lib/apt/lists/* \\
    && curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

# Switch to node user for installing user-specific tools
USER node
ENV USER_HOME_DIR=/home/node

# Add uv tools to PATH for node user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

# Switch back to root
USER root

WORKDIR /workspace
`,
		'devcontainer-java-dockerfile': `FROM mcr.microsoft.com/devcontainers/java:{{javaVersion}}

# Install system dependencies and uv
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    && rm -rf /var/lib/apt/lists/* \\
    && curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

# Switch to node user for installing user-specific tools
USER node
ENV USER_HOME_DIR=/home/node

# Add uv tools to PATH for node user
ENV PATH="$USER_HOME_DIR/.local/bin:$PATH"

# Switch back to root
USER root

WORKDIR /workspace
`,
		'devcontainer-zshrc': `plugins=(git web-search zsh-autosuggestions zsh-syntax-highlighting)

export ZSH=$HOME/.oh-my-zsh

# Set Oh My Zsh theme conditionally to avoid Cursor hanging issues
if [[ "$PAGER" == "sh -c \\"head -n 10000 | cat\\"" ]]; then
  ZSH_THEME=""  # Disable Powerlevel10k for Cursor chat terminals only
else
  ZSH_THEME="powerlevel10k/powerlevel10k"
fi

source $ZSH/oh-my-zsh.sh

# Use a minimal prompt in Cursor chat terminals to avoid command detection issues
if [[ "$TERM_PROGRAM" == "vscode" && -n "$CURSOR_TRACE_ID" ]]; then
  PROMPT='%n@%m:%~%# '
  RPROMPT=''
else
  [[ -f ~/.p10k.zsh ]] && source ~/.p10k.zsh
fi

DISABLE_AUTO_UPDATE=true
DISABLE_UPDATE_PROMPT=true`,
		'devcontainer-p10k-zsh': `# Powerlevel10k configuration
# Generated for use with Oh My Zsh and Powerlevel10k theme
# Run 'p10k configure' to customize this configuration

# Temporarily change options.
'builtin' 'local' '-a' 'p10k_config_opts'
[[ ! -o 'aliases'         ]] || p10k_config_opts+=('aliases')
[[ ! -o 'sh_glob'         ]] || p10k_config_opts+=('sh_glob')
[[ ! -o 'no_brace_expand' ]] || p10k_config_opts+=('no_brace_expand')
'builtin' 'setopt' 'no_aliases' 'no_sh_glob' 'brace_expand'

() {
  emulate -L zsh -o extended_glob
  unset -m '(POWERLEVEL9K_*|DEFAULT_USER)~POWERLEVEL9K_GITSTATUS_DIR'
  autoload -Uz is-at-least && is-at-least 5.1 || return
  
  # Left prompt segments
  typeset -g POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(
    os_icon
    dir
    vcs
  )
  
  # Right prompt segments
  typeset -g POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS=(
    status
    command_execution_time
    background_jobs
    context
  )
  
  # Style and colors
  typeset -g POWERLEVEL9K_MODE='compatible'
  typeset -g POWERLEVEL9K_ICON_PADDING=moderate
  
  # Prompt
  typeset -g POWERLEVEL9K_PROMPT_ADD_NEWLINE=false
  typeset -g POWERLEVEL9K_PROMPT_ON_NEWLINE=true
  typeset -g POWERLEVEL9K_RPROMPT_ON_NEWLINE=false
  
  # Status
  typeset -g POWERLEVEL9K_STATUS_EXTENDED_STATES=false
  typeset -g POWERLEVEL9K_STATUS_OK=false
  typeset -g POWERLEVEL9K_STATUS_OK_BACKGROUND=2
  typeset -g POWERLEVEL9K_STATUS_OK_FOREGROUND=15
  typeset -g POWERLEVEL9K_STATUS_ERROR_BACKGROUND=1
  typeset -g POWERLEVEL9K_STATUS_ERROR_FOREGROUND=15
  
  # Command execution time
  typeset -g POWERLEVEL9K_COMMAND_EXECUTION_TIME_THRESHOLD=3
  typeset -g POWERLEVEL9K_COMMAND_EXECUTION_TIME_PRECISION=0
  
  # Directory
  typeset -g POWERLEVEL9K_DIR_SHOW_WRITABLE=true
  typeset -g POWERLEVEL9K_SHORTEN_STRATEGY='truncate_from_right'
  typeset -g POWERLEVEL9K_SHORTEN_DIR_LENGTH=1
  
  # VCS
  typeset -g POWERLEVEL9K_VCS_BACKENDS=(git)
  
  # Context
  typeset -g POWERLEVEL9K_CONTEXT_DEFAULT_BACKGROUND=8
  typeset -g POWERLEVEL9K_CONTEXT_DEFAULT_FOREGROUND=15
}

(( ! $$\{#p10k_config_opts} )) || setopt $$\{p10k_config_opts[@]}
'builtin' 'unset' 'p10k_config_opts'
`,
		'devcontainer-setup-sh': `#!/bin/bash
set -e

echo "Setting up development environment..."

# Install Oh My Zsh
if [ ! -d "$HOME/.oh-my-zsh" ]; then
    echo "Installing Oh My Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# Setup Oh My Zsh custom directories
mkdir -p "$HOME/.oh-my-zsh/custom/themes" "$HOME/.oh-my-zsh/custom/plugins"

# Copy zsh configuration
if [ -f ".devcontainer/.zshrc" ]; then
    echo "Copying .zshrc..."
    cp ".devcontainer/.zshrc" "$HOME/.zshrc"
fi

# Copy Powerlevel10k theme if it exists
if [ -f ".devcontainer/.p10k.zsh" ]; then
    echo "Copying .p10k.zsh..."
    cp ".devcontainer/.p10k.zsh" "$HOME/.p10k.zsh"
fi

# Clone Powerlevel10k theme
if [ ! -d "$HOME/.oh-my-zsh/custom/themes/powerlevel10k" ]; then
    echo "Installing Powerlevel10k theme..."
    git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$HOME/.oh-my-zsh/custom/themes/powerlevel10k"
fi

# Clone zsh-autosuggestions plugin
if [ ! -d "$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions" ]; then
    echo "Installing zsh-autosuggestions..."
    git clone https://github.com/zsh-users/zsh-autosuggestions "$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions"
fi

# Clone zsh-syntax-highlighting plugin
if [ ! -d "$HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting" ]; then
    echo "Installing zsh-syntax-highlighting..."
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting"
fi

# Configure git safe directory
echo "Configuring git safe directory..."
CURRENT_DIR=$(pwd)
git config --global --add safe.directory "$CURRENT_DIR"

echo "Setup complete!"
`,
		'doppler-config': `setup:
  project: {{projectName}}
  config: dev
`,
		'cloud-login-sh': `#!/bin/bash
set -e

# Doppler login/setup
if command -v doppler &> /dev/null; then
  if doppler whoami &> /dev/null; then
    echo "Already logged in to Doppler."
  else
    echo "INFO: Logging into Doppler..."
    doppler login --no-check-version --no-timeout --yes
    echo "INFO: Setting up Doppler..."
    doppler setup --no-interactive --project {{projectName}} --config dev
  fi
else
  echo "Doppler CLI not found. Skipping Doppler login."
fi

echo
# Cloudflare Wrangler login
# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Wrangler CLI not found. Installing globally with npm..."
  npm install -g wrangler
fi

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\\.0\\.0\\.0/localhost/g'" /dev/null

echo
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project {{projectName}} --config dev -- ./scripts/setup-wrangler-config.sh

echo "Cloud login script finished."
`,
		// Minimal SonarLint VS Code settings to avoid generating an empty file
		'sonarlint-vscode-config': `{
	"sonarlint.ls.javaHome": "/usr/local/sdkman/candidates/java/current"
}`,
		// Cloudflare Wrangler configuration (JSONC format)
		'wrangler-config': `{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "{{projectName}}",
	"compatibility_date": "2024-05-30",
	"compatibility_flags": ["nodejs_compat_v2"],
	"main": ".svelte-kit/cloudflare/_worker.js",
	"assets": {
		"binding": "ASSETS",
		"directory": ".svelte-kit/cloudflare"
	},
	"observability": {
		"logs": {
			"enabled": true
		}
	}
}`
	};

	return fallbackTemplates[templateId] || null;
}

/**
 * Generates file content from template
 * @param {Object} template - Template configuration
 * @param {Object} context - Template context variables
 * @returns {string} Generated file content
 */
function generateFileContent(template, context) {
	// If template has content property, use it
	if (typeof template === 'object' && template.content) {
		let content = template.content;
		// Replace variables using replaceAll with string literals
		content = content.replaceAll('{{projectName}}', context.projectName || '');
		content = content.replaceAll('{{repositoryUrl}}', context.repositoryUrl || '');
		content = content.replaceAll('{{capabilityId}}', context.capabilityId || '');
		return content;
	}

	// If template has templateId, try to get fallback template
	if (typeof template === 'object' && template.templateId) {
		const fallbackContent = getFallbackTemplate(template.templateId, context);
		if (fallbackContent) {
			// Replace any remaining placeholders in the fallback content
			let content = fallbackContent;
			content = content.replaceAll('{{projectName}}', context.projectName || 'Project');
			content = content.replaceAll('{{repositoryUrl}}', context.repositoryUrl || '');
			content = content.replaceAll('{{capabilityId}}', context.capabilityId || '');

			// Replace configuration variables
			if (context.configuration) {
				for (const [key, value] of Object.entries(context.configuration)) {
					content = content.replaceAll(`{{${key}}}`, value);
				}
			}

			return content;
		}
	}

	// Default placeholder content
	return `// Generated file for ${context.capabilityId || 'capability'}\n// Template: ${template.id || 'unknown'}`;
}

/**
 * Generates README content
 * @param {string} projectName - Project name
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @param {boolean} hasCloudLogin - Whether cloud-login.sh script is generated
 * @returns {string} README content
 */
function generateReadme(projectName, selectedCapabilities, hasCloudLogin = false) {
	const selectedCaps = selectedCapabilities
		.map((id) => capabilities.find((c) => c.id === id))
		.filter(Boolean);

	let content = `# ${projectName}

This project was generated using genproj.

## Selected Capabilities

${selectedCaps.map((cap) => `- **${cap.name}**: ${cap.description}`).join('\n')}

## Setup

Follow the setup instructions for each selected capability.`;

	if (hasCloudLogin) {
		content += `

### Cloud Services Login

After the container is set up, run the cloud login script to authenticate with cloud services:

\`\`\`bash
bash scripts/cloud-login.sh
\`\`\`

This script will help you log in to Doppler and/or Cloudflare Wrangler as needed.`;
	}

	content += `

## Generated

Generated using genproj.`;

	return content;
}
