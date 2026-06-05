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
import mcpConfigJson from '../templates/mcp-config-json.template?raw';
import packageJsonTemplate from '../templates/package-json.template?raw';
import wranglerJsonc from '../templates/wrangler.jsonc.template?raw';
import wranglerTemplateJsonc from '../templates/wrangler.template.jsonc.template?raw';
import scriptsCloudLoginSh from '../templates/scripts-cloud-login.sh.template?raw';
import scriptsRunWranglerDevelopmentSh from '../templates/scripts-run-wrangler-dev-sh.template?raw';
import scriptsSetupWranglerConfigSh from '../templates/scripts-setup-wrangler-config.sh.template?raw';
import scriptsSyncDopplerSecretsSh from '../templates/scripts-sync-doppler-secrets-sh.template?raw';

import gitignoreTemplate from '../templates/gitignore.template?raw';
import dependabotConfig from '../templates/dependabot.yml.template?raw';
import dependabotAutoMerge from '../templates/dependabot-auto-merge.yml.template?raw';
import vscodeTasksJson from '../templates/vscode-tasks-json.template?raw';
import vscodeSettingsJson from '../templates/vscode-settings-json.template?raw';
import cloudflareWorkerIndexJs from '../templates/cloudflare-worker-index-js.template?raw';
import svelteAppHtml from '../templates/svelte-app-html.template?raw';
import sveltePageSvelte from '../templates/svelte-page-svelte.template?raw';
import svelteConfigJs from '../templates/svelte-config-js.template?raw';
import svelteViteConfigJs from '../templates/svelte-vite-config-js.template?raw';
import { capabilities } from '$lib/config/capabilities.js';
import { getCapabilityTemplateData, applyDefaults } from '$lib/utils/capability-template-utils.js';

export const AGY_DEV_ALIAS = `# A robust function to run Antigravity with Doppler, ensuring no stale SonarQube containers exist.
agy-dev() {
  # Only check for Docker containers if Docker is installed
  if command -v docker &> /dev/null; then
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
  fi

  echo "Starting Antigravity with Doppler..."
  # Execute the main command, passing along all arguments you gave to the function
  doppler run --project {{projectName}} --config dev -- agy "$@"
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
fi

echo "INFO: Installing uv tool..."
curl -LsSf https://astral.sh/uv/install.sh | sudo env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

echo "INFO: Installing Cursor CLI..."
curl https://cursor.com/install -fsS | bash
`;

export const GIT_SAFE_DIR_SCRIPT = `
echo "INFO: Configuring git safe directory..."
git config --global --add safe.directory /workspaces/{{projectName}}`;

export const AGY_SETUP_SCRIPT = String.raw`
echo "INFO: Installing Antigravity CLI and Specify CLI..."
if ! command -v npm &> /dev/null; then
    echo "npm not found. Installing nodejs and npm..."
    sudo apt-get update
    sudo apt-get install -y nodejs npm
fi
sudo npm install -g @specifyapp/cli
curl -fsSL https://antigravity.google/cli/install.sh | bash
echo "INFO: Antigravity CLI and Specify CLI installation complete."

echo "INFO: Initializing Antigravity CLI global settings..."
mkdir -p "$USER_HOME_DIR/.agy"
printf '{\n  "selectedAuthType": "oauth-personal",\n  "general": {\n    "sessionRetention": {\n      "enabled": true,\n      "maxAge": "30d",\n      "warningAcknowledged": true\n    }\n  },\n  "ide": {\n    "hasSeenNudge": true,\n    "enabled": true\n  }\n}\n' > "$USER_HOME_DIR/.agy/settings.json"
sudo chown -R "$CURRENT_USER:$CURRENT_USER" "$USER_HOME_DIR/.agy"`;

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

# 1. Check if already logged in via Doppler API Token (Highly recommended for multi-container)
if doppler run --project {{projectName}} --config dev -- env | grep -q "CLOUDFLARE_API_TOKEN"; then
  echo "✅ Found CLOUDFLARE_API_TOKEN in Doppler. Using token for authentication."
  # Verify connectivity
  if ! doppler run --project {{projectName}} --config dev -- npx wrangler whoami 2>&1 | grep -q "You are not authenticated"; then
    echo "✅ Successfully authenticated via Doppler token. Skipping interactive login."
    exit 0
  else
    echo "⚠️ CLOUDFLARE_API_TOKEN found in Doppler but 'wrangler whoami' failed. Proceeding to interactive login..."
  fi
fi

# 2. Check if already logged in via OAuth session
if ! npx wrangler whoami 2>&1 | grep -q "You are not authenticated"; then
  echo "✅ Already logged in via OAuth session."
  exit 0
fi

WRANGLER_CALLBACK_PORT=${'${WRANGLER_CALLBACK_PORT:-8976}'}

# 3. Check for port conflicts inside the container
if ss -tuln | grep -q ":8976 "; then
  CONFLICT_PID=$(lsof -t -i:8976)
  echo "❌ Error: Port 8976 is already in use inside this container (PID: $CONFLICT_PID)."
  echo "   If this is a stale 'socat' process, you can kill it with: kill $CONFLICT_PID"
  exit 1
fi

# If we are using a non-standard port, we need to bridge the gap from 8976
if [ "$WRANGLER_CALLBACK_PORT" != "8976" ]; then
  echo "INFO: Using non-standard port $WRANGLER_CALLBACK_PORT. Bridging from 8976..."
  socat TCP-LISTEN:8976,fork,reuseaddr TCP:localhost:$WRANGLER_CALLBACK_PORT &
  SOCAT_PID=$!
  trap "kill $SOCAT_PID 2>/dev/null || true" EXIT
fi

echo "📢 IMPORTANT: Cloudflare OAuth ALWAYS redirects to localhost:8976 on your host machine."
echo "   If you have multiple containers, ensure port 8976 is forwarded to THIS container in VS Code."
echo "   (Check the 'Ports' tab in VS Code and ensure 8976 points to this project)"
echo

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=${'$WRANGLER_CALLBACK_PORT'} | stdbuf -oL sed 's/0\\.0\\.0\\.0/localhost/g'" /dev/null`;

export const SETUP_WRANGLER_SCRIPT = `
echo
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project {{projectName}} --config dev -- ./scripts/setup-wrangler-config.sh dev`;

export const DOPPLER_INSTALL_SCRIPT = String.raw`curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list`;

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
	'mcp-config-json': mcpConfigJson,
	'package-json': packageJsonTemplate,
	'wrangler-jsonc': wranglerJsonc,
	'wrangler-template-jsonc': wranglerTemplateJsonc,
	'scripts-cloud-login-sh': scriptsCloudLoginSh,
	'scripts-run-wrangler-dev-sh': scriptsRunWranglerDevelopmentSh,
	'scripts-setup-wrangler-config-sh': scriptsSetupWranglerConfigSh,
	'scripts-sync-doppler-secrets-sh': scriptsSyncDopplerSecretsSh,

	gitignore: gitignoreTemplate,
	'dependabot-config': dependabotConfig,
	'dependabot-auto-merge': dependabotAutoMerge,
	'vscode-tasks-json': vscodeTasksJson,
	'vscode-settings-json': vscodeSettingsJson,
	'cloudflare-worker-index-js': cloudflareWorkerIndexJs,
	'svelte-app-html': svelteAppHtml,
	'svelte-page-svelte': sveltePageSvelte,
	'svelte-config-js': svelteConfigJs,
	'svelte-vite-config-js': svelteViteConfigJs
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
		// eslint-disable-next-line unicorn/no-null
		return template || null;
	}

	compileTemplate(templateString, data) {
		let content = templateString;
		const regex = /{{([^{}]+)}}/g;

		content = content.replaceAll(regex, (match, key) => {
			const trimmedKey = key.trim();
			if (Object.hasOwn(data, trimmedKey)) {
				// eslint-disable-next-line security/detect-object-injection
				return data[trimmedKey];
			}

			const keys = trimmedKey.split('.');
			let value = data;
			for (const k of keys) {
				 
				if (value && typeof value === 'object' && k in value) {
					// eslint-disable-next-line security/detect-object-injection
					value = value[k];
				} else {
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

function collectSingleTemplateFile(
	templateEngine,
	context,
	capabilityId,
	capability,
	template
) {
	try {
		const extraData = getCapabilityTemplateData(capabilityId, {
			capabilities: context.capabilities,
			configuration: context.configuration
		});

		// Special handling for SvelteKit config adapter
		let adapterPackage = '@sveltejs/adapter-auto';
		let adapterComment =
			'// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.\n' +
			'\t\t// If your environment is not supported or you settled on a specific environment, switch out the adapter.\n' +
			'\t\t// See https://kit.svelte.dev/docs/adapters for more information about adapters.';

		if (
			capabilityId === 'sveltekit' &&
			context.capabilities.includes('cloudflare-wrangler')
		) {
			adapterPackage = '@sveltejs/adapter-cloudflare';
			adapterComment =
				'// adapter-cloudflare is configured for Wrangler deployment\n' +
				'\t\t// See https://kit.svelte.dev/docs/adapter-cloudflare for more information.';
		}

		// eslint-disable-next-line security/detect-object-injection
		const capabilityConfig = context.configuration?.[capabilityId] || {};

		const content = templateEngine.generateFile(template.templateId, {
			...context,
			...extraData,
			projectName: context.projectName || context.name || 'my-project',
			capabilityConfig,
			capability,
			adapterPackage,
			adapterComment
		});
		return {
			filePath: template.filePath,
			content: content
		};
	} catch (error) {
		console.warn(`⚠️ Failed to process template ${template.templateId}:`, error);
		return;
	}
}

// Helper to collect files for non-dev-container capabilities
export function collectNonDevelopmentContainerFiles(templateEngine, context, otherCapabilities) {
	const files = [];

	for (const capabilityId of otherCapabilities) {
		const capability = capabilities.find((c) => c.id === capabilityId);
		if (capability && capability.templates) {
			for (const template of capability.templates) {
				const file = collectSingleTemplateFile(
					templateEngine,
					context,
					capabilityId,
					capability,
					template
				);
				if (file) {
					files.push(file);
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

function processAdditionalDevelopmentContainer(
	capabilityId,
	context,
	templateEngine,
	mergedJson,
	allExtensions
) {
	const capability = capabilities.find((c) => c.id === capabilityId);
	// eslint-disable-next-line security/detect-object-injection
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
		// eslint-disable-next-line security/detect-object-injection
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
		// eslint-disable-next-line security/detect-object-injection
		const capabilityId = developmentContainerCapabilities[index];
		processAdditionalDevelopmentContainer(
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
		content: JSON.stringify(mergedDevelopmentContainerJson, undefined, 2)
	};
}

// Helper to generate and merge devcontainer files
export function generateMergedDevelopmentContainerFiles(
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
		// eslint-disable-next-line security/detect-object-injection
		context.configuration?.[baseDevelopmentContainerId] || {}
	);

	// Process Dockerfile (using base one for now)
	const dockerfileContent = templateEngine.generateFile(
		`devcontainer-${baseDevelopmentContainerId.split('-')[1]}-dockerfile`,
		{
			...context,
			capabilityConfig: baseCapabilityConfig,
			capability: baseCapability,
			dopplerInstallation: context.capabilities.includes('doppler')
				? ` \\\n    && ${DOPPLER_INSTALL_SCRIPT} \\\n    && apt-get update && apt-get install -y doppler`
				: ''
		}
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
				agyDevAlias: context.capabilities.includes('doppler')
					? AGY_DEV_ALIAS.replaceAll(
							'{{projectName}}',
							context.projectName || context.name || 'my-project'
						)
					: ''
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
					? SHELL_SETUP_SCRIPT.replaceAll(
							'{{projectName}}',
							context.projectName || context.name || 'my-project'
						)
					: '',
				gitSafeDirectory: GIT_SAFE_DIR_SCRIPT.replaceAll(
					'{{projectName}}',
					context.projectName || context.name || 'my-project'
				),
				agySetup: context.capabilities.includes('coding-agents') ? AGY_SETUP_SCRIPT : '',
				playwrightSetup: context.capabilities.includes('playwright') ? PLAYWRIGHT_SETUP_SCRIPT : '',
				cloudLoginSetup:
					context.capabilities.includes('doppler') ||
					context.capabilities.includes('cloudflare-wrangler') ||
					context.capabilities.includes('google-cloud')
						? `echo -e "\\nINFO: Custom container setup script finished."\necho -e "\\n⚠️  To complete cloud login, run:"\necho "    cd /workspaces/${context.projectName || context.name || 'my-project'} && bash scripts/cloud_login.sh"`
						: 'echo "INFO: Custom container setup script finished."'
			})
		}
	);

	return files;
}

export function generatePackageJson(templateEngine, context) {
	let scripts = ',\n    "build": "echo \'No build step required\'"';
	let devDependencies = '';
	let dependencies = '';
	let typeField;
	let overrides = '';

	const hasSvelteKit = context.capabilities.includes('sveltekit');
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');

	if (hasSvelteKit) {
		typeField = 'module';
		overrides =
			',\n  "overrides": {\n    "cookie": "^1.0.2",\n    "@sveltejs/vite-plugin-svelte": "^6.2.1",\n    "@sveltejs/vite-plugin-svelte-inspector": "^5.0.0",\n    "vite": "^7.3.0"\n  }';
		scripts =
			',\n    "dev": "vite dev",\n    "build": "vite build",\n    "preview": "vite preview",\n    "check": "svelte-kit sync && svelte-check",\n    "check:watch": "svelte-kit sync && svelte-check --watch"';
		devDependencies +=
			'"@sveltejs/kit": "^2.49.2",\n    "@sveltejs/vite-plugin-svelte": "^6.2.1",\n    "svelte": "^5.46.1",\n    "svelte-check": "^4.1.1",\n    "typescript": "^5.7.2",\n    "vite": "^7.3.0"';

		if (hasWrangler) {
			scripts += ',\n    "deploy": "wrangler deploy"';
			devDependencies += ',\n    "@sveltejs/adapter-cloudflare": "^7.2.4"';
			// Wrangler is also needed as dev dep
			devDependencies += ',\n    "wrangler": "^4.56.0"';
		} else {
			devDependencies += ',\n    "@sveltejs/adapter-auto": "^3.0.0"';
		}
	} else if (hasWrangler) {
		// Normal Node.js setup
		scripts += ',\n    "deploy": "wrangler deploy"';
		devDependencies += '"wrangler": "^3.57.0"';
		typeField = 'module'; // Wrangler projects are usually modules
	} else {
		typeField = 'commonjs';
	}

	if (context.capabilities.includes('devcontainer-node')) {
		// Add explicit package.json only if Node.js container is selected
		// or we can generate it for all, but user requested "if node.js is selected"
		const content = templateEngine.generateFile('package-json', {
			...context,
			scripts,
			devDependencies,
			dependencies,
			typeField,
			overrides,
			projectName: context.projectName || context.name || 'my-project'
		});
		return {
			filePath: 'package.json',
			content
		};
	}
}

export function generatePyProjectToml(context) {
	const hasPython = context.capabilities.some((c) => c.startsWith('devcontainer-python'));
	if (!hasPython) return;

	const hasDagster = context.capabilities.includes('dagster');
	const projectName = context.projectName || context.name || 'my-project';

	let dependencies = '[\n    "pytest>=7.0.0"';
	if (hasDagster) {
		dependencies += ',\n    "dagster",\n    "dagster-webserver"';
	}
	dependencies += '\n]';

	const content = `[project]
name = "${projectName}"
version = "0.1.0"
description = "Generated by Project Generation Tool"
readme = "README.md"
requires-python = ">=3.11"
dependencies = ${dependencies}

[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "*.test.py"
`;

	return {
		filePath: 'pyproject.toml',
		content
	};
}

function pushWranglerFiles(templateEngine, context, files, projectName, compatibilityDate) {
	const hasDoppler = context.capabilities.includes('doppler');
	const hasSvelteKit = context.capabilities.includes('sveltekit');
	const mainEntryPoint = hasSvelteKit ? '.svelte-kit/cloudflare/_worker.js' : 'src/index.js';
	const assetsConfig = hasSvelteKit
		? ',\n\t"assets": {\n\t\t"binding": "ASSETS",\n\t\t"directory": ".svelte-kit/cloudflare"\n\t}'
		: '';

	files.push({
		filePath: 'scripts/run-wrangler-dev.sh',
		content: templateEngine.generateFile('scripts-run-wrangler-dev-sh', {
			...context,
			projectName
		})
	});

	if (!hasSvelteKit) {
		files.push({
			filePath: 'src/index.js',
			content: templateEngine.generateFile('cloudflare-worker-index-js', context)
		});
	}

	if (hasDoppler) {
		files.push(
			{
				filePath: 'wrangler.template.jsonc',
				content: templateEngine.generateFile('wrangler-template-jsonc', {
					...context,
					projectName,
					compatibilityDate,
					mainEntryPoint,
					assetsConfig
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
				projectName,
				compatibilityDate,
				mainEntryPoint,
				assetsConfig
			})
		});
	}
}

export function generateCloudLoginFiles(templateEngine, context) {
	const files = [];
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const hasDoppler = context.capabilities.includes('doppler');
	const hasGoogleCloud = context.capabilities.includes('google-cloud');

	if (!hasWrangler && !hasDoppler && !hasGoogleCloud) return files;

	const projectName = context.projectName || context.name || 'my-project';
	const compatibilityDate = new Date().toISOString().split('T')[0];

	// cloud_login.sh
	const dopplerLogin = hasDoppler
		? DOPPLER_LOGIN_SCRIPT.replaceAll('{{projectName}}', projectName)
		: '';

	const wranglerLogin = hasWrangler
		? WRANGLER_LOGIN_SCRIPT.replaceAll('{{projectName}}', projectName)
		: '';

	const setupWrangler =
		hasDoppler && hasWrangler
			? SETUP_WRANGLER_SCRIPT.replaceAll('{{projectName}}', projectName)
			: '';

	const googleCloudLogin = hasGoogleCloud
		? `gcloud auth login && gcloud config set project ${projectName}`
		: '';

	files.push({
		filePath: 'scripts/cloud_login.sh',
		content: templateEngine.generateFile('scripts-cloud-login-sh', {
			...context,
			dopplerLogin,
			wranglerLogin,
			setupWrangler,
			googleCloudLogin
		})
	});

	if (hasWrangler) {
		pushWranglerFiles(templateEngine, context, files, projectName, compatibilityDate);
	}

	if (hasWrangler && hasDoppler) {
		files.push({
			filePath: 'scripts/sync-doppler-secrets.sh',
			content: templateEngine.generateFile('scripts-sync-doppler-secrets-sh', {
				...context,
				projectName
			})
		});
	}

	return files;
}

export function generateGitignoreFile(templateEngine, context) {
	const hasDoppler = context.capabilities.includes('doppler');
	const hasWrangler = context.capabilities.includes('cloudflare-wrangler');
	const hasPython = context.capabilities.some((c) => c.startsWith('devcontainer-python'));
	const hasJava = context.capabilities.some((c) => c.startsWith('devcontainer-java'));
	const hasDagster = context.capabilities.includes('dagster');

	let wranglerIgnore = '';
	if (hasWrangler) {
		wranglerIgnore = '\n# Cloudflare Wrangler\n.wrangler';
		if (hasDoppler) {
			wranglerIgnore += '\nwrangler.jsonc';
		}
	}

	let pythonIgnore = hasPython
		? '\n# Python\n__pycache__/\n*.py[cod]\n*$py.class\n.venv\nvenv/\n*.manifest'
		: '';

	if (hasDagster) {
		pythonIgnore += '\n\n# Dagster\n.tmp_dagster*';
	}
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

export function generateVscodeSettingsFile(templateEngine, context) {
	const hasPython = context.capabilities.some((c) => c.startsWith('devcontainer-python'));
	if (!hasPython) return;

	const content = templateEngine.generateFile('vscode-settings-json', {
		...context,
		projectName: context.projectName || context.name || 'my-project'
	});

	return {
		filePath: '.vscode/settings.json',
		content
	};
}

export async function generateAllFiles(context) {
	const templateEngine = new TemplateEngine();
	await templateEngine.initialize();

	const developmentContainerCapabilities = context.capabilities.filter((c) =>
		c.startsWith('devcontainer-')
	);
	const otherCapabilities = context.capabilities.filter((c) => !c.startsWith('devcontainer-'));

	const cloudLoginFiles = generateCloudLoginFiles(templateEngine, context);

	const otherFiles = [
		generatePackageJson(templateEngine, context),
		generatePyProjectToml(context),
		generateGitignoreFile(templateEngine, context),
		generateVscodeSettingsFile(templateEngine, context)
	].filter(Boolean);

	const allGeneratedFiles = [
		...collectNonDevelopmentContainerFiles(templateEngine, context, otherCapabilities),
		...generateMergedDevelopmentContainerFiles(
			templateEngine,
			context,
			developmentContainerCapabilities
		),
		...cloudLoginFiles,
		...otherFiles
	];

	return allGeneratedFiles;
}
