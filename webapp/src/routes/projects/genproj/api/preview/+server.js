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
			configuration: configWithDefaults
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

function generatePreview({ projectName, repositoryUrl, selectedCapabilities, configuration }) {
	const files = [];
	const externalServices = [];
	const context = { projectName, repositoryUrl, selectedCapabilities };

	// Track which devcontainer capabilities are selected
	const devcontainerCapabilities = selectedCapabilities.filter(
		(id) => capabilities.find((c) => c.id === id)?.category === 'devcontainer'
	);

	// Track if spec-kit is selected
	const hasSpecKit = selectedCapabilities.includes('spec-kit');

	// Generate files for each selected capability
	const fileMap = new Map();

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) continue;

		const capabilityConfig = configuration[capabilityId] || {};
		const capabilityFiles = generateCapabilityFiles({
			capabilityId,
			capability,
			configuration: capabilityConfig,
			context
		});

		// Handle file conflicts, especially for devcontainer files
		addFilesToMap(fileMap, capabilityFiles, devcontainerCapabilities, configuration, projectName);
	}

	// Convert map to array
	files.push(...fileMap.values());

	// Add speckit installation to Dockerfile if spec-kit is selected and devcontainer exists
	if (hasSpecKit && devcontainerCapabilities.length > 0) {
		const dockerfile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		if (dockerfile) {
			// Add speckit if not already present
			if (!dockerfile.content.includes('speckit')) {
				// Get all lines
				const lines = dockerfile.content.split('\n');

				// Find where to insert: after "ENV PATH=..." and before "Switch back to root"
				let insertIndex = -1;
				for (let i = 0; i < lines.length; i++) {
					// Look for the line that has ENV PATH with .local/bin
					if (lines[i].includes('ENV PATH') && lines[i].includes('.local/bin')) {
						// Insert after this line
						insertIndex = i + 1;
						break;
					}
				}

				if (insertIndex > 0) {
					// Build the installation commands (as node user)
					const installCommands = [
						'',
						'# Install speckit via uv',
						'RUN uv tool install --python 3.11 git+https://github.com/github/spec-kit.git'
					];

					// Insert after the PATH line
					lines.splice(insertIndex, 0, ...installCommands);
					dockerfile.content = lines.join('\n');
				}
			}
		}
	}

	// Add SonarLint extension to devcontainer.json if sonarlint is selected
	const hasSonarLint = selectedCapabilities.includes('sonarlint');
	if (hasSonarLint && devcontainerCapabilities.length > 0) {
		const devcontainerJson = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		if (devcontainerJson) {
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
	}

	// Add Doppler CLI installation to Dockerfile if doppler is selected
	if (selectedCapabilities.includes('doppler') && devcontainerCapabilities.length > 0) {
		const dockerfile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		if (dockerfile && !dockerfile.content.includes('cli.doppler.com/install.sh')) {
			const lines = dockerfile.content.split('\n');
			// Insert the install just before switching to USER node, so it runs as root
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
	}

	// Generate cloud-login.sh script if doppler or cloudflare are selected
	const hasDoppler = selectedCapabilities.includes('doppler');
	const hasCloudflare = selectedCapabilities.includes('cloudflare-wrangler');
	if (hasDoppler || hasCloudflare) {
		// Build custom cloud-login.sh based on selected services
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

		// Determine capability ID for the file
		let capabilityId;
		if (hasDoppler && hasCloudflare) {
			capabilityId = 'doppler+cloudflare';
		} else if (hasDoppler) {
			capabilityId = 'doppler';
		} else {
			capabilityId = 'cloudflare-wrangler';
		}

		files.push({
			filePath: 'scripts/cloud-login.sh',
			content: cloudLoginContent,
			capabilityId,
			isExecutable: true
		});

		// Update setup.sh to mention cloud-login.sh
		const setupSh = files.find((f) => f.filePath === '.devcontainer/setup.sh');
		if (setupSh) {
			// Add message at the end about running cloud-login.sh
			const message = `echo "INFO: Custom container setup script finished."
echo ""
echo "⚠️  To complete cloud login, run:"
echo "    bash scripts/cloud-login.sh"
`;
			// Replace the old "Setup complete!" line with the new message
			const setupLines = setupSh.content.split('\n');
			// Find and replace the last "Setup complete!" line
			for (let i = setupLines.length - 1; i >= 0; i--) {
				if (setupLines[i].includes('Setup complete!')) {
					setupLines[i] = message;
					break;
				}
			}
			setupSh.content = setupLines.join('\n');
		}
	}

	// Generate README.md
	const readmeContent = generateReadme(projectName, selectedCapabilities);
	files.push({
		filePath: 'README.md',
		content: readmeContent,
		capabilityId: 'README',
		isExecutable: false
	});

	// Generate external service changes
	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) continue;

		const capabilityServices = generateCapabilityServices(
			capability,
			capabilityId,
			externalServices
		);
		externalServices.push(...capabilityServices);
	}

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
 * Generates smart CircleCI configuration based on selected capabilities
 * @param {Object} context - Template context with selectedCapabilities
 * @returns {string} CircleCI YAML configuration
 */
// eslint-disable-next-line unicorn/prefer-module, complexity, sonarjs/cognitive-complexity
function generateCircleCIConfig(context) {
	/* eslint-disable unicorn/no-array-push-push, sonarjs/no-array-push-push */
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
		buildSteps.push('      - restore_cache:');
		buildSteps.push('          name: Restore node_modules');
		buildSteps.push('          keys:');
		buildSteps.push('            - node-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}');
		buildSteps.push('            - node-{{ .Branch }}-');
		buildSteps.push('            - node-');
	}

	if (hasPython) {
		buildSteps.push('      - restore_cache:');
		buildSteps.push('          name: Restore Python cache');
		buildSteps.push('          keys:');
		buildSteps.push('            - python-{{ .Branch }}-{{ checksum "webapp/requirements.txt" }}');
		buildSteps.push('            - python-{{ .Branch }}-');
	}

	// Add Playwright cache if needed
	if (hasPlaywright) {
		buildSteps.push('      - restore_cache:');
		buildSteps.push('          name: Restore Playwright cache');
		buildSteps.push('          keys:');
		buildSteps.push(
			'            - playwright-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}'
		);
		buildSteps.push('            - playwright-{{ .Branch }}-');
		buildSteps.push('            - playwright-');
	}

	// Add install steps
	if (hasNode) {
		buildSteps.push('      - run:');
		buildSteps.push('          name: Install modules');
		buildSteps.push('          command: npm install');
	}

	if (hasPython) {
		buildSteps.push('      - run:');
		buildSteps.push('          name: Install Python dependencies');
		buildSteps.push('          command: pip install -r requirements.txt');
	}

	// Install Playwright if needed
	if (hasPlaywright) {
		buildSteps.push('      - run:');
		buildSteps.push('          name: Install Playwright Chromium');
		buildSteps.push('          command: npx playwright install --with-deps chromium');

		buildSteps.push('      - save_cache:');
		buildSteps.push('          name: Cache Playwright');
		buildSteps.push('          paths:');
		buildSteps.push('            - ~/.cache/ms-playwright');
		buildSteps.push(
			'          key: playwright-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}'
		);
	}

	// Install Doppler if needed
	if (hasDoppler) {
		buildSteps.push('      - doppler/install');
	}

	// Install Wrangler if needed
	if (hasCloudflare) {
		buildSteps.push('      - run:');
		buildSteps.push('          name: Setup Wrangler configuration');
		buildSteps.push('          command: ./scripts/setup-wrangler-config.sh');
	}

	// Build step
	if (hasNode) {
		buildSteps.push('      - run:');
		buildSteps.push('          name: Build app');
		buildSteps.push('          command: npm run build');
	}

	// Save cache
	if (hasNode) {
		buildSteps.push('      - save_cache:');
		buildSteps.push('          name: Update node_modules cache');
		buildSteps.push('          paths:');
		buildSteps.push('            - node_modules');
		buildSteps.push('          key: node-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}');
	}

	// Build job YAML
	const buildJob = `  build:
    docker:
      - image: ${dockerImage}
    steps:
${buildSteps.map((step) => step).join('\n')}`;

	jobs.push(buildJob);

	// Code test job
	const codeTestSteps = ['      - checkout'];

	if (hasNode) {
		codeTestSteps.push('      - restore_cache:');
		codeTestSteps.push('          name: Restore node_modules');
		codeTestSteps.push('          keys:');
		codeTestSteps.push(
			'            - node-{{ .Branch }}-{{ checksum "webapp/package-lock.json" }}'
		);
		codeTestSteps.push('            - node-{{ .Branch }}-');
		codeTestSteps.push('            - node-');
	}

	if (hasDoppler) {
		codeTestSteps.push('      - doppler/install');
	}

	if (hasCloudflare) {
		codeTestSteps.push('      - run:');
		codeTestSteps.push('          name: Setup Wrangler configuration');
		codeTestSteps.push('          command: ./scripts/setup-wrangler-config.sh');
	}

	codeTestSteps.push('      - run:');
	codeTestSteps.push('          name: Run tests');
	codeTestSteps.push('          command: npm run test');

	// Add SonarCloud scan
	if (hasSonarCloud) {
		codeTestSteps.push('      - sonarcloud/scan');
	}

	const codeTestJob = `  code_test:
    docker:
      - image: ${dockerImage}
    steps:
${codeTestSteps.map((step) => step).join('\n')}
${hasSonarCloud ? '    context: SonarCloud' : ''}`;

	jobs.push(codeTestJob);

	// Browser test job (if Lighthouse is selected)
	if (hasLighthouse) {
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

		const browserTestJob = `  browser_test:
    docker:
      - image: cimg/node:current-browsers
    steps:
${browserTestSteps.map((step) => step).join('\n')}`;

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
	const workflowJobs = ['      - ggshield/scan:'];
	workflowJobs.push('          name: ggshield-scan');
	workflowJobs.push('          base_revision: << pipeline.git.base_revision >>');
	workflowJobs.push('          revision: <<pipeline.git.revision>>');
	workflowJobs.push('      - build');
	workflowJobs.push('      - code_test:');
	workflowJobs.push('          requires:');
	workflowJobs.push('            - build');
	if (hasSonarCloud) {
		workflowJobs.push('          context: SonarCloud');
	}

	if (hasLighthouse) {
		workflowJobs.push('      - browser_test:');
		workflowJobs.push('          requires:');
		workflowJobs.push('            - build');
	}

	if (hasCloudflare) {
		workflowJobs.push('      - deploy:');
		workflowJobs.push('          requires:');
		if (hasLighthouse) {
			workflowJobs.push('            - browser_test');
		}
		workflowJobs.push('            - code_test');
		workflowJobs.push('          filters:');
		workflowJobs.push('            branches:');
		workflowJobs.push('              only: main');

		workflowJobs.push('      - deploy-preview:');
		workflowJobs.push('          requires:');
		if (hasLighthouse) {
			workflowJobs.push('            - browser_test');
		}
		workflowJobs.push('            - code_test');
		workflowJobs.push('          filters:');
		workflowJobs.push('            branches:');
		workflowJobs.push('              ignore: main');
	}

	return `version: 2.1

orbs:
${indentedOrbs}

jobs:
${jobs.join('\n\n')}

workflows:
  build_test_deploy:
    jobs:
${workflowJobs.map((step) => step).join('\n')}`;
	/* eslint-enable unicorn/no-array-push-push */
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
`
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
 * @returns {string} README content
 */
function generateReadme(projectName, selectedCapabilities) {
	const selectedCaps = selectedCapabilities
		.map((id) => capabilities.find((c) => c.id === id))
		.filter(Boolean);

	return `# ${projectName}

This project was generated using genproj.

## Selected Capabilities

${selectedCaps.map((cap) => `- **${cap.name}**: ${cap.description}`).join('\n')}

## Setup

Follow the setup instructions for each selected capability.

## Generated

Generated using genproj.`;
}
