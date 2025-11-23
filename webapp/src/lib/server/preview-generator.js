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
import { TemplateEngine } from '$lib/utils/file-generator.js';
import { getCapabilityTemplateData } from '$lib/utils/capability-template-utils.js';

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
 * @param {Array<FileObject>} files - Array to push generated file objects into.
 */
async function generateDevContainerArtifacts(templateEngine, projectConfig, devContainerCapabilities, files) {
	const baseDevContainerId = devContainerCapabilities[0];
	const baseCapability = capabilities.find((c) => c.id === baseDevContainerId);
	const baseCapabilityConfig = projectConfig.configuration?.[baseDevContainerId] || {};

	// Generate base devcontainer.json content
	const baseJsonContent = templateEngine.generateFile(
		`devcontainer-${baseDevContainerId.split('-')[1]}-json`,
		{ ...projectConfig, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);
	let mergedDevContainerJson = JSON.parse(baseJsonContent);

	// Merge features and extensions from other selected dev containers
	for (let i = 1; i < devContainerCapabilities.length; i++) {
		const capabilityId = devContainerCapabilities[i];
		const capability = capabilities.find((c) => c.id === capabilityId);
		const capabilityConfig = projectConfig.configuration?.[capabilityId] || {};

		const otherJsonContent = templateEngine.generateFile(
			`devcontainer-${capabilityId.split('-')[1]}-json`,
			{ ...projectConfig, capabilityConfig, capability }
		);
		const otherJson = JSON.parse(otherJsonContent);

		if (otherJson.features) {
			mergedDevContainerJson.features = {
				...mergedDevContainerJson.features,
				...otherJson.features
			};
		}
		if (otherJson.customizations?.vscode?.extensions) {
			const baseExtensions = mergedDevContainerJson.customizations?.vscode?.extensions || [];
			mergedDevContainerJson.customizations.vscode.extensions = [
				...new Set([...baseExtensions, ...otherJson.customizations.vscode.extensions])
			];
		}
	}

	files.push({
		path: '.devcontainer/devcontainer.json',
		name: 'devcontainer.json',
		content: JSON.stringify(mergedDevContainerJson, null, 2),
		size: JSON.stringify(mergedDevContainerJson, null, 2).length,
		type: 'file'
	});

	// For Dockerfile, use the base one. Merging Dockerfiles is complex and a future improvement.
	const dockerfileContent = templateEngine.generateFile(
		`devcontainer-${baseDevContainerId.split('-')[1]}-dockerfile`,
		{ ...projectConfig, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);
	files.push({
		path: '.devcontainer/Dockerfile',
		name: 'Dockerfile',
		content: dockerfileContent,
		size: dockerfileContent.length,
		type: 'file'
	});

	const zshrcContent = templateEngine.generateFile('devcontainer-zshrc-full', projectConfig);
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

	const postCreateContent = templateEngine.generateFile(
		'devcontainer-post-create-setup-sh',
		projectConfig
	);
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
async function generateNonDevContainerFiles(templateEngine, projectConfig, otherCapabilities, files) {
	for (const capabilityId of otherCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.templates) {
			for (const template of capability.templates) {
				try {
					const extraData = getCapabilityTemplateData(capabilityId, { capabilities: otherCapabilities });

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

/**
 * Generates preview files for the project
 * @param {Object} projectConfig - Project configuration
 * @param {string[]} executionOrder - Capability execution order
 * @returns {Promise<Array<FileObject>>} Array of file objects
 */
async function generatePreviewFiles(projectConfig, executionOrder) {
	const templateEngine = await getTemplateEngine();

	const devContainerCapabilities = executionOrder.filter((c) => c.startsWith('devcontainer-'));
	const otherCapabilities = executionOrder.filter((c) => !c.startsWith('devcontainer-'));


	const files = [];

	await generateNonDevContainerFiles(templateEngine, projectConfig, otherCapabilities, files);

	// Handle devcontainer capabilities with merging logic
	if (devContainerCapabilities.length > 0) {
		await generateDevContainerArtifacts(templateEngine, projectConfig, devContainerCapabilities, files);
	}


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
function organizeFilesIntoFolders(files) {
	const folderMap = new Map();
	const organizedFiles = [];

	for (const file of files) {
		const pathParts = file.path.split('/');
		const folderPath = pathParts.slice(0, -1).join('/') || '/';

		if (!folderMap.has(folderPath)) {
			folderMap.set(folderPath, []);
		}
		folderMap.get(folderPath).push(file);
	}

	for (const [folderPath, folderFiles] of folderMap) {
		if (folderPath === '/') {
			organizedFiles.push(...folderFiles);
		} else {
			const folderName = folderPath.split('/').pop();
			organizedFiles.push({
				path: folderPath,
				name: folderName,
				type: 'folder',
				children: folderFiles
			});
		}
	}

	return organizedFiles;
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
