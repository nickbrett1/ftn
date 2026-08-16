/**
 * Emits the `.agents/mcp_config.json` block — Cursor / Antigravity target.
 *
 * Target env contract (genproj-goose-env-refs): Cursor and Antigravity DO
 * expand unbraced `$VAR` references in the `env` map of an MCP server entry,
 * so `"CIRCLECI_TOKEN": "$CIRCLECI_TOKEN"` is valid HERE. This is NOT
 * interchangeable with goose's ~/.config/goose/config.yaml extension map,
 * which expands NOTHING (see assertNoGooseEnvVarReferences / getGooseMcpConfig).
 * Doppler is preferred when available; bare `$VAR` env refs are only a
 * fallback for tools that expand them.
 */
function getCodingAgentsTemplateData(context) {
	const hasSonarQube = context.capabilities.includes('sonarcloud');
	const hasCircleCI = context.capabilities.includes('circleci');
	const hasDoppler = context.capabilities.includes('doppler');
	const hasXcode = context.capabilities.includes('xcode-development');

	let sonarQubeMcpConfig = '';
	if (hasSonarQube) {
		if (hasDoppler) {
			sonarQubeMcpConfig = `,
    "sonarqube": {
      "command": "doppler",
      "args": [
        "run",
        "--",
        "npx",
        "-y",
        "sonarqube-mcp-server"
      ]
    }`;
		} else {
			sonarQubeMcpConfig = `,
    "sonarqube": {
      "command": "npx",
      "args": [
        "-y",
        "sonarqube-mcp-server"
      ],
      "env": {
        "SONAR_TOKEN": "$SONAR_TOKEN",
        "SONAR_HOST_URL": "$SONAR_HOST_URL"
      }
    }`;
		}
	}

	let circleCiMcpConfig = '';
	if (hasCircleCI) {
		if (hasDoppler) {
			circleCiMcpConfig = `,
    "circleci": {
      "command": "doppler",
      "args": [
        "run",
        "--",
        "npx",
        "-y",
        "@circleci/mcp-server-circleci"
      ]
    }`;
		} else {
			circleCiMcpConfig = `,
    "circleci": {
      "command": "npx",
      "args": [
        "-y",
        "@circleci/mcp-server-circleci"
      ],
      "env": {
        "CIRCLECI_TOKEN": "$CIRCLECI_TOKEN",
        "CIRCLE_API_TOKEN": "$CIRCLE_API_TOKEN"
      }
    }`;
		}
	}

	let githubMcpConfig = '';
	if (hasDoppler) {
		githubMcpConfig = `,
    "github": {
      "command": "doppler",
      "args": [
        "run",
        "--",
        "npx",
        "-y",
        "@modelcontextprotocol/server-github"
      ]
    }`;
	} else {
		githubMcpConfig = `,
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_PERSONAL_ACCESS_TOKEN"
      }
    }`;
	}

	let dopplerMcpConfig = '';
	if (hasDoppler) {
		dopplerMcpConfig = `,
    "doppler": {
      "command": "sh",
      "args": [
        "-c",
        "DOPPLER_TOKEN=$(doppler configure get token --plain) npx -y @dopplerhq/mcp-server"
      ]
    }`;
	}

	let xcodeNativeMcpConfig = '';
	if (hasXcode) {
		xcodeNativeMcpConfig = `,
    "xcode-native": {
      "command": "node",
      "args": [
        ".agents/mcp-sse-proxy.cjs",
        "http://mac-studio:9876/sse"
      ]
    }`;
	}

	return {
		sonarQubeMcpConfig,
		circleCiMcpConfig,
		githubMcpConfig,
		dopplerMcpConfig,
		xcodeNativeMcpConfig
	};
}

/**
 * Regression guard for goose extension YAML (memo genproj-goose-env-refs).
 *
 * Goose does NOT expand `${VAR}` or `$VAR` in a stdio extension's env map —
 * the value is passed VERBATIM to the child process. A token entry like
 * `CIRCLECI_TOKEN: "${CIRCLECI_TOKEN}"` makes the MCP server authenticate with
 * the 17-char literal `${CIRCLECI_TOKEN}` → `401 Unauthorized` on every call.
 *
 * Generated goose config must therefore NEVER reference env vars in extension
 * blocks. The canonical pattern is the Doppler wrapper:
 *   cmd: doppler
 *   args: ["run", "--", "npx", "-y", "<mcp-package>"]
 * If env must be inline (no Doppler), use `envs:` with literal values resolved
 * at generation time — never `${VAR}`/`$VAR` text.
 *
 * @param {string} yamlFragment - Goose extension YAML block (may be empty)
 * @param {string} key - Extension key, used in the error message
 * @throws {Error} When the fragment contains an env var reference
 */
function assertNoGooseEnvVarReferences(yamlFragment, key) {
	if (!yamlFragment) return;
	const refs = yamlFragment.match(/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/g) || [];
	if (refs.length > 0) {
		throw new Error(
			`goose extension '${key}' emits env var reference(s): ${refs.join(', ')}. ` +
				`Goose does not expand env refs in stdio extension env maps (the literal text would be used as the token → MCP 401). ` +
				`Use the doppler wrapper (cmd: doppler, args: ["run", "--", "npx", ...]) or literal envs: values resolved at generation time.`
		);
	}
}

/**
 * Generates goose MCP server configuration YAML entries based on project capabilities.
 * Similar to the agy MCP config but for goose's ~/.config/goose/config.yaml format.
 *
 * Goose env contract (genproj-goose-env-refs): stdio extensions that need
 * secrets are emitted with the Doppler wrapper (`cmd: doppler`). Both
 * `circleci` and `sonarcloud` declare `dependencies: ['doppler']`, so the
 * dependency resolver always expands them with Doppler — the no-Doppler
 * branch below must never emit `${VAR}`/`$VAR` env refs (goose passes them
 * verbatim → MCP 401); it emits nothing instead.
 *
 * @param {object} context - The project generation context with capabilities
 * @returns {object} Object with goose YAML config parts for each optional MCP server
 */
function getGooseMcpConfig(context) {
	const hasSonarQube = context.capabilities.includes('sonarcloud');
	const hasCircleCI = context.capabilities.includes('circleci');
	const hasDoppler = context.capabilities.includes('doppler');
	const hasXcode = context.capabilities.includes('xcode-development');

	let sonarQubeGooseConfig = '';
	if (hasSonarQube && hasDoppler) {
		sonarQubeGooseConfig = `
  sonarqube:
    type: stdio
    name: sonarqube
    enabled: true
    cmd: doppler
    args: ["run", "--", "npx", "-y", "sonarqube-mcp-server"]
    timeout: 300`;
	}

	let circleCiGooseConfig = '';
	if (hasCircleCI && hasDoppler) {
		circleCiGooseConfig = `
  circleci:
    type: stdio
    name: circleci
    enabled: true
    cmd: doppler
    args: ["run", "--", "npx", "-y", "@circleci/mcp-server-circleci"]
    timeout: 300`;
	}

	let xcodeNativeGooseConfig = '';
	if (hasXcode) {
		xcodeNativeGooseConfig = `
  xcode-native:
    type: stdio
    name: xcode-native
    enabled: true
    cmd: node
    args: [".agents/mcp-sse-proxy.cjs", "http://mac-studio:9876/sse"]
    timeout: 300`;
	}

	return {
		sonarQubeGooseConfig,
		circleCiGooseConfig,
		xcodeNativeGooseConfig
	};
}

function getSonarCloudTemplateData(context) {
	const config = context.configuration?.sonarcloud || {};
	const language = config.language || 'JavaScript';
	let languageSettings = '';

	switch (language) {
		case 'JavaScript': {
			languageSettings = 'sonar.javascript.lcov.reportPaths=coverage/lcov.info';

			break;
		}
		case 'Python': {
			languageSettings = 'sonar.python.coverage.reportPaths=coverage.xml';
			if (context.capabilities?.includes('devcontainer-python')) {
				languageSettings += '\nsonar.python.version=3.12';
			}

			break;
		}
		case 'Java': {
			languageSettings = 'sonar.java.binaries=.';

			break;
		}
		// No default
	}

	const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
	const isRustWorker = wranglerConfig.workerType === 'rust';
	const sonarSources = isRustWorker ? 'worker/src' : 'src';

	return {
		sonarLanguageSettings: languageSettings,
		organization: config.organization || 'bem',
		sonarSources
	};
}

function _applyGitGuardianConfig(data, context, contextEnabled, contextName, buildJobContext) {
	if (context.capabilities.includes('gitguardian')) {
		data.orbs += `  ggshield: gitguardian/ggshield@1\n`;
		data.buildWorkflowJob = `      - ggshield/scan:
          name: ggshield-scan${contextEnabled ? `\n          context: ${contextName}` : ''}
          base_revision: << pipeline.git.base_revision >>
          revision: <<pipeline.git.revision>>
      - build:
          requires:
            - ggshield-scan${buildJobContext}`;
	} else if (contextEnabled) {
		data.buildWorkflowJob = `      - build:${buildJobContext}`;
	}
}

/**
 * Adds the `install_doppler` command definition to the CircleCI config only
 * when a job actually invokes it (avoids dead code — nas-port-mcp bug 5:
 * defining the command with no consumer in the generated config).
 * @param {Object} data - CircleCI template data (mutated)
 */
function _ensureInstallDopplerCommand(data) {
	if (!data.commands.includes('install_doppler:')) {
		data.commands += `  install_doppler:
    description: "Install Doppler CLI"
    steps:
      - run:
          name: Install Doppler CLI
          command: |
            if ! command -v doppler &> /dev/null; then
              (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sudo sh
            fi\n`;
	}
}

function _applyDopplerConfig(data, context) {
	// The only consumer of `install_doppler` for the doppler capability is the
	// Cloudflare secrets sync; emit the command only then. (ntfy notifications
	// add their own consumer via _applyNtfyNotificationConfig.)
	if (
		context.capabilities.includes('cloudflare-wrangler') &&
		context.capabilities.includes('doppler')
	) {
		_ensureInstallDopplerCommand(data);
		data.preBuildSteps = `
      - install_doppler
      - run:
          name: Setup Wrangler Config
          command: |
            chmod +x scripts/setup-wrangler-config.sh
            ./scripts/setup-wrangler-config.sh`;
	}
}

function _applyLighthouseConfig(data, context, contextEnabled, contextName) {
	const hasLighthouse = context.capabilities.includes('lighthouse-ci');
	if (hasLighthouse) {
		data.lighthouseJobDefinition = `
  lighthouse:
    executor: node/default
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
          override-ci-command: |
            if [ -f package-lock.json ]; then
              npm ci
            else
              npm install
            fi
      - run:
          name: Build
          command: npm run build
      - run:
          name: Run Lighthouse CI
          command: npm install -g @lhci/cli && lhci autorun`;
		data.lighthouseWorkflowJob = `
      - lighthouse:${contextEnabled ? `\n          context: ${contextName}` : ''}
          requires:
            - build`;
	}
}

function _applyCloudflareConfig(data, context, contextEnabled, contextName) {
	if (context.capabilities.includes('cloudflare-wrangler')) {
		let setupWranglerStep = '';
		let syncSecretsStep = '';
		if (context.capabilities.includes('doppler')) {
			setupWranglerStep = `
      - install_doppler
      - run:
          name: Setup Wrangler Config
          environment:
            DOPPLER_CONFIG: << parameters.doppler_config >>
          command: |
            chmod +x scripts/setup-wrangler-config.sh
            ./scripts/setup-wrangler-config.sh "$DOPPLER_CONFIG"`;

			syncSecretsStep = `
      - run:
          name: Sync Doppler Secrets to Cloudflare
          environment:
            CLOUDFLARE_ENV: << parameters.environment >>
            DOPPLER_CONFIG: << parameters.doppler_config >>
          command: |
            chmod +x scripts/sync-doppler-secrets.sh
            if [ "$CLOUDFLARE_ENV" = "default" ] || [ -z "$CLOUDFLARE_ENV" ]; then
              ./scripts/sync-doppler-secrets.sh --config "$DOPPLER_CONFIG" --env "$CLOUDFLARE_ENV"
            else
              if ! ./scripts/sync-doppler-secrets.sh --config "$DOPPLER_CONFIG" --env "$CLOUDFLARE_ENV"; then
                echo "⚠️  Warning: Failed to sync secrets to Cloudflare preview."
              fi
            fi`;
		}

		const wranglerConfig = context.configuration?.['cloudflare-wrangler'] || {};
		const isRustWorker = wranglerConfig.workerType === 'rust';
		let rustJobDefinition = '';
		let rustWorkflowJob = '';
		let installRustStep = '';
		let requiresList = '\n            - build';

		if (isRustWorker) {
			rustJobDefinition = `
  test-rust:
    docker:
      - image: cimg/rust:1.90.0
    steps:
      - checkout
      - restore_cache:
          keys:
            - cargo-cache-{{ checksum "worker/Cargo.toml" }}
            - cargo-cache-
      - run:
          name: Rust Toolchain Info
          command: rustc --version && cargo --version
      - run:
          name: Rust Test
          command: cd worker && cargo test
      - save_cache:
          paths:
            - ~/.cargo/registry
            - ~/.cargo/git
            - worker/target
          key: cargo-cache-{{ checksum "worker/Cargo.toml" }}\n`;

			rustWorkflowJob = `
      - test-rust:${contextEnabled ? `\n          context: ${contextName}` : ''}
          requires:
            - build`;

			installRustStep = `
      - run:
          name: Install Rust
          command: |
            if ! command -v cargo &> /dev/null; then
              curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
              echo 'source "$HOME/.cargo/env"' >> $BASH_ENV
            fi`;

			requiresList = `\n            - build\n            - test-rust`;
		}

		data.deployJobDefinition =
			rustJobDefinition +
			`
  deploy-to-cloudflare:
    executor: node/default
    parameters:
      environment:
        type: string
        default: "default"
      doppler_config:
        type: string
        default: "stg"
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-deps-{{ checksum "package.json" }}
            - v1-deps-
      - run:
          name: Install Packages
          command: |
            if [ -f package-lock.json ]; then
              npm ci
            else
              npm install
            fi
      - save_cache:
          paths:
            - node_modules
          key: v1-deps-{{ checksum "package.json" }}${setupWranglerStep}
      - run:
          name: Build
          command: npm run build${installRustStep}
      - run:
          name: Deploy to Cloudflare Workers
          command: |
            export PATH="$HOME/.cargo/bin:$PATH"
            ENV_VAL="<< parameters.environment >>"
            if [ -d worker ]; then cd worker; fi
            if [ "$ENV_VAL" = "default" ] || [ -z "$ENV_VAL" ]; then
              npx wrangler deploy
            else
              npx wrangler deploy --env "$ENV_VAL"
            fi${syncSecretsStep}`;

		data.deployWorkflowJob =
			rustWorkflowJob +
			`
      - deploy-to-cloudflare:${contextEnabled ? `\n          context: ${contextName}` : ''}
          environment: "default"
          doppler_config: "stg"
          requires:${requiresList}
          filters:
            branches:
              only: main
      - deploy-to-cloudflare:${contextEnabled ? `\n          context: ${contextName}` : ''}
          name: deploy-to-cloudflare-preview
          environment: "preview"
          doppler_config: "stg"
          requires:${requiresList}
          filters:
            branches:
              ignore: main`;
	}
}

/**
 * Language-aware lint step for CircleCI.
 * - Python: `ruff check src tests` (ruff ships in the `[dev]` extra).
 * - Node: ESLint + SonarJS via `npm run lint` (existing behavior).
 */
function _applyCodeQualityConfig(data, context) {
	const language = resolveLanguage(context);
	if (language === 'python') {
		if (
			context.capabilities.includes('code-quality-python') ||
			context.capabilities.some((c) => c.startsWith('devcontainer-python'))
		) {
			data.testSteps += `      - run:
          name: Lint (Ruff)
          command: ruff check src tests\n`;
		}
	} else if (
		context.capabilities.includes('code-quality') ||
		context.capabilities.includes('devcontainer-node')
	) {
		data.testSteps += `      - run:
          name: Lint (ESLint + SonarJS)
          command: npm run lint\n`;
	}
}

/**
 * Resolves the project language from the selected capabilities.
 * The selected `devcontainer-*` capability is the source of truth; an explicit
 * top-level `language` configuration option (`python | node | java | rust`)
 * overrides it. Defaults to `node` for backward compatibility.
 * @param {Object} context - Generation context (capabilities, configuration)
 * @returns {'python'|'node'|'java'|'rust'} The resolved language
 */
export function resolveLanguage(context) {
	const explicit =
		context.configuration?.language ?? context.configuration?.['docker-container']?.language;
	if (typeof explicit === 'string') {
		const normalized = explicit.toLowerCase().trim();
		if (['python', 'node', 'java', 'rust'].includes(normalized)) {
			return normalized;
		}
	}
	const caps = context.capabilities || [];
	if (caps.some((c) => c.startsWith('devcontainer-python'))) return 'python';
	if (caps.some((c) => c.startsWith('devcontainer-java'))) return 'java';
	if (caps.some((c) => c.startsWith('devcontainer-rust'))) return 'rust';
	return 'node';
}

/**
 * Converts a project/repo name into a valid Python import package name.
 * e.g. "nas-port-mcp" -> "nas_port_mcp"
 * @param {string} projectName
 * @returns {string}
 */
export function toPythonPackageName(projectName) {
	let pkg = (projectName || 'my-project')
		.toLowerCase()
		.replace(/[^a-z0-9_.-]/g, '')
		.replace(/[-.]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	if (!/^[a-z]/.test(pkg)) pkg = `pkg_${pkg}`;
	return pkg || 'app';
}

/**
 * Converts a project name into a valid PEP 508 distribution name.
 * @param {string} projectName
 * @returns {string}
 */
export function toDistributionName(projectName) {
	return (
		(projectName || 'my-project')
			.toLowerCase()
			.replace(/[^a-z0-9._-]/g, '-')
			.replace(/^[-.]+|[-.]+$/g, '') || 'my-project'
	);
}

// GHCR is the only supported registry (matches the GitHub + CircleCI stack, and
// public packages need no NAS-side credentials).
const DOCKER_REGISTRY_PREFIX = 'ghcr.io';
const DOCKER_CREDENTIAL_VARS = { user: 'GHCR_USERNAME', token: 'GHCR_TOKEN' };

function getDockerRegistryPrefix() {
	return DOCKER_REGISTRY_PREFIX;
}

/**
 * Derives the host port from a compose publishPort binding.
 *
 * Format: `[hostIp:]hostPort:containerPort[/proto]` — e.g. `"3000:3000"`,
 * `"127.0.0.1:3002:3000"`, `"0.0.0.0:8080:80/tcp"`. The host port is the
 * left-hand side of the mapping: the port actually bound on the host, which
 * is what browser-facing URLs (Homepage href/widget) must use. When the
 * container port is also the host port this is invisible; when they differ
 * (loopback-bound services, ports allocated by nas-port-mcp) using the
 * container port produces a URL nothing listens on.
 *
 * Falls back to `exposePort` when publishPort is unset or unparseable, so
 * the default (`3000:3000` -> hostPort 3000) is unchanged. Indexing from the
 * end also tolerates bracketed IPv6 host IPs (`[::1]:3002:3000`).
 *
 * @param {string|undefined} publishPort - Compose port binding from config
 * @param {number|string} exposePort - Container port (fallback host port)
 * @returns {number|string} The published host port
 */
function getHostPort(publishPort, exposePort) {
	if (typeof publishPort !== 'string' || !publishPort.includes(':')) return exposePort;
	const parts = publishPort.split(':');
	if (parts.length < 2) return exposePort;
	const hostPort = parts[parts.length - 2];
	return /^\d+$/.test(hostPort) ? hostPort : exposePort;
}

/**
 * Builds template data for the docker-container deployment capability.
 * Provides language-aware Dockerfile fragments, compose fragments, and
 * registry metadata for generated deploy artifacts.
 *
 * Language resolution (memo §1): the selected `devcontainer-*` capability (or
 * an explicit `language` config option) drives the base image, install
 * commands, healthcheck, entry point and lint/test tooling.
 *
 * Health mechanism (memo §2.8): config option `healthcheck` on
 * docker-container (`none | http:<path> | command:<cmd>`). The Dockerfile
 * HEALTHCHECK, the Homepage widget and the health route are only emitted when
 * a mechanism is declared; Node web apps default to `http:/health` (the
 * sveltekit capability emits the route). Python containers default to `none`
 * because the framework is unknown — declare one to opt in.
 *
 * @param {Object} context - Generation context (capabilities, configuration, projectName)
 * @returns {Object} Data consumed by the docker-container templates
 */
function getDockerContainerTemplateData(context) {
	const config = context.configuration?.['docker-container'] || {};
	const language = resolveLanguage(context);
	const isPython = language === 'python';
	const isNode = language === 'node';
	const networkMode = config.networkMode || 'bridge';
	const exposePort = config.exposePort ?? 3000;
	const watchtower = config.watchtower !== false;
	const homepage = config.homepage !== false;
	const projectName = context.projectName || 'my-project';
	const registryPrefix = getDockerRegistryPrefix();
	const registryNamespace = context.registryNamespace || config.registryNamespace || 'OWNER';
	const hostname = config.hostname || 'localhost';
	// CircleCI context that holds the registry credentials (deploy runbook
	// guidance). Defaults to `common`, matching the circleci capability.
	const circleciContext = context.configuration?.circleci?.context?.name || 'common';

	// glibc base by default: Alpine (musl) breaks native npm/python modules
	// (duckdb, better-sqlite3, sharp, ...) which ship glibc prebuilds.
	// Alpine only via explicit opt-in (safe for pure-JS apps).
	const dockerBaseImage = config.baseImage || (isPython ? 'python:3.12-slim' : 'node:22-slim');

	// ---- Health mechanism (config-driven; see jsdoc above).
	let healthcheckSetting = typeof config.healthcheck === 'string' ? config.healthcheck.trim() : '';
	let healthcheckPath = '';
	if (healthcheckSetting === 'none') healthcheckSetting = '';
	if (healthcheckSetting.startsWith('http:')) {
		healthcheckPath = healthcheckSetting.slice('http:'.length) || '/health';
	}
	// Node web apps default to a /health route (mirrors the Node fix: the
	// sveltekit capability emits src/routes/health/+server.js).
	if (!healthcheckSetting && isNode) {
		healthcheckSetting = 'http:/health';
		healthcheckPath = '/health';
	}

	// ---- apt packages (memo §3.2): aptPackages config emitted into the
	// runtime stage. curl is auto-added for Python http healthchecks because
	// python:*-slim images do not ship curl.
	const aptPackages = Array.isArray(config.aptPackages) ? [...config.aptPackages] : [];
	if (healthcheckSetting.startsWith('http:') && isPython && !aptPackages.includes('curl')) {
		aptPackages.push('curl');
	}
	const dockerAptInstall =
		aptPackages.length > 0
			? `RUN apt-get update && apt-get install -y --no-install-recommends ${aptPackages.join(' ')} \\\n    && rm -rf /var/lib/apt/lists/*`
			: '';

	// Stage 1 (build). Python mirrors the Node copy-everything-first idiom.
	// The source tree is copied BEFORE any pip install: genproj projects may
	// carry a `requirements.txt` whose contents are user-controlled and often
	// an editable self-install (`-e .[dev]`) — installing requirements before
	// `COPY . .` fails with "error in 'egg_base' option: 'src' does not exist
	// or is not a directory" (nas-port-mcp bug). The venv + pip upgrade layer
	// stays cached; requirements (or the pyproject package) install after the
	// copy, which works for both editable and plain requirements files, and
	// for pyproject-only repos (zero extra files).
	const dockerBuildCommands = isPython
		? `COPY requirements.txt* pyproject.toml* ./\nRUN python -m venv /opt/venv \\\n    && /opt/venv/bin/pip install --upgrade pip\nCOPY . .\nRUN if [ -f requirements.txt ]; then /opt/venv/bin/pip install --no-cache-dir -r requirements.txt; else /opt/venv/bin/pip install --no-cache-dir .; fi`
		: `COPY . .\nRUN if [ -f package-lock.json ]; then npm ci; else npm install; fi\nRUN npm run build`;

	// Stage 2 (runtime): only the build output + production deps. Node keeps
	// `package*.json` (package.json always present + lockfile when one exists)
	// with the strict `npm ci --omit=dev` vs fallback.
	const dockerRuntimeCommands = isPython
		? `ENV PATH="/opt/venv/bin:$PATH"\nCOPY --from=build /opt/venv /opt/venv\nCOPY . .`
		: `ENV NODE_ENV=production\nCOPY --from=build /app/build ./build\nCOPY --from=build /app/package*.json ./\nRUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi`;

	// ---- HEALTHCHECK: emitted only when a mechanism is declared (memo §2.8).
	let dockerHealthcheck = '';
	if (healthcheckSetting.startsWith('http:')) {
		dockerHealthcheck = isPython
			? `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD curl -fsS http://127.0.0.1:${exposePort}${healthcheckPath} || exit 1`
			: `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD node -e "fetch('http://127.0.0.1:${exposePort}${healthcheckPath}').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"`;
	} else if (healthcheckSetting.startsWith('command:')) {
		dockerHealthcheck = `HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD ${healthcheckSetting
			.slice('command:'.length)
			.trim()}`;
	}

	// ---- Entry point (memo §3.1): config-driven ENTRYPOINT/CMD, never a
	// placeholder comment. `command` overrides the default CMD; `entrypoint`
	// prepends an ENTRYPOINT. The Python default runs the scaffolded package
	// module (`python -m <pkg>`), installed into the venv by the build stage.
	//
	// Script contract: when command/entrypoint references a script at
	// /usr/local/bin/<name>, the repo copy is expected at scripts/<name> and is
	// copied into the runtime image (chmod +x). Regression: the ENTRYPOINT used
	// to reference a file that never existed in the image, so containers with a
	// custom entrypoint failed to start ("exec: ... no such file").
	const pkgName = toPythonPackageName(projectName);
	let dockerEntrypoint = '';
	let dockerCommand = '';
	let dockerScriptCopy = '';
	for (const argv of [config.entrypoint, config.command]) {
		const script = Array.isArray(argv) ? argv[0] : '';
		const match = typeof script === 'string' ? script.match(/^\/usr\/local\/bin\/([^/]+)$/) : null;
		if (match) {
			dockerScriptCopy = `COPY scripts/${match[1]} /usr/local/bin/${match[1]}\nRUN chmod +x /usr/local/bin/${match[1]}`;
			break;
		}
	}
	if (Array.isArray(config.entrypoint) && config.entrypoint.length > 0) {
		dockerEntrypoint = `ENTRYPOINT ${JSON.stringify(config.entrypoint)}`;
	}
	if (Array.isArray(config.command) && config.command.length > 0) {
		dockerCommand = `CMD ${JSON.stringify(config.command)}`;
	} else if (!dockerEntrypoint) {
		dockerCommand = isPython
			? `CMD ["python", "-m", "${pkgName}"]`
			: 'CMD ["node", "build/index.js"]';
	}
	const dockerRunCommand = [dockerScriptCopy, dockerEntrypoint, dockerCommand]
		.filter(Boolean)
		.join('\n');

	const networkModeLine = networkMode === 'host' ? '    network_mode: host' : '';

	// 3.4: publishPort controls the compose port binding. Default is
	// "<exposePort>:<exposePort>" (all interfaces). Bind to 127.0.0.1 (or a
	// specific interface) to keep the service private (e.g. Tailscale-only).
	// hostPort is the left-hand side of the binding — the port actually bound
	// on the host — and is what browser-facing URLs (Homepage href/widget)
	// must use: when publishPort maps a different host port than the container
	// port (e.g. "127.0.0.1:3002:3000"), the container port is wrong for URLs
	// (memo: genproj-homepage-port-wart).
	const publishPort = config.publishPort || `${exposePort}:${exposePort}`;
	const hostPort = getHostPort(publishPort, exposePort);
	const portsConfig = networkMode === 'host' ? '' : `    ports:\n      - "${publishPort}"`;

	// 3.3: dataMounts config -> compose volumes (read-only by default).
	const dataMounts = Array.isArray(config.dataMounts) ? config.dataMounts : [];
	const volumesConfig =
		dataMounts.length > 0
			? '    volumes:\n' +
				dataMounts
					.map(
						(mount) =>
							`      - ${mount.hostPath}:${mount.containerPath}${mount.readOnly === false ? '' : ':ro'}`
					)
					.join('\n')
			: '';

	// ---- envVars (memo §3.3 / round-2 fix 1): emitted into compose
	// `environment:` as VALID YAML map entries with `${KEY:-default}`
	// interpolation (preserves the .env override) — never a bare `KEY=value`
	// line under the mapping, which parses as an invalid mapping key and breaks
	// `docker compose config`. .env.example keeps the plain derived keys.
	const envVars = Array.isArray(config.envVars) ? config.envVars : [];
	const composeEnvVars = envVars
		.map((entry) => {
			const eq = entry.indexOf('=');
			const key = eq === -1 ? entry : entry.slice(0, eq);
			const def = eq === -1 ? '' : entry.slice(eq + 1);
			// Map form: `KEY: ${KEY:-default}` (or `${KEY}` for a bare key).
			return def ? `      ${key}: ${'$'}{${key}:-${def}}` : `      ${key}: ${'$'}{${key}}`;
		})
		.join('\n');
	const envExampleEntries = envVars
		.map((entry) => (entry.includes('=') ? entry : `${entry}=`))
		.join('\n');

	const labels = [];
	if (watchtower || homepage) labels.push('    labels:');
	if (watchtower) labels.push('      - "com.centurylinklabs.watchtower.enable=true"');
	if (homepage) {
		labels.push(
			'      - "homepage.group=Services"',
			`      - "homepage.name=${projectName}"`,
			`      - "homepage.href=http://${hostname}:${hostPort}/"`
		);
		// Widget only when a real health endpoint exists (memo §2.8).
		if (healthcheckPath) {
			labels.push(
				'      - "homepage.widget.type=customapi"',
				`      - "homepage.widget.url=http://localhost:${hostPort}${healthcheckPath}"`
			);
		}
	}

	// Homepage's Docker provider queries the daemon, so the widget URL
	// legitimately uses localhost (even for a loopback-bound service) — but it
	// must still point at the published HOST port, never the container port
	// (memo: genproj-homepage-port-wart).
	const homepageWidget = healthcheckPath
		? `    widget:\n      type: customapi\n      url: http://localhost:${hostPort}${healthcheckPath}`
		: '';

	return {
		registryPrefix,
		registryNamespace,
		circleciContext,
		dockerBaseImage,
		dockerAptInstall,
		dockerBuildCommands,
		dockerRuntimeCommands,
		dockerHealthcheck,
		dockerRunCommand,
		exposePort: String(exposePort),
		hostPort: String(hostPort),
		networkMode,
		networkModeLine,
		portsConfig,
		volumesConfig,
		composeEnvVars,
		envExampleEntries,
		composeLabels: labels.join('\n'),
		homepageWidget,
		hostname,
		watchtower: String(watchtower),
		homepage: String(homepage)
	};
}

/**
 * Adds a docker-publish job to the CircleCI config data when the
 * docker-container deployment capability is selected.
 * @param {Object} data - CircleCI template data (mutated)
 * @param {Object} context - Generation context
 * @param {boolean} contextEnabled - Whether the CircleCI context is enabled
 * @param {string} contextName - CircleCI context name
 */
function _applyDockerContainerConfig(data, context, contextEnabled, contextName) {
	if (!context.capabilities.includes('docker-container')) {
		return;
	}

	const registryPrefix = getDockerRegistryPrefix();
	const projectName = context.projectName || 'my-project';
	const config = context.configuration?.['docker-container'] || {};
	const registryNamespace = context.registryNamespace || config.registryNamespace || 'OWNER';
	const imageRef = `${registryPrefix}/${registryNamespace}/${projectName}`;
	const credentialVars = DOCKER_CREDENTIAL_VARS;

	data.deployJobDefinition = `
  docker-publish:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - setup_remote_docker
      - run:
          name: Login to Container Registry
          command: |
            echo "$${credentialVars.token}" | docker login ${registryPrefix} -u "$${credentialVars.user}" --password-stdin
      - run:
          name: Build and Push Multi-Arch Image
          command: |
            docker buildx create --use || true
            docker buildx build --platform linux/amd64,linux/arm64 \\
              -t ${imageRef}:$CIRCLE_SHA1 -t ${imageRef}:latest --push .`;

	data.deployWorkflowJob = `
      - docker-publish:${contextEnabled ? `\n          context: ${contextName}` : ''}
          requires:
            - build
          filters:
            branches:
              only: main`;
}

function getCircleCiTemplateData(context) {
	const data = {
		preBuildSteps: '',
		testSteps: '',
		lighthouseJobDefinition: '',
		lighthouseWorkflowJob: '',
		deployJobDefinition: '',
		deployWorkflowJob: '',
		orbs: '',
		commands: '',
		additionalWorkflowJobs: '',
		buildWorkflowJob: '      - build',
		jobEnvironment: '',
		// Language-aware build job fragments (memo §2.1). Python gets a
		// cimg/python executor + venv/pip install/ruff/pytest; Node keeps the
		// node orb + npm ci/build/test. docker-publish is unchanged (multi-arch
		// buildx -> GHCR) and shared by both languages.
		ciOrbs: '  node: circleci/node@5.0.2\n',
		buildExecutor: '    executor: node/default',
		ciCacheRestore:
			'          keys:\n            - v1-deps-{{ checksum "package.json" }}\n            - v1-deps-',
		ciCacheSave:
			'          paths:\n            - node_modules\n          key: v1-deps-{{ checksum "package.json" }}',
		ciInstallCommand:
			'            if [ -f package-lock.json ]; then\n              npm ci\n            else\n              npm install\n            fi',
		ciBuildStep: '      - run:\n          name: Build\n          command: npm run build'
	};

	const contextConfig = context.configuration?.circleci?.context;
	// Default enabled is true, default name is 'common'
	const contextEnabled = contextConfig?.enabled ?? true;
	const contextName = contextConfig?.name || 'common';

	const buildJobContext = contextEnabled ? `\n          context: ${contextName}` : '';

	const language = resolveLanguage(context);
	if (language === 'python') {
		data.ciOrbs = '';
		data.buildExecutor = '    docker:\n      - image: cimg/python:3.12\n';
		data.ciCacheRestore =
			'          keys:\n            - v1-venv-{{ checksum "pyproject.toml" }}\n            - v1-venv-';
		data.ciCacheSave =
			'          paths:\n            - .venv\n          key: v1-venv-{{ checksum "pyproject.toml" }}';
		data.ciInstallCommand =
			'            python3 -m venv .venv\n            echo \'. .venv/bin/activate\' >> "$BASH_ENV"\n            pip install --upgrade pip\n            pip install -e ".[dev]"';
		data.ciBuildStep = '';
	}

	_applyGitGuardianConfig(data, context, contextEnabled, contextName, buildJobContext);
	_applyDopplerConfig(data, context);
	_applyLighthouseConfig(data, context, contextEnabled, contextName);
	_applyCloudflareConfig(data, context, contextEnabled, contextName);
	_applyDockerContainerConfig(data, context, contextEnabled, contextName);
	_applyNtfyNotificationConfig(data, context);

	// Lint step first (ruff/ESLint), then the test step.
	_applyCodeQualityConfig(data, context);

	if (language === 'python') {
		if (context.capabilities.some((c) => c.startsWith('devcontainer-python'))) {
			data.testSteps += `      - run:
          name: Test (pytest)
          command: pytest -v\n`;
		}
	} else if (
		context.capabilities.includes('devcontainer-node') &&
		context.capabilities.includes('circleci')
	) {
		data.testSteps += `      - run:
          name: Test with Coverage
          command: npx vitest --coverage\n`;
	}

	if (data.commands) {
		data.commands = `commands:\n${data.commands}`;
	}

	return data;
}

function _applyNtfyNotificationConfig(data, context) {
	const circleciConfig = context.configuration?.circleci || {};
	if (!circleciConfig.ntfyNotifications) {
		return;
	}

	_ensureInstallDopplerCommand(data);

	data.commands += `  notify_deployment:
    description: "Send ntfy notification upon deployment completion"
    parameters:
      environment_name:
        type: string
        default: "Production"
      doppler_config:
        type: string
        default: "prd"
    steps:
      - run:
          name: Send deployment completion notification
          command: |
            DOPPLER_ARGS=""
            if [ -n "$DOPPLER_TOKEN" ]; then
              DOPPLER_ARGS="--token $DOPPLER_TOKEN"
              if [[ ! "$DOPPLER_TOKEN" =~ ^dp\\.st\\. ]]; then
                DOPPLER_ARGS="$DOPPLER_ARGS --project common --config << parameters.doppler_config >>"
              fi
            else
              DOPPLER_ARGS="--project common --config << parameters.doppler_config >>"
            fi
            NTFY_URL=$(doppler secrets get NTFY_URL_CIRCLECI_BUILD --plain $DOPPLER_ARGS 2>/dev/null || true)
            if [ -n "$NTFY_URL" ]; then
              COMMIT_MSG=$(git log -1 --pretty=format:"%s" "\${CIRCLE_SHA1}" 2>/dev/null || echo "")
              curl -s -d "🚀 [\${CIRCLE_PROJECT_REPONAME}] << parameters.environment_name >> deployment successful! Branch: \${CIRCLE_BRANCH}, Commit: \${CIRCLE_SHA1:0:7} \${COMMIT_MSG}" "$NTFY_URL"
              echo "Notification sent successfully to ntfy."
            else
              echo "⚠️ NTFY_URL_CIRCLECI_BUILD secret not found in Doppler or empty."
            fi\n`;

	if (data.deployJobDefinition) {
		data.deployJobDefinition += `
      - when:
          condition:
            equal: [ main, << pipeline.git.branch >> ]
          steps:
            - install_doppler
            - notify_deployment:
                environment_name: "Production"
                doppler_config: "prd"`;
	}
}

function getDependabotTemplateData(context) {
	const config = context.configuration?.dependabot || {};
	const interval = config.updateSchedule || 'weekly';
	const updates = [
		`
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "${interval}"`
	];

	// Always add GitHub Actions

	if (context.capabilities.includes('devcontainer-node')) {
		updates.push(`
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "${interval}"`);
	}

	if (context.capabilities.some((c) => c.startsWith('devcontainer-python'))) {
		updates.push(`
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "${interval}"`);
	}

	// Java support
	if (context.capabilities.some((c) => c.startsWith('devcontainer-java'))) {
		updates.push(`
  - package-ecosystem: "maven"
    directory: "/"
    schedule:
      interval: "${interval}"`);
	}

	// Rust support (devcontainer-rust or cloudflare-wrangler with workerType: rust)
	const hasRustDevcontainer = context.capabilities.some((c) => c.startsWith('devcontainer-rust'));
	const hasRustWorker =
		context.capabilities.includes('cloudflare-wrangler') &&
		context.configuration?.['cloudflare-wrangler']?.workerType === 'rust';
	if (hasRustDevcontainer || hasRustWorker) {
		const directory = hasRustWorker ? '/worker' : '/';
		updates.push(`
  - package-ecosystem: "cargo"
    directory: "${directory}"
    schedule:
      interval: "${interval}"`);
	}

	return {
		dependabotUpdates: updates.join('')
	};
}

export { getGooseMcpConfig, assertNoGooseEnvVarReferences };

export function getCapabilityTemplateData(capabilityId, context) {
	const dataGenerators = {
		'coding-agents': getCodingAgentsTemplateData,
		sonarcloud: getSonarCloudTemplateData,
		circleci: getCircleCiTemplateData,
		dependabot: getDependabotTemplateData,
		'docker-container': getDockerContainerTemplateData
	};

	const generator = dataGenerators[capabilityId];
	return generator ? generator(context) : {};
}

export function applyDefaults(capability, config) {
	const finalConfig = { ...config };
	if (capability?.configurationSchema?.properties) {
		for (const [key, property] of Object.entries(capability.configurationSchema.properties)) {
			if (finalConfig[key] === undefined && property.default !== undefined) {
				finalConfig[key] = property.default;
			}
		}
	}
	return finalConfig;
}
