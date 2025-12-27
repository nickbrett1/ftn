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
import { getCapabilityTemplateData, applyDefaults } from '$lib/utils/capability-template-utils.js';

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
 * Creates the merged devcontainer.json file.
 * @param {TemplateEngine} templateEngine - The template engine instance.
 * @param {Object} projectConfig - Project configuration.
 * @param {string[]} devContainerCapabilities - Array of devcontainer capability IDs.
 * @param {string[]} allCapabilities - Array of all selected capability IDs.
 * @returns {FileObject} The generated devcontainer.json file object.
 */
function createMergedDevelopmentContainerJson(
	templateEngine,
	projectConfig,
	developmentContainerCapabilities,
	allCapabilities
) {
	const baseId = developmentContainerCapabilities[0];
	const baseCap = capabilities.find((c) => c.id === baseId);
	const baseConfig = applyDefaults(baseCap, projectConfig.configuration?.[baseId] || {});

	const baseJsonContent = templateEngine.generateFile(`devcontainer-${baseId.split('-')[1]}-json`, {
		...projectConfig,
		capabilityConfig: baseConfig,
		capability: baseCap
	});
	const mergedJson = JSON.parse(baseJsonContent);
	const allExtensions = new Set(mergedJson.customizations?.vscode?.extensions);

	for (const id of allCapabilities)
		capabilities
			.find((c) => c.id === id)
			?.vscodeExtensions?.forEach((extension) => allExtensions.add(extension));

	for (let index = 1; index < developmentContainerCapabilities.length; index++) {
		const capId = developmentContainerCapabilities[index];
		const cap = capabilities.find((c) => c.id === capId);
		const capConfig = applyDefaults(cap, projectConfig.configuration?.[capId] || {});
		const otherJsonContent = templateEngine.generateFile(
			`devcontainer-${capId.split('-')[1]}-json`,
			{ ...projectConfig, capabilityConfig: capConfig, capability: cap }
		);
		const otherJson = JSON.parse(otherJsonContent);

		if (otherJson.features) {
			mergedJson.features = { ...mergedJson.features, ...otherJson.features };
		}
		const extensions = otherJson.customizations?.vscode?.extensions;
		if (extensions) {
			for (const extension of extensions) {
				allExtensions.add(extension);
			}
		}
	}

	if (allExtensions.size > 0) {
		mergedJson.customizations = mergedJson.customizations || {};
		mergedJson.customizations.vscode = mergedJson.customizations.vscode || {};
		mergedJson.customizations.vscode.extensions = [...allExtensions];
	}

	const content = JSON.stringify(mergedJson, null, 2);
	return {
		path: '.devcontainer/devcontainer.json',
		name: 'devcontainer.json',
		content,
		size: content.length,
		type: 'file'
	};
}

/**
 * Creates the Dockerfile for the devcontainer.
 * @param {TemplateEngine} templateEngine - The template engine instance.
 * @param {Object} projectConfig - Project configuration.
 * @param {string[]} devContainerCapabilities - Array of devcontainer capability IDs.
 * @returns {FileObject} The generated Dockerfile object.
 */
function createDevelopmentContainerDockerfile(
	templateEngine,
	projectConfig,
	developmentContainerCapabilities
) {
	const baseId = developmentContainerCapabilities[0];
	const baseCap = capabilities.find((c) => c.id === baseId);
	const baseConfig = applyDefaults(baseCap, projectConfig.configuration?.[baseId] || {});
	const content = templateEngine.generateFile(`devcontainer-${baseId.split('-')[1]}-dockerfile`, {
		...projectConfig,
		capabilityConfig: baseConfig,
		capability: baseCap
	});
	return {
		path: '.devcontainer/Dockerfile',
		name: 'Dockerfile',
		content,
		size: content.length,
		type: 'file'
	};
}

/**
 * Creates shell-related files for the devcontainer.
 * @param {TemplateEngine} templateEngine - The template engine instance.
 * @param {Object} projectConfig - Project configuration.
 * @param {string[]} allCapabilities - Array of all selected capability IDs.
 * @returns {Array<FileObject>} An array of generated file objects.
 */
function createDevelopmentContainerShellFiles(templateEngine, projectConfig, allCapabilities) {
	const zshrcContent = templateEngine.generateFile('devcontainer-zshrc-full', {
		...projectConfig,
		geminiDevAlias: allCapabilities.includes('doppler') ? GEMINI_DEV_ALIAS : ''
	});

	const p10kContent = templateEngine.generateFile('devcontainer-p10k-zsh-full', projectConfig);

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

	return [
		{
			path: '.devcontainer/.zshrc',
			name: '.zshrc',
			content: zshrcContent,
			size: zshrcContent.length,
			type: 'file'
		},
		{
			path: '.devcontainer/.p10k.zsh',
			name: '.p10k.zsh',
			content: p10kContent,
			size: p10kContent.length,
			type: 'file'
		},
		{
			path: '.devcontainer/post-create-setup.sh',
			name: 'post-create-setup.sh',
			content: postCreateContent,
			size: postCreateContent.length,
			type: 'file'
		}
	];
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
	if (developmentContainerCapabilities.length === 0) return;

	files.push(
		createMergedDevelopmentContainerJson(
			templateEngine,
			projectConfig,
			developmentContainerCapabilities,
			allCapabilities
		),
		createDevelopmentContainerDockerfile(
			templateEngine,
			projectConfig,
			developmentContainerCapabilities
		),
		...createDevelopmentContainerShellFiles(templateEngine, projectConfig, allCapabilities)
	);
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

					// Special handling for SvelteKit config adapter
					let adapterPackage = '@sveltejs/adapter-auto';
					if (capabilityId === 'sveltekit' && otherCapabilities.includes('cloudflare-wrangler')) {
						adapterPackage = '@sveltejs/adapter-cloudflare';
					}

					const content = templateEngine.generateFile(template.templateId, {
						...projectConfig,
						...extraData,
						projectName: projectConfig.name || 'my-project',
						capabilityConfig: projectConfig.configuration?.[capabilityId] || {},
						capability,
						adapterPackage
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
		let scripts = ',\n    "build": "echo \'No build step required\'"';
		let devDependencies = '';
		let dependencies = '';
		let typeField = '';

		const hasSvelteKit = allCapabilities.includes('sveltekit');
		const hasWrangler = allCapabilities.includes('cloudflare-wrangler');

		if (hasSvelteKit) {
			typeField = 'module';
			scripts =
				',\n    "dev": "vite dev",\n    "build": "vite build",\n    "preview": "vite preview",\n    "check": "svelte-kit sync && svelte-check --tsconfig ./jsconfig.json",\n    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./jsconfig.json --watch"';
			devDependencies +=
				'"@sveltejs/kit": "^2.0.0",\n    "@sveltejs/vite-plugin-svelte": "^3.0.0",\n    "svelte": "^5.0.0",\n    "svelte-check": "^3.6.0",\n    "typescript": "^5.0.0",\n    "vite": "^5.0.0"';

			if (hasWrangler) {
				scripts += ',\n    "deploy": "wrangler deploy"';
				devDependencies += ',\n    "@sveltejs/adapter-cloudflare": "^5.0.0"';
				// Wrangler is also needed as dev dep
				devDependencies += ',\n    "wrangler": "^4.54.0"';
			} else {
				devDependencies += ',\n    "@sveltejs/adapter-auto": "^3.0.0"';
			}
		} else {
			// Normal Node.js setup
			if (hasWrangler) {
				scripts += ',\n    "deploy": "wrangler deploy"';
				devDependencies += '"wrangler": "^4.54.0"';
				typeField = 'module'; // Wrangler projects are usually modules
			} else {
				typeField = 'commonjs';
			}
		}

		const content = templateEngine.generateFile('package-json', {
			...projectConfig,
			scripts,
			devDependencies,
			dependencies,
			typeField,
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
	const hasSvelteKit = allCapabilities.includes('sveltekit');
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

	// If SvelteKit is present, we don't generate src/index.js (worker entry point)
	// because SvelteKit manages its own entry point via the adapter.
	// But we still need wrangler configuration.

	const mainEntryPoint = hasSvelteKit ? '.svelte-kit/cloudflare/_worker.js' : 'src/index.js';

	if (!hasSvelteKit) {
		const indexJsContent = templateEngine.generateFile('cloudflare-worker-index-js', projectConfig);
		files.push({
			path: 'src/index.js',
			name: 'index.js',
			content: indexJsContent,
			size: indexJsContent.length,
			type: 'file'
		});
	}

	if (hasDoppler) {
		const templateContent = templateEngine.generateFile('wrangler-template-jsonc', {
			...projectConfig,
			projectName: projectConfig.name || 'my-project',
			compatibilityDate,
			mainEntryPoint
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
			compatibilityDate,
			mainEntryPoint
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

	// Generate .gitignore and README.md
	files.push(
		generateGitignoreFile(templateEngine, projectConfig, executionOrder),
		generateReadmeFile(projectConfig, executionOrder)
	);

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

		for (let index = 0; index < pathParts.length - 1; index++) {
			const folderName = pathParts[index];
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
		for (const item of items) {
			if (item.type === 'folder') {
				sortItems(item.children);
			}
		}
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
