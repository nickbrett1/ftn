// webapp/src/lib/utils/file-generator.js

import devcontainerJavaDockerfile from '../templates/devcontainer-java-dockerfile.template?raw';
import devcontainerNodeDockerfile from '../templates/devcontainer-node-dockerfile.template?raw';
import devcontainerNodeJson from '../templates/devcontainer-node-json.template?raw';
import devcontainerP10kZshFull from '../templates/devcontainer-p10k-zsh-full.template?raw';
import devcontainerP10kZsh from '../templates/devcontainer-p10k-zsh.template?raw';
import devcontainerPostCreateSetupSh from '../templates/devcontainer-post-create-setup-sh.template?raw';
import devcontainerJavaDockerfile from '../templates/devcontainer-java-dockerfile.template?raw';
import devcontainerJavaJson from '../templates/devcontainer-java-json.template?raw'; // New import
import devcontainerNodeDockerfile from '../templates/devcontainer-node-dockerfile.template?raw';
import devcontainerNodeJson from '../templates/devcontainer-node-json.template?raw';
import devcontainerP10kZshFull from '../templates/devcontainer-p10k-zsh-full.template?raw';
import devcontainerP10kZsh from '../templates/devcontainer-p10k-zsh.template?raw';
import devcontainerPostCreateSetupSh from '../templates/devcontainer-post-create-setup-sh.template?raw';
import devcontainerPythonDockerfile from '../templates/devcontainer-python-dockerfile.template?raw';
import devcontainerPythonJson from '../templates/devcontainer-python-json.template?raw'; // New import
import devcontainerZshrcFull from '../templates/devcontainer-zshrc-full.template?raw';
import devcontainerZshrc from '../templates/devcontainer-zshrc.template?raw';
import playwrightConfig from '../templates/playwright-config.template?raw';
import { capabilities } from '$lib/config/capabilities.js';

const templateImports = {
	'devcontainer-java-dockerfile': devcontainerJavaDockerfile,
	'devcontainer-java-json': devcontainerJavaJson, // New entry
	'devcontainer-node-dockerfile': devcontainerNodeDockerfile,
	'devcontainer-node-json': devcontainerNodeJson,
	'devcontainer-p10k-zsh-full': devcontainerP10kZshFull,
	'devcontainer-p10k-zsh': devcontainerP10kZsh,
	'devcontainer-post-create-setup-sh': devcontainerPostCreateSetupSh,
	'devcontainer-python-dockerfile': devcontainerPythonDockerfile,
	'devcontainer-python-json': devcontainerPythonJson, // New entry
	'devcontainer-zshrc-full': devcontainerZshrcFull,
	'devcontainer-zshrc': devcontainerZshrc,
	'playwright-config': playwrightConfig
};

export class TemplateEngine {
	constructor() {
		this.templates = new Map();
		this.initialized = false;
	}

	async initialize() {
		if (this.initialized) {
			return true;
		}
		try {
			// Load raw template strings
			for (const [templateId, templateString] of Object.entries(templateImports)) {
				this.templates.set(templateId, templateString);
			}

			this.initialized = true;
			return true;
		} catch (error) {
			console.error('Failed to initialize TemplateEngine:', error);
			return false;
		}
	}

	getTemplate(name) {
		return this.templates.get(name) || null;
	}

	compileTemplate(templateString, data) {
		let content = templateString;
		const regex = /{{(.*?)}}/g;

		content = content.replace(regex, (match, key) => {
			const keys = key.trim().split('.');
			let value = data;
			for (const k of keys) {
				if (value && typeof value === 'object' && k in value) {
					value = value[k];
				} else {
					return match; // Return original match if path not found
				}
			}
			return value;
		});

		return content;
	}

	generateFile(templateId, data) {
		const template = this.getTemplate(templateId);
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}
		return this.compileTemplate(template, data);
	}

	generateFiles(fileRequests) {
		const results = [];
		for (const [index, req] of fileRequests.entries()) {
			try {
				const content = this.generateFile(req.templateId, { ...req.data, index });
				results.push({ ...req, success: true, content });
			} catch (error) {
				results.push({ ...req, success: false, error: error.message });
			}
		}
		return results;
	}
}

export async function generateAllFiles(context) {
	const templateEngine = new TemplateEngine();
	await templateEngine.initialize();

	const devContainerCapabilities = context.capabilities.filter((c) =>
		c.startsWith('devcontainer-')
	);
	const otherCapabilities = context.capabilities.filter((c) => !c.startsWith('devcontainer-'));

	const filesToGenerate = [];

	// Handle non-devcontainer capabilities
	for (const capabilityId of otherCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.templates) {
			for (const template of capability.templates) {
				filesToGenerate.push({
					templateId: template.templateId,
					filePath: template.filePath,
					data: {
						...context,
						capabilityConfig: context.configuration?.[capabilityId] || {},
						capability
					}
				});
			}
		}
	}

	// Handle devcontainer capabilities with merging logic
	if (devContainerCapabilities.length > 0) {
		const baseDevContainerId = devContainerCapabilities[0];
		const baseCapability = capabilities.find((c) => c.id === baseDevContainerId);
		const baseCapabilityConfig = context.configuration?.[baseDevContainerId] || {};

		// Generate base devcontainer.json content
		const baseJsonContent = templateEngine.generateFile(
			`devcontainer-${baseDevContainerId.split('-')[1]}-json`,
			{ ...context, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
		);
		let mergedDevContainerJson = JSON.parse(baseJsonContent);

		// Merge features and extensions from other selected dev containers
		for (let i = 1; i < devContainerCapabilities.length; i++) {
			const capabilityId = devContainerCapabilities[i];
			const capability = capabilities.find((c) => c.id === capabilityId);
			const capabilityConfig = context.configuration?.[capabilityId] || {};

			const otherJsonContent = templateEngine.generateFile(
				`devcontainer-${capabilityId.split('-')[1]}-json`,
				{ ...context, capabilityConfig, capability }
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

		filesToGenerate.push({
			filePath: '.devcontainer/devcontainer.json',
			content: JSON.stringify(mergedDevContainerJson, null, 2)
		});

		// For Dockerfile, use the base one. Merging Dockerfiles is complex and a future improvement.
		const dockerfileContent = templateEngine.generateFile(
			`devcontainer-${baseDevContainerId.split('-')[1]}-dockerfile`,
			{ ...context, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
		);
		filesToGenerate.push({
			filePath: '.devcontainer/Dockerfile',
			content: dockerfileContent
		});

		// For shell scripts, generate them once as they are not language-specific.
		filesToGenerate.push({
			filePath: '.devcontainer/.zshrc',
			content: templateEngine.generateFile('devcontainer-zshrc-full', context)
		});
		filesToGenerate.push({
			filePath: '.devcontainer/.p10k.zsh',
			content: templateEngine.generateFile('devcontainer-p10k-zsh-full', context)
		});
		filesToGenerate.push({
			filePath: '.devcontainer/post-create-setup.sh',
			content: templateEngine.generateFile('devcontainer-post-create-setup-sh', context)
		});
	}

	const generatedFileResults = templateEngine.generateFiles(filesToGenerate);

	return generatedFileResults
		.filter((result) => result.success)
		.map((result) => ({ path: result.filePath, content: result.content }));
}
