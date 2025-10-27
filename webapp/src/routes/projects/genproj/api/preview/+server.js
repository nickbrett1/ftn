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
	const context = { projectName, repositoryUrl };

	// Track which devcontainer capabilities are selected
	const devcontainerCapabilities = selectedCapabilities.filter(
		(id) => capabilities.find((c) => c.id === id)?.category === 'devcontainer'
	);

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
function addFilesToMap(fileMap, capabilityFiles, devcontainerCapabilities, configuration, projectName) {
	for (const file of capabilityFiles) {
		const existingFile = fileMap.get(file.filePath);
		
		// No conflict, just add the file
		if (!existingFile || !file.filePath.includes('.devcontainer/')) {
			fileMap.set(file.filePath, file);
			continue;
		}

		// Handle devcontainer conflicts
		if (devcontainerCapabilities.length > 1 && file.filePath === '.devcontainer/devcontainer.json') {
			handleDevcontainerMerge(file, existingFile, devcontainerCapabilities, configuration, projectName);
			fileMap.set(file.filePath, file);
		} else if (devcontainerCapabilities.length > 1 && file.filePath === '.devcontainer/Dockerfile') {
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
function handleDevcontainerMerge(file, existingFile, devcontainerCapabilities, configuration, projectName) {
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

	try {
		existing = typeof existingConfig === 'string' ? JSON.parse(existingConfig) : existingConfig;
	} catch (e) {
		console.error('Failed to parse existing config:', e);
		throw new Error('Invalid existing devcontainer configuration');
	}

	try {
		newConfigObj = typeof newConfig === 'string' ? JSON.parse(newConfig) : newConfig;
	} catch (e) {
		console.error('Failed to parse new config:', e);
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
 * Gets fallback template content by template ID
 * @param {string} templateId - Template ID
 * @param {Object} context - Template context
 * @returns {string|null} Template content
 */
function getFallbackTemplate(templateId, context) {
	const fallbackTemplates = {
		'devcontainer-node-json': `{
  "name": "{{projectName}}",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:{{nodeVersion}}",
  "features": {
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

RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
`,
		'devcontainer-python-json': `{
  "name": "{{projectName}}",
  "image": "mcr.microsoft.com/devcontainers/python:{{pythonVersion}}",
  "features": {
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
		'devcontainer-python-dockerfile': `FROM mcr.microsoft.com/devcontainers/python:{{pythonVersion}}

RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
`,
		'circleci-config': `version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:22
    steps:
      - checkout
      - run: npm install
      - run: npm test
      - run: npm run lint

workflows:
  test-and-deploy:
    jobs:
      - test`,
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

Generated on ${new Date().toLocaleDateString()} using genproj.`;
}
