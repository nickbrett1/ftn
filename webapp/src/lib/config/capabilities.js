// webapp/src/lib/config/capabilities.js

/**
 * Defines the available project capabilities for the Project Generation Tool.
 * Each capability includes metadata and dependencies.
 */

// Common constants to reduce duplication
const CATEGORY_CORE = 'core';
const CATEGORY_DEVCONTAINER = 'devcontainer';
const CATEGORY_CODE_QUALITY = 'code-quality';
const CATEGORY_PROJECT_STRUCTURE = 'project-structure';
const CATEGORY_SECRETS = 'secrets';
const CATEGORY_DEPLOYMENT = 'deployment';
const CATEGORY_MONITORING = 'monitoring';
const CATEGORY_CI_CD = 'ci-cd';
const CATEGORY_FRAMEWORKS = 'frameworks';
const CATEGORY_APPLE = 'apple-development';

const REQ_DOCKER = ['docker'];
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const CONFIG_SCHEMA_EMPTY = { type: 'object', properties: EMPTY_OBJECT };

/**
 * Helper to create a standard external service configuration
 * @param {string} type Service type
 * @param {string} name Service name
 * @param {string} createDesc Description for create action
 * @param {string} configDesc Description for configure action
 * @returns {Array} External services array
 */
function createExternalServiceConfig(type, name, createDesc, configDesc) {
	return [
		{
			type,
			name,
			actions: [
				{ type: 'create', description: createDesc },
				{ type: 'configure', description: configDesc }
			],
			requiresAuth: true
		}
	];
}

/**
 * Creates a devcontainer capability object.
 * @param {string} id - The unique identifier for the capability.
 * @param {string} name - The display name of the capability.
 * @param {string} description - A brief description of the capability.
 * @param {object} configurationSchema - The schema for configuring the capability.
 * @param {string[]} vscodeExtensions - List of VS Code extensions to include.
 * @returns {object} A devcontainer capability object.
 */
function createDevelopmentContainerCapability(
	id,
	name,
	description,
	configurationSchema,
	vscodeExtensions = [],
	extraTemplates = []
) {
	const lang = id.split('-')[1]; // e.g., 'node', 'python', 'java'
	const capName = lang.charAt(0).toUpperCase() + lang.slice(1);
	return {
		id,
		name,
		description,
		category: CATEGORY_DEVCONTAINER,
		dependencies: REQ_DOCKER,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema,
		vscodeExtensions,
		benefits: [
			'Instant development environment setup for new contributors',
			`Pre-configured ${capName} runtime and VS Code extensions`,
			'Consistent tooling across the entire engineering team'
		],
		templates: [
			{
				id: 'devcontainer-json',
				filePath: '.devcontainer/devcontainer.json',
				templateId: `devcontainer-${lang}-json`
			},
			{
				id: 'dockerfile',
				filePath: '.devcontainer/Dockerfile',
				templateId: `devcontainer-${lang}-dockerfile`
			},
			{ id: 'zshrc', filePath: '.devcontainer/.zshrc', templateId: 'devcontainer-zshrc-full' },
			{ id: 'p10k', filePath: '.devcontainer/.p10k.zsh', templateId: 'devcontainer-p10k-zsh-full' },
			{ id: 'tmux', filePath: '.devcontainer/.tmux.conf', templateId: 'devcontainer-tmux-conf' },
			{
				id: 'setup-sh',
				filePath: '.devcontainer/post-create-setup.sh',
				templateId: 'devcontainer-post-create-setup-sh',
				isExecutable: true
			},
			{
				id: 'start-sh',
				filePath: '.devcontainer/post-start-setup.sh',
				templateId: 'devcontainer-post-start-setup-sh',
				isExecutable: true
			},
			...extraTemplates
		],
		website: 'https://code.visualstudio.com/docs/devcontainers/containers'
	};
}

export const capabilities = [
	{
		id: 'coding-agents',
		name: 'AI Coding Agents (Antigravity)',
		description: 'Antigravity CLI, Cursor CLI, Svelte MCP, Memos MCP, and Vikunja MCP integration.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: ['saoudrizwan.claude-dev', 'GitHub.copilot'],
		benefits: [
			'Antigravity CLI pre-installed',
			'Cursor CLI pre-installed',
			'Svelte MCP for context-aware AI',
			'Memos MCP integration',
			'Vikunja MCP integration'
		],
		templates: [
			{
				id: 'mcp-config',
				filePath: '.agents/mcp_config.json',
				templateId: 'mcp-config-json'
			},
			{
				id: 'mcp-sse-proxy',
				filePath: '.agents/mcp-sse-proxy.cjs',
				templateId: 'mcp-sse-proxy-js'
			},
			{
				id: 'mcp-streamable-http-proxy',
				filePath: '.agents/mcp-streamable-http-proxy.cjs',
				templateId: 'mcp-streamable-http-proxy-js'
			}
		],
		links: [
			{ label: 'Antigravity', url: 'https://antigravity.google/product/antigravity-cli' },
			{ label: 'Cursor', url: 'https://cursor.sh' },
			{ label: 'Svelte MCP', url: 'https://mcp.svelte.dev/' },
			{ label: 'Memos MCP', url: 'http://nas:5230/mcp' }, // NOSONAR
			{ label: 'Vikunja MCP', url: 'http://nas:8086/' } // NOSONAR
		]
	},
	{
		id: 'xcode-development',
		name: 'Xcode Development',
		description:
			'Connects to a remote Xcode instance via SSE proxy for AI-assisted iOS/macOS development. Requires Xcode running on a Mac with the Antigravity Xcode plugin installed.',
		category: CATEGORY_APPLE,
		dependencies: ['coding-agents'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Build, run, and test Xcode projects from within the devcontainer',
			'AI can read, write, and grep Xcode project files',
			'Real-time build logs and test results from Xcode'
		],
		templates: EMPTY_ARRAY,
		website: 'https://developer.apple.com/xcode/'
	},
	{
		id: 'editor-tools',
		name: 'Editor Configuration',
		description: 'Standard VS Code extensions and settings.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: [
			'dbaeumer.vscode-eslint',
			'esbenp.prettier-vscode',
			'svelte.svelte-vscode',
			'usernamehw.errorlens',
			'streetsidesoftware.code-spell-checker',
			'eamodio.gitlens',
			'donjayamanne.githistory',
			'mhutchie.git-graph',
			'redhat.vscode-yaml',
			'tamasfe.even-better-toml',
			'bierner.markdown-mermaid',
			'pomdtr.excalidraw-editor',
			'pejmannikram.vscode-auto-scroll',
			'naumovs.color-highlight',
			'oderwat.indent-rainbow',
			'wix.vscode-import-cost',
			'mkxml.vscode-filesize',
			'christian-kohler.npm-intellisense',
			'GitHub.vscode-pull-request-github',
			'shyykoserhiy.git-autoconfig',
			'actboy168.tasks',
			'humao.rest-client',
			'alefragnani.project-manager',
			'mutantdino.resourcemonitor'
		],
		benefits: [
			'ESLint & Prettier configured',
			'Svelte VS Code extension',
			'Consistent workspace settings'
		],
		templates: [
			{
				id: 'vscode-tasks',
				filePath: '.vscode/tasks.json',
				templateId: 'vscode-tasks-json'
			}
		]
	},
	{
		id: 'shell-tools',
		name: 'Shell & Terminal',
		description: 'Zsh with Powerlevel10k and productivity plugins.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: ['Oh My Zsh', 'Powerlevel10k Theme', 'Syntax Highlighting & Autosuggestions'],
		templates: EMPTY_ARRAY,
		website: 'https://github.com/romkatv/powerlevel10k'
	},
	{
		id: 'spec-kit',
		name: 'SpecKit',
		description: 'Project specification tools by GitHub.',
		category: CATEGORY_CORE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Define your project specifications as code',
			'Generate documentation automatically from specs',
			'Ensure project alignment with requirements'
		],
		templates: EMPTY_ARRAY,
		website: 'https://github.com/github/spec-kit'
	},
	{
		id: 'docker',
		name: 'Docker',
		description: 'Docker support for the project.',
		category: 'internal',
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: ['ms-azuretools.vscode-docker'],
		benefits: [
			'Containerize your application for consistent execution',
			'Eliminate "works on my machine" issues',
			'Simplify dependency management and isolation'
		],
		templates: EMPTY_ARRAY,
		website: 'https://www.docker.com/'
	},
	createDevelopmentContainerCapability(
		'devcontainer-node',
		'Node.js DevContainer',
		'Sets up a VS Code DevContainer with Node.js environment.',
		CONFIG_SCHEMA_EMPTY,
		[
			'dbaeumer.vscode-eslint',
			'esbenp.prettier-vscode',
			'svelte.svelte-vscode',
			'bradlc.vscode-tailwindcss',
			'unifiedjs.vscode-mdx',
			'ecmel.vscode-html-css',
			'GraphQL.vscode-graphql-syntax'
		]
	),
	{
		id: 'sveltekit',
		name: 'SvelteKit',
		description: 'Initializes a SvelteKit project with Svelte 5.',
		category: CATEGORY_FRAMEWORKS,
		dependencies: ['devcontainer-node'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: ['svelte.svelte-vscode'],
		benefits: [
			'Web development, streamlined',
			'Svelte 5 Runes support',
			'Fast, efficient, and type-safe'
		],
		templates: [
			{
				id: 'svelte-app-html',
				filePath: 'src/app.html',
				templateId: 'svelte-app-html'
			},
			{
				id: 'svelte-page-svelte',
				filePath: 'src/routes/+page.svelte',
				templateId: 'svelte-page-svelte'
			},
			{
				id: 'svelte-config-js',
				filePath: 'svelte.config.js',
				templateId: 'svelte-config-js'
			},
			{
				id: 'svelte-vite-config-js',
				filePath: 'vite.config.js',
				templateId: 'svelte-vite-config-js'
			}
		],
		website: 'https://kit.svelte.dev/'
	},
	{
		id: 'dagster',
		name: 'Dagster',
		description: 'Configures a Dagster project for data orchestration.',
		category: CATEGORY_FRAMEWORKS,
		dependencies: ['devcontainer-python'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Data orchestration for the whole lifecycle',
			'Software-defined assets',
			'Rich UI for observing and operating data pipelines'
		],
		templates: [],
		website: 'https://dagster.io/'
	},
	createDevelopmentContainerCapability(
		'devcontainer-python',
		'Python DevContainer',
		'Sets up a VS Code DevContainer with Python environment.',
		CONFIG_SCHEMA_EMPTY,
		['ms-python.python', 'ms-python.vscode-pylance'],
		[
			// pyproject.toml is emitted by the project scaffold (not a static
			// template file), but it gets a templateId so tooling can locate it
			// via capability metadata (memo §7).
			{
				id: 'pyproject-toml',
				filePath: 'pyproject.toml',
				templateId: 'pyproject-toml'
			}
		]
	),
	createDevelopmentContainerCapability(
		'devcontainer-java',
		'Java DevContainer',
		'Sets up a VS Code DevContainer with Java environment.',
		CONFIG_SCHEMA_EMPTY,
		['redhat.java', 'vscjava.vscode-java-debug', 'vscjava.vscode-java-test']
	),
	createDevelopmentContainerCapability(
		'devcontainer-rust',
		'Rust DevContainer',
		'Sets up a VS Code DevContainer with Rust environment.',
		CONFIG_SCHEMA_EMPTY,
		['rust-lang.rust-analyzer', 'tamasfe.even-better-toml']
	),
	{
		id: 'circleci',
		name: 'CircleCI Integration',
		description:
			'Configures CircleCI for continuous integration and deployment. Requires Doppler: the CircleCI MCP server needs CircleCI tokens that are only available through Doppler.',
		category: CATEGORY_CI_CD,
		dependencies: ['doppler'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		externalServices: createExternalServiceConfig(
			'circleci',
			'CircleCI',
			'Create new project in CircleCI',
			'Set up environment variables'
		),
		configurationSchema: {
			type: 'object',
			properties: {
				context: {
					type: 'object',
					properties: {
						enabled: {
							type: 'boolean',
							default: true
						},
						name: {
							type: 'string',
							default: 'common'
						}
					}
				},
				ntfyNotifications: {
					type: 'boolean',
					default: false
				}
			}
		},
		benefits: [
			'Automate testing and deployment pipelines',
			'Gain insights with visual build logs and test results',
			'Ensure code quality before merging changes'
		],
		templates: [
			{
				id: 'circleci-config',
				filePath: '.circleci/config.yml',
				templateId: 'circleci-config'
			}
		],
		website: 'https://circleci.com/'
	},
	{
		id: 'doppler',
		name: 'Doppler Secrets Management',
		description:
			'Integrates Doppler for secure secrets management. Enables the various MCP servers that rely on privileged tokens to access their services (e.g. CircleCI, GitHub, SonarQube).',
		category: CATEGORY_SECRETS,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		externalServices: createExternalServiceConfig(
			'doppler',
			'Doppler',
			'Add config to shared common project',
			'Configure service tokens'
		),
		configurationSchema: {
			type: 'object',
			properties: {
				projectType: {
					type: 'string',
					enum: ['web'],
					default: 'web'
				},
				projectStrategy: {
					type: 'string',
					enum: ['common', 'new'],
					default: 'common',
					description:
						'Where this repo\'s secrets live: "common" reuses the shared common project (default — no new Doppler project is created); "new" creates a dedicated Doppler project for this repo.'
				}
			}
		},
		vscodeExtensions: ['doppler.doppler-vscode'],
		benefits: [
			'Centralized secrets management across environments',
			'Eliminate .env files and risk of leaking secrets',
			'Inject secrets securely into your application at runtime'
		],
		templates: [
			{
				id: 'doppler-yaml',
				filePath: 'doppler.yaml',
				templateId: 'doppler-yaml'
			}
		],
		website: 'https://www.doppler.com/'
	},
	{
		id: 'gitguardian',
		name: 'GitGuardian',
		description: 'Automated secrets detection in your CI pipeline.',
		category: CATEGORY_SECRETS,
		dependencies: ['circleci'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		externalServices: createExternalServiceConfig(
			'gitguardian',
			'GitGuardian',
			'Create new project in GitGuardian',
			'Get API Key and add to CircleCI environment variables'
		),
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Detect secrets in your code before they are merged',
			'Prevent credentials leakage',
			'Real-time alerting'
		],
		templates: EMPTY_ARRAY,
		website: 'https://www.gitguardian.com/'
	},
	{
		id: 'sonarcloud',
		name: 'SonarCloud Code Quality',
		description: 'Sets up SonarCloud for static code analysis.',
		category: CATEGORY_CODE_QUALITY,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		externalServices: createExternalServiceConfig(
			'sonarcloud',
			'SonarCloud',
			'Create new project in SonarCloud',
			'Configure analysis parameters'
		),
		configurationSchema: {
			type: 'object',
			properties: {
				language: {
					type: 'string',
					enum: ['JavaScript', 'Python', 'Java']
				}
			}
		},
		benefits: [
			'Automatic detection of bugs, vulnerabilities, and code smells',
			'Track technical debt and code coverage over time',
			'Enforce quality gates on pull requests'
		],
		templates: [
			{
				id: '.sonarcloud.properties',
				filePath: '.sonarcloud.properties',
				templateId: '.sonarcloud.properties'
			}
		],
		website: 'https://sonarcloud.io/'
	},
	{
		id: 'code-quality',
		name: 'ESLint + SonarJS',
		description:
			'Adds fast, zero-configuration code quality linting using eslint-plugin-sonarjs and eslint-plugin-security. Runs in ~5–10s vs 1–2 minutes for SonarCloud.',
		category: CATEGORY_CODE_QUALITY,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: ['dbaeumer.vscode-eslint'],
		benefits: [
			'Catches bugs, code smells, and security issues in CI in under 10 seconds',
			'No external service or API token required',
			'Runs the same Sonar rules as SonarCloud via eslint-plugin-sonarjs',
			'Works offline and in any CI environment'
		],
		templates: [
			{
				id: 'eslint-config-js',
				filePath: 'eslint.config.js',
				templateId: 'eslint-config-js'
			}
		],
		website: 'https://github.com/SonarSource/SonarJS'
	},
	{
		id: 'code-quality-python',
		name: 'Ruff (Python code quality)',
		description:
			'Adds fast, zero-configuration Python linting with Ruff (rules live in pyproject.toml [tool.ruff] and the CI test job runs `ruff check src tests`). Requires a Python devcontainer.',
		category: CATEGORY_CODE_QUALITY,
		dependencies: ['devcontainer-python'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: ['charliermarsh.ruff'],
		benefits: [
			'Catches bugs, code smells, and security issues in CI in milliseconds',
			'No external service or API token required',
			'Ruff ships as a dev dependency in the generated pyproject.toml',
			'Works offline and in any CI environment'
		],
		templates: EMPTY_ARRAY,
		website: 'https://docs.astral.sh/ruff/'
	},
	{
		id: 'sonarlint',
		name: 'SonarLint',
		description: 'Configures SonarLint for local code quality analysis.',
		category: CATEGORY_CODE_QUALITY,
		dependencies: ['sonarcloud', 'devcontainer-java'],
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: ['SonarSource.sonarlint-vscode'],
		benefits: [
			'Real-time code quality feedback in your IDE',
			'Fix issues before they are committed to the repository',
			'Sync rules with SonarCloud for consistent analysis'
		],
		templates: EMPTY_ARRAY,
		website: 'https://www.sonarsource.com/products/sonarlint/'
	},
	{
		id: 'cloudflare-wrangler',
		name: 'Cloudflare Wrangler',
		description: 'Configures project for deployment to Cloudflare Workers.',
		category: CATEGORY_DEPLOYMENT,
		dependencies: EMPTY_ARRAY,
		conflicts: ['docker-container'],
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				workerType: {
					type: 'string',
					enum: ['web', 'rust'],
					default: 'web'
				}
			}
		},
		benefits: [
			'Deploy serverless applications to the global edge network',
			'Local emulation for fast development cycles',
			'Scalable and performant runtime for modern apps'
		],
		templates: EMPTY_ARRAY,
		website: 'https://developers.cloudflare.com/workers/wrangler/'
	},
	{
		id: 'google-cloud',
		name: 'Google Cloud',
		description: 'Configures project for deployment to Google Cloud.',
		category: CATEGORY_DEPLOYMENT,
		dependencies: [],
		conflicts: ['docker-container'],
		requiresAuth: [],
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		benefits: [
			'Deploy serverless applications to Google Cloud',
			'Local authentication for fast development cycles',
			'Scalable and performant runtime for modern apps'
		],
		templates: [],
		website: 'https://cloud.google.com/'
	},
	{
		id: 'docker-container',
		name: 'Docker Container',
		description:
			'Containerize the project and publish to the GitHub Container Registry (GHCR) for deployment to a NAS or self-hosted host via Docker Compose. Mutually exclusive with other deployment systems.',
		category: CATEGORY_DEPLOYMENT,
		dependencies: ['docker'],
		conflicts: ['cloudflare-wrangler', 'google-cloud'],
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				registry: {
					type: 'string',
					enum: ['ghcr'],
					default: 'ghcr'
				},
				imageVisibility: {
					type: 'string',
					enum: ['public', 'private'],
					default: 'public'
				},
				tagStrategy: {
					type: 'string',
					enum: ['commit-sha'],
					default: 'commit-sha'
				},
				networkMode: {
					type: 'string',
					enum: ['bridge', 'host'],
					default: 'bridge'
				},
				exposePort: {
					type: 'integer',
					minimum: 1,
					maximum: 65535,
					default: 3000
				},
				publishPort: {
					type: 'string',
					description:
						'Compose port binding, e.g. "3000:3000" or "127.0.0.1:3000:3000" for a private (Tailscale-only) service. The left-hand side is the published HOST port — Homepage href/widget URLs use it, so "127.0.0.1:3002:3000" yields http://<hostname>:3002/.',
					default: '3000:3000'
				},
				baseImage: {
					type: 'string',
					description:
						'Runtime base image. Defaults to a glibc image (node:22-slim / python:3.12-slim); Alpine only for pure-JS apps.',
					default: 'node:22-slim'
				},
				hostname: {
					type: 'string',
					description:
						'Hostname used in the Homepage href (defaults to localhost; set to your NAS hostname/IP for browser access).',
					default: 'localhost'
				},
				registryNamespace: {
					type: 'string',
					description:
						'GHCR registry namespace (GitHub user/org). Defaults to the authenticated GitHub login at generation time.',
					default: ''
				},
				dataMounts: {
					type: 'array',
					description:
						'Host data mounts emitted into compose volumes, e.g. [{ "hostPath": "/volume1/data", "containerPath": "/data", "readOnly": true }]. Read-only by default.',
					items: {
						type: 'object',
						properties: {
							hostPath: { type: 'string' },
							containerPath: { type: 'string' },
							readOnly: { type: 'boolean', default: true }
						}
					},
					default: []
				},
				aptPackages: {
					type: 'array',
					description:
						'Debian packages installed in the runtime image via apt, e.g. ["iproute2", "curl"]. curl is added automatically for Python http healthchecks.',
					items: { type: 'string' },
					default: []
				},
				envVars: {
					type: 'array',
					description:
						'Environment variables emitted into the compose environment and .env.example, e.g. ["MCP_PORT=3001"] (a bare key like "MCP_PORT" is filled from .env).',
					items: { type: 'string' },
					default: []
				},
				pythonDependencies: {
					type: 'array',
					description:
						'Runtime Python dependencies (PEP 508 specifiers) emitted into [project] dependencies of the generated pyproject.toml, e.g. ["mcp>=1.2.0", "mcpo>=0.1.0", "httpx>=0.27.0"]. Empty by default; dev tools (pytest, ruff) live in the dev extra.',
					items: { type: 'string' },
					default: []
				},
				command: {
					type: 'array',
					description:
						'Container CMD override (exec form), e.g. ["/usr/local/bin/entrypoint.sh"]. Defaults to a language-appropriate command. A /usr/local/bin/<script> reference is copied from scripts/<script> in the repo (see deploy/README.md).',
					items: { type: 'string' }
				},
				entrypoint: {
					type: 'array',
					description:
						'Container ENTRYPOINT override (exec form), e.g. ["/usr/local/bin/entrypoint.sh"]. A /usr/local/bin/<script> reference is copied from scripts/<script> in the repo (see deploy/README.md).',
					items: { type: 'string' }
				},
				healthcheck: {
					type: 'string',
					description:
						'Health mechanism: "none", "http:<path>" (e.g. "http:/healthz"; installs curl on Python images), or "command:<cmd>". The Dockerfile HEALTHCHECK and Homepage widget are only emitted when declared. Node web apps default to "http:/health".',
					default: ''
				},
				language: {
					type: 'string',
					enum: ['python', 'node', 'java', 'rust'],
					description:
						'Project language override. Normally derived from the selected devcontainer-* capability; set this only to override it.'
				},
				watchtower: {
					type: 'boolean',
					default: true
				},
				homepage: {
					type: 'boolean',
					default: true
				},
				armBuilds: {
					type: 'boolean',
					default: false,
					description:
						'Also build and publish linux/arm64 images. Defaults to false (x86_64 / linux/amd64 only) — set true when a deploy host (e.g. an ARM NAS or Raspberry Pi) needs arm64 images.'
				}
			}
		},
		benefits: [
			'Deploy to any Docker host (Synology, Unraid, TrueNAS, VPS) — not tied to a cloud vendor',
			'Auto-updates via Watchtower polling the registry',
			'Surfaced in Homepage dashboard with a health widget',
			'Full local/private control of the container'
		],
		templates: [
			{
				id: 'dockerfile',
				filePath: 'Dockerfile',
				templateId: 'dockerfile'
			},
			{
				id: 'dockerignore',
				filePath: '.dockerignore',
				templateId: 'dockerignore'
			},
			{
				id: 'docker-compose',
				filePath: 'docker-compose.yml',
				templateId: 'docker-compose'
			},
			{
				id: 'deploy-readme',
				filePath: 'deploy/README.md',
				templateId: 'deploy-readme'
			},
			{
				id: 'homepage-snippet',
				filePath: 'deploy/homepage-services.yaml',
				templateId: 'homepage-services'
			},
			{
				id: 'env-example',
				filePath: '.env.example',
				templateId: 'env-example'
			}
		],
		externalServices: createExternalServiceConfig(
			'registry',
			'GHCR',
			'GHCR package is created on first push from CircleCI',
			'Create a classic PAT with the write:packages scope (fine-grained PATs cannot access GHCR); add GHCR_USERNAME and GHCR_TOKEN to the CircleCI context'
		),
		website: 'https://www.docker.com/'
	},
	{
		id: 'dependabot',
		name: 'Dependabot',
		description: 'Configures Dependabot for automated dependency updates.',
		category: CATEGORY_PROJECT_STRUCTURE,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				updateSchedule: {
					type: 'string',
					enum: ['daily', 'weekly', 'monthly']
				}
			}
		},
		benefits: [
			'Automatically keep dependencies up to date',
			'Receive security alerts for vulnerable packages',
			'Reduce technical debt with regular maintenance PRs'
		],
		templates: [
			{
				id: 'dependabot-config',
				filePath: '.github/dependabot.yml',
				templateId: 'dependabot-config'
			},
			{
				id: 'dependabot-auto-merge',
				filePath: '.github/workflows/dependabot-auto-merge.yml',
				templateId: 'dependabot-auto-merge'
			}
		],
		website: 'https://docs.github.com/en/code-security/dependabot/dependabot-overview'
	},
	{
		id: 'lighthouse-ci',
		name: 'Lighthouse CI',
		description: 'Configures Lighthouse CI for performance monitoring.',
		category: CATEGORY_MONITORING,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: {
			type: 'object',
			properties: {
				thresholds: {
					type: 'object',
					properties: {
						performance: {
							type: 'number',
							minimum: 0,
							maximum: 100,
							default: 90
						}
					}
				}
			}
		},
		benefits: [
			'Monitor performance, accessibility, and SEO metrics',
			'Catch regressions in web vitals before deployment',
			'Maintain high standards for user experience'
		],
		templates: [
			{
				id: 'lighthouse-ci-config',
				filePath: '.lighthouse.cjs',
				templateId: 'lighthouse-ci-config'
			}
		],
		website: 'https://github.com/GoogleChrome/lighthouse-ci'
	},
	{
		id: 'playwright',
		name: 'Playwright',
		description: 'Configures Playwright for end-to-end testing.',
		category: CATEGORY_MONITORING,
		dependencies: EMPTY_ARRAY,
		conflicts: EMPTY_ARRAY,
		requiresAuth: EMPTY_ARRAY,
		configurationSchema: CONFIG_SCHEMA_EMPTY,
		vscodeExtensions: ['ms-playwright.playwright', 'vitest.explorer'],
		benefits: [
			'Reliable end-to-end testing for modern web apps',
			'Fast and reliable testing with Chromium',
			'Powerful tooling for debugging and test generation'
		],
		templates: EMPTY_ARRAY,
		website: 'https://playwright.dev/'
	}
];

/**
 * Gets a capability by its ID.
 * @param {string} id The ID of the capability.
 * @returns {object | undefined} The capability object or undefined if not found.
 */
export function getCapabilityById(id) {
	return capabilities.find((c) => c.id === id);
}

/**
 * Gets all capabilities in a given category.
 * @param {string} category The category to filter by.
 * @returns {object[]} An array of capability objects.
 */
export function getCapabilitiesByCategory(category) {
	return capabilities.filter((c) => c.category === category);
}

function checkDependencies(capability, selectedSet, missing) {
	for (const depId of capability.dependencies) {
		if (!selectedSet.has(depId)) {
			missing.push({ capability: capability.id, dependency: depId });
		}
	}
}

function checkConflicts(capability, selectedSet, conflicts) {
	for (const conflictId of capability.conflicts) {
		if (selectedSet.has(conflictId)) {
			// Add conflict only once
			const alreadyExists = conflicts.some(
				(c) =>
					(c.capability1 === capability.id && c.capability2 === conflictId) ||
					(c.capability1 === conflictId && c.capability2 === capability.id)
			);
			if (!alreadyExists) {
				conflicts.push({ capability1: capability.id, capability2: conflictId });
			}
		}
	}
}

/**
 * Validates the dependencies and conflicts of a selection of capabilities.
 * @param {string[]} selectedIds An array of selected capability IDs.
 * @returns {{valid: boolean, missing: {capability: string, dependency: string}[], conflicts: {capability1: string, capability2: string}[]}}
 */
export function validateCapabilityDependencies(selectedIds) {
	const missing = [];
	const conflicts = [];
	const selectedSet = new Set(selectedIds);

	for (const id of selectedIds) {
		const capability = getCapabilityById(id);
		if (capability) {
			checkDependencies(capability, selectedSet, missing);
			checkConflicts(capability, selectedSet, conflicts);
		}
	}

	return {
		valid: missing.length === 0 && conflicts.length === 0,
		missing,
		conflicts
	};
}

/**
 * Gets a unique list of required authentication services for a selection of capabilities.
 * @param {string[]} selectedIds An array of selected capability IDs.
 * @returns {string[]} A unique array of auth service names.
 */
export function getRequiredAuthServices(selectedIds) {
	const services = new Set();
	for (const id of selectedIds) {
		const capability = getCapabilityById(id);
		if (capability && capability.requiresAuth) {
			for (const service of capability.requiresAuth) {
				services.add(service);
			}
		}
	}
	return [...services];
}
