/**
 * Preview Generation Service
 *
 * Generates preview data for files and external service changes
 * without requiring authentication. Provides real-time preview updates.
 *
 * @fileoverview Server-side preview generation service
 */

import { capabilities } from '$lib/config/capabilities.js';
import {
	resolveDependencies,
	getCapabilityExecutionOrder
} from '$lib/utils/capability-resolver.js';
import {
	TemplateEngine,
	GEMINI_DEV_ALIAS,
	SHELL_SETUP_SCRIPT,
	GIT_SAFE_DIR_SCRIPT,
	GEMINI_SETUP_SCRIPT,
	PLAYWRIGHT_SETUP_SCRIPT,
	DOPPLER_LOGIN_SCRIPT,
	WRANGLER_LOGIN_SCRIPT,
	SETUP_WRANGLER_SCRIPT
} from '$lib/utils/file-generator.js';
import {
	getCapabilityTemplateData,
	applyDefaults
} from '$lib/utils/capability-template-utils.js';

async function getTemplateEngine() {
	const newInstance = new TemplateEngine();
	await newInstance.initialize();
	return newInstance;
}

/**
 * @typedef {Object} PreviewData
 * @property {Array} files - Array of file objects
 * @property {Array} externalServices - Array of external service changes
 * @property {Object} summary - Preview summary information
 * @property {string} timestamp - Generation timestamp
 */

/**
 * @typedef {Object} FileObject
 * @property {string} path - File path
 * @property {string} name - File name
 * @property {string} content - File content
 * @property {number} size - File size in bytes
 * @property {string} type - File type ('file' or 'folder')
 * @property {Array} children - Child files (for folders)
 */

/**
 * @typedef {Object} ExternalService
 * @property {string} type - Service type (github, circleci, doppler, sonarcloud)
 * @property {string} name - Service name
 * @property {Array} actions - Array of actions to be performed
 * @property {boolean} requiresAuth - Whether authentication is required
 */

/**
 * Generates preview data for the specified project configuration
 * @param {Object} projectConfig - Project configuration object
 * @param {string[]} selectedCapabilities - Array of selected capability IDs
 * @returns {Promise<PreviewData>} Generated preview data
 */
export async function generatePreview(projectConfig, selectedCapabilities) {
	try {
		const resolution = resolveDependencies(selectedCapabilities);
		const executionOrder = getCapabilityExecutionOrder(selectedCapabilities);

		const files = await generatePreviewFiles(projectConfig, executionOrder);

		const externalServices = await generateExternalServiceChanges(projectConfig, executionOrder);

		const summary = createPreviewSummary(projectConfig, resolution, files, externalServices);

		const previewData = {
			files,
			externalServices,
			summary,
			timestamp: new Date().toISOString()
		};

		return previewData;
	} catch (error) {
		console.error('❌ Error generating preview:', error);
		throw new Error(`Failed to generate preview: ${error.message}`);
	}
}

/**
 * Generates all devcontainer-related files.
 * @param {TemplateEngine} templateEngine - The template engine instance.
 * @param {Object} projectConfig - Project configuration.
 * @param {string[]} devContainerCapabilities - Array of devcontainer capability IDs.
 * @param {string[]} allCapabilities - Array of all selected capability IDs.
 * @param {Array<FileObject>} files - Array to push generated file objects into.
 */
async function generateDevelopmentContainerArtifacts(
	templateEngine,
	projectConfig,
	developmentContainerCapabilities,
	allCapabilities,
	files
) {
	const baseDevelopmentContainerId = developmentContainerCapabilities[0];
	const baseCapability = capabilities.find((c) => c.id === baseDevelopmentContainerId);
	const baseCapabilityConfig = applyDefaults(
		baseCapability,
		projectConfig.configuration?.[baseDevelopmentContainerId] || {}
	);

	// Generate base devcontainer.json content
	const baseJsonContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-json`,
		{ ...projectConfig, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);
	let mergedDevelopmentContainerJson = JSON.parse(baseJsonContent);

	const allExtensions = new Set();
	if (mergedDevelopmentContainerJson.customizations?.vscode?.extensions) {
		mergedDevelopmentContainerJson.customizations.vscode.extensions.forEach((ext) =>
			allExtensions.add(ext)
		);
	}

	for (const capabilityId of allCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.vscodeExtensions) {
			capability.vscodeExtensions.forEach((ext) => allExtensions.add(ext));
		}
	}

	// Merge features and extensions from other selected dev containers
	for (let index = 1; index < developmentContainerCapabilities.length; index++) {
		const capabilityId = developmentContainerCapabilities[index];
		const capability = capabilities.find((c) => c.id === capabilityId);
		const capabilityConfig = applyDefaults(
			capability,
			projectConfig.configuration?.[capabilityId] || {}
		);

		const otherJsonContent = templateEngine.generateFile(
			`devcontainer-${capabilityId.split('-')[1]}-json`,
			{ ...projectConfig, capabilityConfig, capability }
		);
		const otherJson = JSON.parse(otherJsonContent);

		if (otherJson.features) {
			mergedDevelopmentContainerJson.features = {
				...mergedDevelopmentContainerJson.features,
				...otherJson.features
			};
		}
		if (otherJson.customizations?.vscode?.extensions) {
			otherJson.customizations.vscode.extensions.forEach((ext) => allExtensions.add(ext));
		}
	}

	if (allExtensions.size > 0) {
		if (!mergedDevelopmentContainerJson.customizations) {
			mergedDevelopmentContainerJson.customizations = {};
		}
		if (!mergedDevelopmentContainerJson.customizations.vscode) {
			mergedDevelopmentContainerJson.customizations.vscode = {};
		}
		mergedDevelopmentContainerJson.customizations.vscode.extensions = Array.from(allExtensions);
	}

	files.push({
		path: '.devcontainer/devcontainer.json',
		name: 'devcontainer.json',
		content: JSON.stringify(mergedDevelopmentContainerJson, null, 2),
		size: JSON.stringify(mergedDevelopmentContainerJson, null, 2).length,
		type: 'file'
	});

	// For Dockerfile, use the base one. Merging Dockerfiles is complex and a future improvement.
	const dockerfileContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-dockerfile`,
		{ ...projectConfig, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);
	files.push({
		path: '.devcontainer/Dockerfile',
		name: 'Dockerfile',
		content: dockerfileContent,
		size: dockerfileContent.length,
		type: 'file'
	});

	const zshrcContent = templateEngine.generateFile('devcontainer-zshrc-full', {
		...projectConfig,
		geminiDevAlias: allCapabilities.includes('doppler') ? GEMINI_DEV_ALIAS : ''
	});
	files.push({
		path: '.devcontainer/.zshrc',
		name: '.zshrc',
		content: zshrcContent,
		size: zshrcContent.length,
		type: 'file'
	});

	const p10kContent = templateEngine.generateFile('devcontainer-p10k-zsh-full', projectConfig);
	files.push({
		path: '.devcontainer/.p10k.zsh',
		name: '.p10k.zsh',
		content: p10kContent,
		size: p10kContent.length,
		type: 'file'
	});

	const postCreateContent = templateEngine.generateFile('devcontainer-post-create-setup-sh', {
		...projectConfig,
		shellSetup: allCapabilities.includes('shell-tools')
			? SHELL_SETUP_SCRIPT.replaceAll('{{projectName}}', projectConfig.name || 'my-project')
			: '',
		gitSafeDirectory: GIT_SAFE_DIR_SCRIPT.replaceAll(
			'{{projectName}}',
			projectConfig.name || 'my-project'
		),
		geminiSetup: allCapabilities.includes('coding-agents') ? GEMINI_SETUP_SCRIPT : '',
		playwrightSetup: allCapabilities.includes('playwright') ? PLAYWRIGHT_SETUP_SCRIPT : ''
	});
	files.push({
		path: '.devcontainer/post-create-setup.sh',
		name: 'post-create-setup.sh',
		content: postCreateContent,
		size: postCreateContent.length,
		type: 'file'
	});
}

/**
 * Generates files for non-devcontainer capabilities
 * @param {TemplateEngine} templateEngine - The template engine instance
 * @param {Object} projectConfig - Project configuration
 * @param {string[]} otherCapabilities - Array of non-devcontainer capability IDs
 * @param {Array<FileObject>} files - Array to push generated file objects into
 */
async function generateNonDevelopmentContainerFiles(
	templateEngine,
	projectConfig,
	otherCapabilities,
	files
) {
	for (const capabilityId of otherCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.templates) {
			for (const template of capability.templates) {
				try {
					const extraData = getCapabilityTemplateData(capabilityId, {
						capabilities: otherCapabilities,
						configuration: projectConfig.configuration
					});

					const content = templateEngine.generateFile(template.templateId, {
						...projectConfig,
						...extraData,
						projectName: projectConfig.name || 'my-project',
						capabilityConfig: projectConfig.configuration?.[capabilityId] || {},
						capability
					});
					files.push({
						path: template.filePath,
						name: template.filePath.split('/').pop(),
						content,
						size: content.length,
						type: 'file'
					});
				} catch (error) {
					console.warn(`⚠️ Failed to process template ${template.templateId}:`, error);
				}
			}
		}
	}
}

function generatePackageJsonFile(templateEngine, projectConfig, allCapabilities) {
	if (allCapabilities.includes('devcontainer-node')) {
		let scripts = '';
		let devDependencies = '';
		let dependencies = '';

		if (allCapabilities.includes('cloudflare-wrangler')) {
			scripts += ',\n    "deploy": "wrangler deploy"';
			devDependencies += '"wrangler": "^3.0.0"';
		}

		const content = templateEngine.generateFile('package-json', {
			...projectConfig,
			scripts,
			devDependencies,
			dependencies,
			projectName: projectConfig.name || 'my-project'
		});

		return {
			path: 'package.json',
			name: 'package.json',
			content,
			size: content.length,
			type: 'file'
		};
	}
	return null;
}

async function generateCloudflareFiles(templateEngine, projectConfig, allCapabilities, files) {
	if (!allCapabilities.includes('cloudflare-wrangler')) return;

	const hasDoppler = allCapabilities.includes('doppler');
	const projectName = projectConfig.name || 'my-project';
	const compatibilityDate = new Date().toISOString().split('T')[0];

	// cloud_login.sh
	const dopplerLogin = hasDoppler
		? DOPPLER_LOGIN_SCRIPT.replaceAll('{{projectName}}', projectName)
		: '';

	const wranglerLogin = WRANGLER_LOGIN_SCRIPT;

	const setupWrangler = hasDoppler
		? SETUP_WRANGLER_SCRIPT.replaceAll('{{projectName}}', projectName)
		: '';

	const cloudLoginContent = templateEngine.generateFile('scripts-cloud-login-sh', {
		...projectConfig,
		dopplerLogin,
		wranglerLogin,
		setupWrangler
	});

	files.push({
		path: 'scripts/cloud_login.sh',
		name: 'cloud_login.sh',
		content: cloudLoginContent,
		size: cloudLoginContent.length,
		type: 'file'
	});

	if (hasDoppler) {
		const templateContent = templateEngine.generateFile('wrangler-template-jsonc', {
			...projectConfig,
			projectName: projectConfig.name || 'my-project',
			compatibilityDate
		});
		files.push({
			path: 'wrangler.template.jsonc',
			name: 'wrangler.template.jsonc',
			content: templateContent,
			size: templateContent.length,
			type: 'file'
		});

		const setupContent = templateEngine.generateFile(
			'scripts-setup-wrangler-config-sh',
			projectConfig
		);
		files.push({
			path: 'scripts/setup-wrangler-config.sh',
			name: 'setup-wrangler-config.sh',
			content: setupContent,
			size: setupContent.length,
			type: 'file'
		});
	} else {
		const wranglerContent = templateEngine.generateFile('wrangler-jsonc', {
			...projectConfig,
			projectName: projectConfig.name || 'my-project',
			compatibilityDate
		});
		files.push({
			path: 'wrangler.jsonc',
			name: 'wrangler.jsonc',
			content: wranglerContent,
			size: wranglerContent.length,
			type: 'file'
		});
	}
}

function generateGitignoreFile(templateEngine, projectConfig, allCapabilities) {
	const hasDoppler = allCapabilities.includes('doppler');
	const hasWrangler = allCapabilities.includes('cloudflare-wrangler');
	const hasPython = allCapabilities.some((c) => c.startsWith('devcontainer-python'));
	const hasJava = allCapabilities.some((c) => c.startsWith('devcontainer-java'));

	let wranglerIgnore = '';
	if (hasWrangler && hasDoppler) {
		wranglerIgnore = 'wrangler.jsonc';
	}

	const pythonIgnore = hasPython
		? '\n# Python\n__pycache__/\n*.py[cod]\n*$py.class\n.venv\nvenv/\n*.manifest'
		: '';
	const javaIgnore = hasJava
		? '\n# Java\n*.class\n*.log\n*.ctxt\n.mtj.tmp/\n*.jar\n*.war\n*.nar\n*.ear\n*.zip\n*.tar.gz\n*.rar\ntarget/'
		: '';

	const content = templateEngine.generateFile('gitignore', {
		...projectConfig,
		wranglerIgnore,
		pythonIgnore,
		javaIgnore
	});

	return {
		path: '.gitignore',
		name: '.gitignore',
		content,
		size: content.length,
		type: 'file'
	};
}

/**
 * Generates preview files for the project
 * @param {Object} projectConfig - Project configuration
 * @param {string[]} executionOrder - Capability execution order
 * @returns {Promise<Array<FileObject>>} Array of file objects
 */
async function generatePreviewFiles(projectConfig, executionOrder) {
	const templateEngine = await getTemplateEngine();

	const developmentContainerCapabilities = executionOrder.filter((c) =>
		c.startsWith('devcontainer-')
	);
	const otherCapabilities = executionOrder.filter((c) => !c.startsWith('devcontainer-'));

	const files = [];

	await generateNonDevelopmentContainerFiles(
		templateEngine,
		projectConfig,
		otherCapabilities,
		files
	);

	// Handle devcontainer capabilities with merging logic
	if (developmentContainerCapabilities.length > 0) {
		await generateDevelopmentContainerArtifacts(
			templateEngine,
			projectConfig,
			developmentContainerCapabilities,
			executionOrder,
			files
		);
	}

	// Generate Cloudflare files
	await generateCloudflareFiles(templateEngine, projectConfig, executionOrder, files);

	// Generate package.json
	const packageJsonFile = generatePackageJsonFile(templateEngine, projectConfig, executionOrder);
	if (packageJsonFile) {
		files.push(packageJsonFile);
	}

	// Generate .gitignore
	files.push(generateGitignoreFile(templateEngine, projectConfig, executionOrder));

	// Generate README.md
	const readmeFile = generateReadmeFile(projectConfig, executionOrder);
	files.push(readmeFile);

	// Organize files into folder structure
	return organizeFilesIntoFolders(files);
}

/**
 * Generates README.md file
 * @param {Object} projectConfig - Project configuration
 * @param {string[]} executionOrder - Capability execution order
 * @returns {FileObject} README file object
 */
function generateReadmeFile(projectConfig, executionOrder) {
	const selectedCapabilities = executionOrder
		.map((id) => capabilities.find((c) => c.id === id))
		.filter(Boolean);

	let capabilitiesSection = '';
	if (selectedCapabilities.length > 0) {
		capabilitiesSection = `
## Capabilities

This project includes the following capabilities:

${selectedCapabilities.map((cap) => `- **${cap.name}**: ${cap.description}`).join('\n')}
`;
	}

	const readmeContent = `# ${projectConfig.name}

${projectConfig.description || 'A project generated with genproj'}
${capabilitiesSection}
## Setup

1. Clone the repository
2. Install dependencies
3. Follow the setup instructions for each capability

## Usage

See individual capability documentation for usage instructions.

## Generated by genproj

This project was generated using the genproj tool on ${new Date().toLocaleDateString()}.
`;

	return {
		path: 'README.md',
		name: 'README.md',
		content: readmeContent,
		size: readmeContent.length,
		type: 'file'
	};
}

/**
 * Generates external service changes preview
 * @param {Object} projectConfig - Project configuration
 * @param {string[]} executionOrder - Capability execution order
 * @returns {Promise<Array<ExternalService>>} Array of external service changes
 */
async function generateExternalServiceChanges(projectConfig, executionOrder) {
	const services = [
		{
			type: 'github',
			name: 'GitHub Repository',
			actions: [
				{
					type: 'create',
					description: projectConfig.repositoryUrl
						? `Link to existing repository: ${projectConfig.repositoryUrl}`
						: `Create new repository: ${projectConfig.name}`
				},
				{
					type: 'configure',
					description: `Set repository visibility: ${projectConfig.isPrivate ? 'Private' : 'Public'}`
				}
			],
			requiresAuth: true
		}
	];

	for (const capabilityId of executionOrder) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) continue;

		const serviceChanges = await generateCapabilityServiceChanges(projectConfig, capability);
		services.push(...serviceChanges);
	}

	return services;
}

/**
 * Generates service changes for a specific capability
 * @param {Object} projectConfig - Project configuration
 * @param {Object} capability - Capability definition
 * @returns {Promise<Array<ExternalService>>} Array of service changes
 */
async function generateCapabilityServiceChanges(projectConfig, capability) {
	const services = [];

	if (capability.externalServices) {
		for (const serviceConfig of capability.externalServices) {
			services.push({
				type: serviceConfig.type,
				name: serviceConfig.name,
				actions: serviceConfig.actions.map((action) => ({
					type: action.type,
					description: action.description.replace('{{name}}', projectConfig.name)
				})),
				requiresAuth: serviceConfig.requiresAuth
			});
		}
	}

	return services;
}

/**
 * Organizes files into folder structure
 * @param {Array<FileObject>} files - Array of file objects
 * @returns {Array<FileObject>} Organized files with folder structure
 */
export function organizeFilesIntoFolders(files) {
	const root = [];
	const folderMap = new Map();

	// Sort files by path to ensure folders are created in order?
	// Not strictly necessary if we build the tree dynamically.

	for (const file of files) {
		const pathParts = file.path.split('/');

		// If it's a file at root
		if (pathParts.length === 1) {
			root.push(file);
			continue;
		}

		// It's in a folder. Traverse/Create structure.
		let currentLevel = root;
		let currentPath = '';

		for (let i = 0; i < pathParts.length - 1; i++) {
			const folderName = pathParts[i];
			currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

			let folder = currentLevel.find((f) => f.type === 'folder' && f.name === folderName);

			if (!folder) {
				folder = {
					path: currentPath,
					name: folderName,
					type: 'folder',
					children: [],
					// Size of a folder is not strictly defined, but we could sum it up.
					// For now, let's leave it undefined or 0.
					size: 0
				};
				currentLevel.push(folder);
			}

			// Add file size to folder size (optional, but nice)
			folder.size += file.size;

			currentLevel = folder.children;
		}

		// Add the file to the leaf folder
		currentLevel.push(file);
	}

	// Optional: Sort items so folders come first or alphabetically
	const sortItems = (items) => {
		items.sort((a, b) => {
			if (a.type === b.type) {
				return a.name.localeCompare(b.name);
			}
			return a.type === 'folder' ? -1 : 1;
		});
		items.forEach((item) => {
			if (item.type === 'folder') {
				sortItems(item.children);
			}
		});
	};

	sortItems(root);

	return root;
}

/**
 * Creates preview summary information
 * @param {Object} projectConfig - Project configuration
 * @param {Object} resolution - Dependency resolution result
 * @param {Array<FileObject>} files - Generated files
 * @param {Array<ExternalService>} services - External service changes
 * @returns {Object} Summary information
 */
function createPreviewSummary(projectConfig, resolution, files, services) {
	const totalFileSize = files.reduce((total, file) => total + file.size, 0);
	const authRequiredServices = services.filter((service) => service.requiresAuth);

	return {
		projectName: projectConfig.name,
		totalCapabilities: resolution.resolvedCapabilities.length,
		selectedCapabilities:
			resolution.resolvedCapabilities.length - resolution.addedDependencies.length,
		addedDependencies: resolution.addedDependencies.length,
		totalFiles: files.length,
		totalFileSize,
		externalServices: services.length,
		authRequiredServices: authRequiredServices.length,
		conflicts: resolution.conflicts.length,
		isValid: resolution.isValid
	};
}
