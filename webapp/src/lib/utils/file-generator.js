// webapp/src/lib/utils/file-generator.js

import devcontainerJavaDockerfile from '../templates/devcontainer-java-dockerfile.template?raw';
import devcontainerJavaJson from '../templates/devcontainer-java-json.template?raw';
import devcontainerNodeDockerfile from '../templates/devcontainer-node-dockerfile.template?raw';
import devcontainerNodeJson from '../templates/devcontainer-node-json.template?raw';
import devcontainerP10kZshFull from '../templates/devcontainer-p10k-zsh-full.template?raw';
import devcontainerP10kZsh from '../templates/devcontainer-p10k-zsh.template?raw';
import devcontainerPostCreateSetupSh from '../templates/devcontainer-post-create-setup-sh.template?raw';
import devcontainerPythonDockerfile from '../templates/devcontainer-python-dockerfile.template?raw';
import devcontainerPythonJson from '../templates/devcontainer-python-json.template?raw';
import devcontainerZshrcFull from '../templates/devcontainer-zshrc-full.template?raw';
import devcontainerZshrc from '../templates/devcontainer-zshrc.template?raw';
import dopplerYaml from '../templates/doppler-yaml.template?raw';
import playwrightConfig from '../templates/playwright-config.template?raw';
import lighthouseCiConfig from '../templates/lighthouse-ci-config.template?raw';
import circleCiConfig from '../templates/circleci-config.template?raw';
import sonarProjectProperties from '../templates/sonar-project.properties.template?raw';
import { capabilities } from '$lib/config/capabilities.js';
import { getCapabilityTemplateData } from '$lib/utils/capability-template-utils.js';

const templateImports = {
	'devcontainer-java-dockerfile': devcontainerJavaDockerfile,
	'devcontainer-java-json': devcontainerJavaJson,
	'devcontainer-node-dockerfile': devcontainerNodeDockerfile,
	'devcontainer-node-json': devcontainerNodeJson,
	'devcontainer-p10k-zsh-full': devcontainerP10kZshFull,
	'devcontainer-p10k-zsh': devcontainerP10kZsh,
	'devcontainer-post-create-setup-sh': devcontainerPostCreateSetupSh,
	'devcontainer-python-dockerfile': devcontainerPythonDockerfile,
	'devcontainer-python-json': devcontainerPythonJson,
	'devcontainer-zshrc-full': devcontainerZshrcFull,
	'devcontainer-zshrc': devcontainerZshrc,
	'playwright-config': playwrightConfig,
	'lighthouse-ci-config': lighthouseCiConfig,
	'circleci-config': circleCiConfig,
	'sonar-project-properties': sonarProjectProperties,
	'doppler-yaml': dopplerYaml
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
		const template = this.templates.get(name);
		return template || null;
	}

	compileTemplate(templateString, data) {
		let content = templateString;
		const regex = /{{(.*?)}}/g;

		content = content.replaceAll(regex, (match, key) => {
			const keys = key.trim().split('.');
			let value = data;
			for (const k of keys) {
				if (value && typeof value === 'object' && k in value) {
					value = value[k];
				} else {
					// Don't leave placeholders like {{lighthouseJobDefinition}} if they are undefined or empty string
					// Check if we should return empty string instead of original match
					// But we need to distinguish between "missing key" and "valid empty value"
					// In this engine implementation, if path is not found, it returns original match.
					// We might want to clear it if it's intended to be optional.
					// However, for safety, let's keep it unless we explicitly pass empty string in data.
					return match;
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
		for (const [index, request] of fileRequests.entries()) {
			try {
				// If content is already pre-generated, use it directly
				// This is for merged devcontainer files
				const content =
					request.content == undefined
						? this.generateFile(request.templateId, { ...request.data, index })
						: request.content;
				results.push({ ...request, success: true, content });
			} catch (error) {
				results.push({ ...request, success: false, error: error.message });
			}
		}
		return results;
	}
}

// Helper to collect files for non-dev-container capabilities
function collectNonDevelopmentContainerFiles(templateEngine, context, otherCapabilities) {
	const files = [];

	for (const capabilityId of otherCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.templates) {
			for (const template of capability.templates) {
				try {
					const extraData = getCapabilityTemplateData(capabilityId, context);
					const content = templateEngine.generateFile(template.templateId, {
						...context,
						...extraData,
						capabilityConfig: context.configuration?.[capabilityId] || {},
						capability
					});
					files.push({
						filePath: template.filePath,
						content: content
					});
				} catch (error) {
					console.warn(`⚠️ Failed to process template ${template.templateId}:`, error);
				}
			}
		}
	}
	return files;
}

// Helper to generate and merge devcontainer files
function generateMergedDevelopmentContainerFiles(
	templateEngine,
	context,
	developmentContainerCapabilities
) {
	const files = [];

	if (developmentContainerCapabilities.length === 0) return files;

	const baseDevelopmentContainerId = developmentContainerCapabilities[0];
	const baseCapability = capabilities.find((c) => c.id === baseDevelopmentContainerId);
	const baseCapabilityConfig = context.configuration?.[baseDevelopmentContainerId] || {};

	// Process devcontainer.json merging
	const baseJsonContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-json`,
		{ ...context, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);
	let mergedDevelopmentContainerJson = JSON.parse(baseJsonContent);

	for (let index = 1; index < developmentContainerCapabilities.length; index++) {
		const capabilityId = developmentContainerCapabilities[index];
		const capability = capabilities.find((c) => c.id === capabilityId);
		const capabilityConfig = context.configuration?.[capabilityId] || {};

		const otherJsonContent = templateEngine.generateFile(
			`devcontainer-${capabilityId.split('-')[1]}-json`,
			{ ...context, capabilityConfig, capability }
		);
		const otherJson = JSON.parse(otherJsonContent);

		if (otherJson.features) {
			mergedDevelopmentContainerJson.features = {
				...mergedDevelopmentContainerJson.features,
				...otherJson.features
			};
		}
		if (otherJson.customizations?.vscode?.extensions) {
			const baseExtensions =
				mergedDevelopmentContainerJson.customizations?.vscode?.extensions || [];
			mergedDevelopmentContainerJson.customizations.vscode.extensions = [
				...new Set([...baseExtensions, ...otherJson.customizations.vscode.extensions])
			];
		}
	}

	files.push({
		filePath: '.devcontainer/devcontainer.json',
		content: JSON.stringify(mergedDevelopmentContainerJson, null, 2)
	});

	// Process Dockerfile (using base one for now)
	const dockerfileContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-dockerfile`,
		{ ...context, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);

	files.push(
		{
			filePath: '.devcontainer/Dockerfile',
			content: dockerfileContent
		},
		{
			filePath: '.devcontainer/.zshrc',
			content: templateEngine.generateFile('devcontainer-zshrc-full', context)
		},
		{
			filePath: '.devcontainer/.p10k.zsh',
			content: templateEngine.generateFile('devcontainer-p10k-zsh-full', context)
		},
		{
			filePath: '.devcontainer/post-create-setup.sh',
			content: templateEngine.generateFile('devcontainer-post-create-setup-sh', context)
		}
	);

	return files;
}

export async function generateAllFiles(context) {
	const templateEngine = new TemplateEngine();
	await templateEngine.initialize();

	const developmentContainerCapabilities = context.capabilities.filter((c) =>
		c.startsWith('devcontainer-')
	);
	const otherCapabilities = context.capabilities.filter((c) => !c.startsWith('devcontainer-'));

	let allGeneratedFiles = [];

	allGeneratedFiles.push(
		...collectNonDevelopmentContainerFiles(templateEngine, context, otherCapabilities),
		...generateMergedDevelopmentContainerFiles(
			templateEngine,
			context,
			developmentContainerCapabilities
		)
	);

	return allGeneratedFiles;
}
