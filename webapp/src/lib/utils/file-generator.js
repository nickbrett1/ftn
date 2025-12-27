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
import geminiSettingsJson from '../templates/gemini-settings-json.template?raw';
import packageJsonTemplate from '../templates/package-json.template?raw';
import wranglerJsonc from '../templates/wrangler.jsonc.template?raw';
import wranglerTemplateJsonc from '../templates/wrangler.template.jsonc.template?raw';
import scriptsCloudLoginSh from '../templates/scripts-cloud-login.sh.template?raw';
import scriptsSetupWranglerConfigSh from '../templates/scripts-setup-wrangler-config.sh.template?raw';
import gitignoreTemplate from '../templates/gitignore.template?raw';
import dependabotConfig from '../templates/dependabot.yml.template?raw';
import vscodeTasksJson from '../templates/vscode-tasks-json.template?raw';
import cloudflareWorkerIndexJs from '../templates/cloudflare-worker-index-js.template?raw';
import { capabilities } from '$lib/config/capabilities.js';
import { getCapabilityTemplateData, applyDefaults } from '$lib/utils/capability-template-utils.js';

export const GEMINI_DEV_ALIAS = `# A robust function to run Gemini with Doppler, ensuring no stale SonarQube containers exist.
gemini-dev() {
  # Define the name of the container to check for
  local container_name="sonarqube-mcp-server"

  # Find the container ID using Docker's filter. The -q flag means "quiet" (ID only).
  local container_id=$(docker ps -a -q --filter "name=\${container_name}")

  # Check if the container_id variable is not empty
  if [ -n "$container_id" ]; then
    echo "Found stale container '\${container_name}' ($container_id). Removing it..."
    # Force remove the container. The -f flag stops it if it's running.
    docker rm -f "$container_id"
  fi

  echo "Starting Gemini with Doppler..."
  # Execute the main command, passing along all arguments you gave to the function
  doppler run --project webapp --config dev -- gemini "$@"
}`;

export const SHELL_SETUP_SCRIPT = `
echo "INFO: Creating Oh My Zsh custom directories..."
mkdir -p "$USER_HOME_DIR/.oh-my-zsh/custom/themes" "$USER_HOME_DIR/.oh-my-zsh/custom/plugins"

if [ -f "/workspaces/{{projectName}}/.devcontainer/.zshrc" ]; then
    echo "INFO: Copying .zshrc to $USER_HOME_DIR/.zshrc"
    cp "/workspaces/{{projectName}}/.devcontainer/.zshrc" "$USER_HOME_DIR/.zshrc"
    sudo chown "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.zshrc"
else
    echo "INFO: /workspaces/{{projectName}}/.devcontainer/.zshrc not found, skipping copy."
fi

if [ -f "/workspaces/{{projectName}}/.devcontainer/.p10k.zsh" ]; then
    echo "INFO: Copying .p10k.zsh to $USER_HOME_DIR/.p10k.zsh"
    cp "/workspaces/{{projectName}}/.devcontainer/.p10k.zsh" "$USER_HOME_DIR/.p10k.zsh"
    sudo chown "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.p10k.zsh"
else
    echo "INFO: /workspaces/{{projectName}}/.devcontainer/.p10k.zsh not found, skipping copy."
fi`;

export const GIT_SAFE_DIR_SCRIPT = `
echo "INFO: Configuring git safe directory..."
git config --global --add safe.directory /workspaces/{{projectName}}`;

export const GEMINI_SETUP_SCRIPT = `
echo "INFO: Adding Svelte MCP to Gemini..."
gemini mcp add -t http -s project svelte https://mcp.svelte.dev/mcp`;

export const PLAYWRIGHT_SETUP_SCRIPT = `
echo "INFO: Installing Playwright and its Chromium dependencies..."
npx --yes playwright install --with-deps chromium
echo "INFO: Playwright Chromium installation complete."`;

export const DOPPLER_LOGIN_SCRIPT = `
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
fi`;

export const WRANGLER_LOGIN_SCRIPT = String.raw`
echo
# Cloudflare Wrangler login
# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Wrangler CLI not found. Installing globally with npm..."
  npm install -g wrangler
fi

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\\\\.0\\\\.0\\\\.0/localhost/g'" /dev/null`;

export const SETUP_WRANGLER_SCRIPT = `
echo
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project {{projectName}} --config dev -- ./scripts/setup-wrangler-config.sh dev`;

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
	'doppler-yaml': dopplerYaml,
	'gemini-settings-json': geminiSettingsJson,
	'package-json': packageJsonTemplate,
	'wrangler-jsonc': wranglerJsonc,
	'wrangler-template-jsonc': wranglerTemplateJsonc,
	'scripts-cloud-login-sh': scriptsCloudLoginSh,
	'scripts-setup-wrangler-config-sh': scriptsSetupWranglerConfigSh,
	gitignore: gitignoreTemplate,
	'dependabot-config': dependabotConfig,
	'vscode-tasks-json': vscodeTasksJson,
	'cloudflare-worker-index-js': cloudflareWorkerIndexJs
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
					const extraData = getCapabilityTemplateData(capabilityId, {
						capabilities: otherCapabilities,
						configuration: context.configuration
					});

					const content = templateEngine.generateFile(template.templateId, {
						...context,
						...extraData,
						projectName: context.name || 'my-project',
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

function addExtensionsFromContainerJson(allExtensions, json) {
	if (json.customizations?.vscode?.extensions) {
		for (const extension of json.customizations.vscode.extensions) {
			allExtensions.add(extension);
		}
	}
}

function addExtensionsFromCapabilities(allExtensions, capabilityIds) {
	for (const capabilityId of capabilityIds) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.vscodeExtensions) {
			for (const extension of capability.vscodeExtensions) allExtensions.add(extension);
		}
	}
}

function processAdditionalDevContainer(
	capabilityId,
	context,
	templateEngine,
	mergedJson,
	allExtensions
) {
	const capability = capabilities.find((c) => c.id === capabilityId);
	const capabilityConfig = applyDefaults(capability, context.configuration?.[capabilityId] || {});

	const otherJsonContent = templateEngine.generateFile(
		`devcontainer-${capabilityId.split('-')[1]}-json`,
		{ ...context, capabilityConfig: capabilityConfig, capability: capability }
	);
	const otherJson = JSON.parse(otherJsonContent);

	if (otherJson.features) {
		mergedJson.features = {
			...mergedJson.features,
			...otherJson.features
		};
	}

	addExtensionsFromContainerJson(allExtensions, otherJson);
}

function generateAndMergeDevcontainerJson(
	templateEngine,
	context,
	developmentContainerCapabilities
) {
	const baseDevelopmentContainerId = developmentContainerCapabilities[0];
	const baseCapability = capabilities.find((c) => c.id === baseDevelopmentContainerId);
	const baseCapabilityConfig = applyDefaults(
		baseCapability,
		context.configuration?.[baseDevelopmentContainerId] || {}
	);

	// Process devcontainer.json merging
	const baseJsonContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-json`,
		{ ...context, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);
	let mergedDevelopmentContainerJson = JSON.parse(baseJsonContent);

	const allExtensions = new Set();

	// 1. From base JSON
	addExtensionsFromContainerJson(allExtensions, mergedDevelopmentContainerJson);

	// 2. From all capabilities (project configuration)
	addExtensionsFromCapabilities(allExtensions, context.capabilities);

	// 3. From other devcontainer JSONs (merged ones)
	for (let index = 1; index < developmentContainerCapabilities.length; index++) {
		const capabilityId = developmentContainerCapabilities[index];
		processAdditionalDevContainer(
			capabilityId,
			context,
			templateEngine,
			mergedDevelopmentContainerJson,
			allExtensions
		);
	}

	if (allExtensions.size > 0) {
		if (!mergedDevelopmentContainerJson.customizations) {
			mergedDevelopmentContainerJson.customizations = {};
		}
		if (!mergedDevelopmentContainerJson.customizations.vscode) {
			mergedDevelopmentContainerJson.customizations.vscode = {};
		}
		mergedDevelopmentContainerJson.customizations.vscode.extensions = [...allExtensions];
	}

	return {
		filePath: '.devcontainer/devcontainer.json',
		content: JSON.stringify(mergedDevelopmentContainerJson, null, 2)
	};
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
	const baseCapabilityConfig = applyDefaults(
		baseCapability,
		context.configuration?.[baseDevelopmentContainerId] || {}
	);

	// Process Dockerfile (using base one for now)
	const dockerfileContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-dockerfile`,
		{ ...context, capabilityConfig: baseCapabilityConfig, capability: baseCapability }
	);

	files.push(
		generateAndMergeDevcontainerJson(templateEngine, context, developmentContainerCapabilities),
		{
			filePath: '.devcontainer/Dockerfile',
			content: dockerfileContent
		},
		{
			filePath: '.devcontainer/.zshrc',
			content: templateEngine.generateFile('devcontainer-zshrc-full', {
				...context,
				geminiDevAlias: context.capabilities.includes('doppler') ? GEMINI_DEV_ALIAS : ''
			})
		},
		{
			filePath: '.devcontainer/.p10k.zsh',
			content: templateEngine.generateFile('devcontainer-p10k-zsh-full', context)
		},
		{
			filePath: '.devcontainer/post-create-setup.sh',
			content: templateEngine.generateFile('devcontainer-post-create-setup-sh', {
				...context,
				shellSetup: context.capabilities.includes('shell-tools')
					? SHELL_SETUP_SCRIPT.replaceAll('{{projectName}}', context.name || 'my-project')
					: '',
				gitSafeDirectory: GIT_SAFE_DIR_SCRIPT.replaceAll(
					'{{projectName}}',
					context.name || 'my-project'
				),
				geminiSetup: context.capabilities.includes('coding-agents') ? GEMINI_SETUP_SCRIPT : '',
				playwrightSetup: context.capabilities.includes('playwright') ? PLAYWRIGHT_SETUP_SCRIPT : ''
			})
		}
	);

	return files;
}

function generatePackageJson(templateEngine, context) {
	let scripts = '';
	let devDependencies = '';
	let dependencies = '';

	if (context.capabilities.includes('cloudflare-wrangler')) {
		scripts += ',\n    "deploy": "wrangler deploy"';
		devDependencies += '"wrangler": "^3.0.0"';
	}

	if (context.capabilities.includes('devcontainer-node')) {
		// Add explicit package.json only if Node.js container is selected
		// or we can generate it for all, but user requested "if node.js is selected"
		const content = templateEngine.generateFile('package-json', {
			...context,
			scripts,
			devDependencies,
			dependencies,
			projectName: context.name || 'my-project'
		});
		return {
			filePath: 'package.json',
			content
		};
	}
	return null;
}

function generateCloudflareFiles(templateEngine, context) {
	const files = [];
	if (!context.capabilities.includes('cloudflare-wrangler')) return files;

	const hasDoppler = context.capabilities.includes('doppler');
	const projectName = context.name || 'my-project';
	const compatibilityDate = new Date().toISOString().split('T')[0];

	// cloud_login.sh
	const dopplerLogin = hasDoppler
		? DOPPLER_LOGIN_SCRIPT.replaceAll('{{projectName}}', projectName)
		: '';

	const wranglerLogin = WRANGLER_LOGIN_SCRIPT;

	const setupWrangler = hasDoppler
		? SETUP_WRANGLER_SCRIPT.replaceAll('{{projectName}}', projectName)
		: '';

	files.push({
		filePath: 'scripts/cloud_login.sh',
		content: templateEngine.generateFile('scripts-cloud-login-sh', {
			...context,
			dopplerLogin,
			wranglerLogin,
			setupWrangler
		})
	});

	files.push({
		filePath: 'src/index.js',
		content: templateEngine.generateFile('cloudflare-worker-index-js', context)
	});

	if (hasDoppler) {
		files.push(
			{
				filePath: 'wrangler.template.jsonc',
				content: templateEngine.generateFile('wrangler-template-jsonc', {
					...context,
					projectName: context.name || 'my-project',
					compatibilityDate
				})
			},
			{
				filePath: 'scripts/setup-wrangler-config.sh',
				content: templateEngine.generateFile('scripts-setup-wrangler-config-sh', context)
			}
		);
	} else {
		files.push({
			filePath: 'wrangler.jsonc',
			content: templateEngine.generateFile('wrangler-jsonc', {
				...context,
				projectName: context.name || 'my-project',
				compatibilityDate
			})
		});
	}

	return files;
}

function generateGitignoreFile(templateEngine, context) {
	const hasDoppler = context.capabilities.includes('doppler');
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const hasPython = context.capabilities.some((c) => c.startsWith('devcontainer-python'));
	const hasJava = context.capabilities.some((c) => c.startsWith('devcontainer-java'));

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

	return {
		filePath: '.gitignore',
		content: templateEngine.generateFile('gitignore', {
			...context,
			wranglerIgnore,
			pythonIgnore,
			javaIgnore
		})
	};
}

export async function generateAllFiles(context) {
	const templateEngine = new TemplateEngine();
	await templateEngine.initialize();

	const developmentContainerCapabilities = context.capabilities.filter((c) =>
		c.startsWith('devcontainer-')
	);
	const otherCapabilities = context.capabilities.filter((c) => !c.startsWith('devcontainer-'));

	const otherFiles = [
		generatePackageJson(templateEngine, context),
		generateGitignoreFile(templateEngine, context)
	].filter(Boolean);

	const allGeneratedFiles = [
		...collectNonDevelopmentContainerFiles(templateEngine, context, otherCapabilities),
		...generateMergedDevelopmentContainerFiles(
			templateEngine,
			context,
			developmentContainerCapabilities
		),
		...generateCloudflareFiles(templateEngine, context),
		...otherFiles
	];

	return allGeneratedFiles;
}
