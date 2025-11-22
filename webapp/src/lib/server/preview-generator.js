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
import { TemplateEngine } from '$lib/utils/file-generator.js'; // Import TemplateEngine

async function getTemplateEngine(r2Bucket) {
	// Accept r2Bucket as an argument
	const newInstance = new TemplateEngine(r2Bucket); // Pass r2Bucket
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
 * @param {Object} r2Bucket - The R2 bucket instance for template loading
 * @returns {Promise<PreviewData>} Generated preview data
 */
export async function generatePreview(projectConfig, selectedCapabilities, r2Bucket) {
	// Accept r2Bucket as an argument
	try {
		console.log('🔍 Generating preview for project:', projectConfig.name);

		// Resolve dependencies and get execution order
		const resolution = resolveDependencies(selectedCapabilities);
		const executionOrder = getCapabilityExecutionOrder(selectedCapabilities);

		// Generate files
		const files = await generatePreviewFiles(projectConfig, executionOrder, r2Bucket); // Pass r2Bucket

		// Generate external service changes
		const externalServices = await generateExternalServiceChanges(
			projectConfig,
			executionOrder,
			r2Bucket
		); // Pass r2Bucket

		// Create summary
		const summary = createPreviewSummary(projectConfig, resolution, files, externalServices);

		const previewData = {
			files,
			externalServices,
			summary,
			timestamp: new Date().toISOString()
		};

		console.log(`✅ Generated preview: ${files.length} files, ${externalServices.length} services`);

		return previewData;
	} catch (error) {
		console.error('❌ Error generating preview:', error);
		throw new Error(`Failed to generate preview: ${error.message}`);
	}
}

/**
 * Generates preview files for the project
 * @param {Object} projectConfig - Project configuration
 * @param {string[]} executionOrder - Capability execution order
 * @returns {Promise<Array<FileObject>>} Array of file objects
 */
async function generatePreviewFiles(projectConfig, executionOrder, r2Bucket) {
	// Make function async
	const files = [];

	// Generate files for each capability
	for (const capabilityId of executionOrder) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) continue;

		const capabilityFiles = await generateCapabilityFiles(projectConfig, capability, r2Bucket); // Await the call
		files.push(...capabilityFiles);
	}

	// Generate README.md
	const readmeFile = generateReadmeFile(projectConfig, executionOrder);
	files.push(readmeFile);

	// Organize files into folder structure
	return organizeFilesIntoFolders(files);
}

/**
 * Generates files for a specific capability
 * @param {Object} projectConfig - Project configuration
 * @param {Object} capability - Capability definition
 * @returns {Promise<Array<FileObject>>} Array of file objects
 */
async function generateCapabilityFiles(projectConfig, capability, r2Bucket) {
	// Make function async
	const files = [];
	const capabilityConfig = projectConfig.configuration?.[capability.id] || {};
	const templateEngine = await getTemplateEngine(r2Bucket); // Get the initialized template engine

	// Generate capability-specific files
	if (capability.templates) {
		for (const template of capability.templates) {
			try {
				const content = await templateEngine.generateFile(template.templateId, {
					// Await the call
					...projectConfig,
					capabilityConfig,
					capability
				});

				files.push({
					path: template.filePath, // Use filePath from template
					name: template.filePath.split('/').pop(), // Use filePath from template
					content,
					size: content.length,
					type: 'file'
				});
			} catch (error) {
				console.warn(`⚠️ Failed to process template ${template.templateId}:`, error); // Log templateId
			}
		}
	}

	return files;
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

	const readmeContent = `# ${projectConfig.name}

${projectConfig.description || 'A project generated with genproj'}

## Capabilities

This project includes the following capabilities:

${selectedCapabilities.map((cap) => `- **${cap.name}**: ${cap.description}`).join('\n')}

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
async function generateExternalServiceChanges(projectConfig, executionOrder, r2Bucket) {
	// Make async
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

	// GitHub service (always required)

	// Generate service changes for each capability
	for (const capabilityId of executionOrder) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (!capability) continue;

		const serviceChanges = await generateCapabilityServiceChanges(
			projectConfig,
			capability,
			r2Bucket
		); // Await the call
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
async function generateCapabilityServiceChanges(projectConfig, capability, r2Bucket) {
	// Make async
	const services = [];
	const templateEngine = await getTemplateEngine(r2Bucket); // Get the initialized template engine

	if (capability.externalServices) {
		for (const serviceConfig of capability.externalServices) {
			services.push({
				type: serviceConfig.type,
				name: serviceConfig.name,
				actions: serviceConfig.actions.map((action) => ({
					type: action.type,
					description: templateEngine.compileTemplate(action.description, {
						// Use compileTemplate
						...projectConfig,
						capability
					})
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
	const map = new Map();

	// Helper to get or create folder
	const getFolder = (path, name) => {
		if (!map.has(path)) {
			const folder = {
				path,
				name,
				type: 'folder',
				children: [],
				size: 0
			};
			map.set(path, folder);

			// Add to parent
			const parts = path.split('/');
			if (parts.length > 1) {
				const parentPath = parts.slice(0, -1).join('/');
				const parentName = parts.at(-2);
				const parent = getFolder(parentPath, parentName);
				parent.children.push(folder);
			} else {
				root.push(folder);
			}
		}
		return map.get(path);
	};

	for (const file of files) {
		const parts = file.path.split('/');
		if (parts.length > 1) {
			const folderPath = parts.slice(0, -1).join('/');
			const folderName = parts.at(-2);
			const folder = getFolder(folderPath, folderName);
			folder.children.push(file);

			// Update folder sizes up the tree
			let currentPath = folderPath;
			while (currentPath) {
				const currentFolder = map.get(currentPath);
				if (currentFolder) {
					currentFolder.size += file.size;
				}
				const currentParts = currentPath.split('/');
				if (currentParts.length <= 1) break;
				currentPath = currentParts.slice(0, -1).join('/');
			}
		} else {
			root.push(file);
		}
	}

	// Sort function: folders first, then alphabetical
	const sortItems = (a, b) => {
		if (a.type === b.type) {
			return a.name.localeCompare(b.name);
		}
		return a.type === 'folder' ? -1 : 1;
	};

	// Recursively sort
	const sortRecursive = (items) => {
		items.sort(sortItems);
		for (const item of items) {
			if (item.type === 'folder' && item.children) {
				sortRecursive(item.children);
			}
		}
		return items;
	};

	return sortRecursive(root);
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
