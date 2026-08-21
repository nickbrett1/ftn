import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';
import {
	getCapabilityTemplateData,
	resolveLanguage
} from '$lib/utils/capability-template-utils.js';
import { capabilities } from '$lib/config/capabilities.js';

/**
 * Language-aware templates (memo: genproj-language-aware-fixes + round 2).
 * Acceptance criteria (round-2 memo §5): regenerate nas-port-mcp with ZERO
 * infra edits — valid compose environment YAML, pyproject runtime deps from
 * config, and the 8/8 prior items still green.
 */

// The round-2 memo §5 regenerate config for nas-port-mcp.
const NAS_PORT_MCP_CONFIG = {
	'docker-container': {
		networkMode: 'host',
		publishPort: '127.0.0.1:3001:3001',
		exposePort: 3001,
		registryNamespace: 'nickbrett1',
		dataMounts: [
			{
				hostPath: '/var/run/docker.sock',
				containerPath: '/var/run/docker.sock',
				readOnly: true
			}
		],
		aptPackages: ['iproute2'],
		healthcheck: 'http:/healthz',
		entrypoint: ['/usr/local/bin/entrypoint.sh'],
		envVars: ['MCP_PORT=3001'],
		pythonDependencies: ['mcp>=1.2.0', 'mcpo>=0.1.0', 'httpx>=0.27.0']
	}
};

// Same config minus the health mechanism, for the "no healthcheck declared"
// test (Python default must omit HEALTHCHECK + widget).
const NAS_PORT_MCP_NO_HEALTH_CONFIG = {
	'docker-container': {
		...NAS_PORT_MCP_CONFIG['docker-container'],
		healthcheck: undefined
	}
};

async function generateNasPortMcp(config = NAS_PORT_MCP_CONFIG, extraCaps = []) {
	const context = {
		projectName: 'nas-port-mcp',
		description: 'MCP server that answers "what host port can I use?" on the NAS.',
		capabilities: [
			'devcontainer-python',
			'docker-container',
			'circleci',
			'dependabot',
			...extraCaps
		],
		configuration: config,
		registryNamespace: 'nickbrett1'
	};
	const files = await generateAllFiles(context);
	return { context, files };
}

describe('resolveLanguage', () => {
	it('derives python from devcontainer-python', () => {
		expect(resolveLanguage({ capabilities: ['devcontainer-python', 'docker-container'] })).toBe(
			'python'
		);
	});

	it('derives node by default (backward compatible)', () => {
		expect(resolveLanguage({ capabilities: ['circleci'] })).toBe('node');
		expect(resolveLanguage({ capabilities: ['devcontainer-node', 'sveltekit'] })).toBe('node');
	});

	it('honours an explicit language config override', () => {
		expect(
			resolveLanguage({
				capabilities: ['devcontainer-node'],
				configuration: { language: 'python' }
			})
		).toBe('python');
	});
});

describe('Python CircleCI job (memo §2.1)', () => {
	it('emits a Python job (cimg/python, venv, pip install -e ".[dev]", ruff, pytest) and keeps docker-publish', async () => {
		const { files } = await generateNasPortMcp();
		const ci = files.find((f) => f.filePath === '.circleci/config.yml');
		expect(ci).toBeDefined();

		const content = ci.content;
		// No node orb for Python projects.
		expect(content).not.toContain('circleci/node');
		expect(content).not.toContain('npm ci');
		expect(content).not.toContain('npm run build');
		// Python executor + install + checks.
		expect(content).toContain('cimg/python:3.12');
		expect(content).toContain('python3 -m venv .venv');
		expect(content).toContain('pip install -e ".[dev]"');
		expect(content).toContain('ruff check src tests');
		expect(content).toContain('pytest -v');
		// docker-publish job defaults to x86_64 (linux/amd64); arm64 is opt-in.
		expect(content).toContain('docker-publish');
		expect(content).toContain('linux/amd64');
		expect(content).toContain('ghcr.io/nickbrett1/nas-port-mcp');
	});
});

describe('Python Dockerfile (memo §2.2, §3.1, §3.2, §2.8)', () => {
	it('builds a pyproject-only repo (no requirements.txt) and honours entrypoint/aptPackages', async () => {
		const { files } = await generateNasPortMcp();
		const dockerfile = files.find((f) => f.filePath === 'Dockerfile');
		expect(dockerfile).toBeDefined();

		const content = dockerfile.content;
		expect(content).toContain('FROM python:3.12-slim AS build');
		// genproj-docker-build-speedup: manifest-first ordering — manifests +
		// README copied first, deps installed pre-copy via a placeholder
		// package, then the source copy and a cheap --no-deps reinstall.
		// requirements.txt with an editable self-install (`-e .[dev]`) still
		// works: local refs are filtered out of the pre-copy install and the
		// full requirements install happens after the copy (nas-port-mcp bug 2).
		expect(content).toContain('COPY README.md pyproject.toml* requirements.txt* ./');
		expect(content).toContain('mkdir -p src/nas_port_mcp && touch src/nas_port_mcp/__init__.py');
		expect(content.indexOf('pip install --no-cache-dir .')).toBeLessThan(
			content.indexOf('COPY . .')
		);
		expect(content.indexOf('COPY . .')).toBeLessThan(
			content.indexOf('pip install --no-cache-dir --no-deps .')
		);
		expect(content).toContain(
			'RUN if [ -f requirements.txt ]; then \\\n      /opt/venv/bin/pip install --no-cache-dir -r requirements.txt; \\\n    elif [ -f pyproject.toml ]; then \\\n      /opt/venv/bin/pip install --no-cache-dir --no-deps .; \\\n    fi'
		);
		// No placeholder comment; ENTRYPOINT comes from configuration.
		expect(content).not.toContain('TODO');
		expect(content).toContain('ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]');
		// The referenced script must actually exist in the image: genproj copies
		// scripts/entrypoint.sh -> /usr/local/bin/entrypoint.sh (memo §3.1 —
		// regression: the ENTRYPOINT used to point at a file that never existed,
		// so the container failed to start).
		expect(content).toContain(
			'COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh\nRUN chmod +x /usr/local/bin/entrypoint.sh'
		);
		// aptPackages installed in the runtime stage (curl auto-added for the
		// http healthcheck).
		expect(content).toContain(
			'RUN apt-get update && apt-get install -y --no-install-recommends iproute2 curl'
		);
		expect(content).toContain('EXPOSE 3001');
	});

	it('emits HEALTHCHECK + installs curl when an http health mechanism is declared', async () => {
		const { files } = await generateNasPortMcp();
		const dockerfile = files.find((f) => f.filePath === 'Dockerfile');
		expect(dockerfile.content).toContain('HEALTHCHECK');
		expect(dockerfile.content).toContain('curl -fsS http://127.0.0.1:3001/healthz');

		// Widget URL must match the declared health path (memo §2.8).
		const compose = files.find((f) => f.filePath === 'docker-compose.yml');
		expect(compose.content).toContain('homepage.widget.url=http://localhost:3001/healthz');
		const homepage = files.find((f) => f.filePath === 'deploy/homepage-services.yaml');
		expect(homepage.content).toContain('url: http://localhost:3001/healthz');
	});

	it('omits HEALTHCHECK and the widget when no health mechanism is declared (Python default)', async () => {
		const { files } = await generateNasPortMcp(NAS_PORT_MCP_NO_HEALTH_CONFIG);
		const dockerfile = files.find((f) => f.filePath === 'Dockerfile');
		expect(dockerfile.content).not.toContain('HEALTHCHECK');

		const compose = files.find((f) => f.filePath === 'docker-compose.yml');
		expect(compose.content).not.toContain('homepage.widget');
		const homepage = files.find((f) => f.filePath === 'deploy/homepage-services.yaml');
		expect(homepage.content).not.toContain('widget:');
	});

	it('emits no script COPY for the default language command (no entrypoint/command config)', async () => {
		const config = {
			'docker-container': {
				...NAS_PORT_MCP_CONFIG['docker-container'],
				entrypoint: undefined,
				command: undefined
			}
		};
		const { files } = await generateNasPortMcp(config);
		const dockerfile = files.find((f) => f.filePath === 'Dockerfile');
		expect(dockerfile.content).not.toContain('COPY scripts/');
		expect(dockerfile.content).toContain('CMD ["python", "-m", "nas_port_mcp"]');
	});
});

describe('Compose + env (memo §2.6, §3.3, do-not-regress)', () => {
	it('keeps host network, docker.sock ro, watchtower/homepage labels, GHCR owner and emits envVars', async () => {
		const { files } = await generateNasPortMcp();
		const compose = files.find((f) => f.filePath === 'docker-compose.yml');
		const content = compose.content;

		expect(content).toContain('network_mode: host');
		expect(content).not.toContain('ports:');
		expect(content).toContain('/var/run/docker.sock:/var/run/docker.sock:ro');
		expect(content).toContain('ghcr.io/nickbrett1/nas-port-mcp:latest');
		expect(content).not.toContain('OWNER');
		expect(content).toContain('com.centurylinklabs.watchtower.enable=true');
		expect(content).toContain('homepage.group=Services');
		// envVars emitted as VALID YAML map entries (round-2 fix 1) — never a
		// bare `KEY=value` line under the mapping.
		expect(content).toContain('MCP_PORT: ${MCP_PORT:-3001}');
		expect(content).not.toMatch(/^\s+MCP_PORT=3001$/m);
	});

	it('derives .env.example keys from envVars and never invents MY_APP_PORT', async () => {
		const { files } = await generateNasPortMcp();
		const envExample = files.find((f) => f.filePath === '.env.example');
		expect(envExample).toBeDefined();
		expect(envExample.content).toContain('MCP_PORT=3001');
		expect(envExample.content).not.toContain('MY_APP_PORT');
	});

	it('emits a docker-compose.yml whose environment: block parses as valid YAML', async () => {
		const YAML = await import('yaml');
		const { files } = await generateNasPortMcp();
		const compose = files.find((f) => f.filePath === 'docker-compose.yml');

		// Equivalent of `docker compose config` parse step: the whole file must
		// be valid YAML and environment must be a mapping of KEY -> value.
		const doc = YAML.parse(compose.content);
		expect(doc.services.app.image).toBe('ghcr.io/nickbrett1/nas-port-mcp:latest');
		expect(doc.services.app.network_mode).toBe('host');
		expect(doc.services.app.environment).toEqual({ MCP_PORT: '${MCP_PORT:-3001}' });
	});
});

describe('Python scaffold (memo §2.3, §2.5, §2.4)', () => {
	it('emits a standard src-layout pyproject with dev extras and real description', async () => {
		const { files } = await generateNasPortMcp();
		const pyproject = files.find((f) => f.filePath === 'pyproject.toml');
		expect(pyproject).toBeDefined();

		const content = pyproject.content;
		expect(content).not.toContain('Generated by Project Generation Tool');
		expect(content).toContain('MCP server that answers');
		expect(content).toContain('[project.optional-dependencies]');
		expect(content).toContain('"pytest>=8.0"');
		expect(content).toContain('"ruff>=0.4"');
		// Round-2 fix 2: pythonDependencies config lands in [project] dependencies.
		expect(content).toMatch(
			/dependencies = \[\n {4}"mcp>=1\.2\.0",\n {4}"mcpo>=0\.1\.0",\n {4}"httpx>=0\.27\.0"\n\]/
		);
		expect(content).toContain('[tool.setuptools.packages.find]');
		expect(content).toContain('where = ["src"]');
		expect(content).toContain('testpaths = ["tests"]');
		expect(content).not.toContain('python_files');
	});

	it('keeps [project] dependencies empty when pythonDependencies is not configured', async () => {
		const { files } = await generateNasPortMcp({
			'docker-container': {
				registryNamespace: 'nickbrett1'
			}
		});
		const pyproject = files.find((f) => f.filePath === 'pyproject.toml');
		expect(pyproject.content).toMatch(/^dependencies = \[\]/m);
		// pytest/ruff stay in the dev extra either way.
		expect(pyproject.content).toContain('"pytest>=8.0"');
	});

	it('scaffolds src/<pkg>/ and tests/ so ruff and pytest pass with zero edits', async () => {
		const { files } = await generateNasPortMcp();
		expect(files.some((f) => f.filePath === 'src/nas_port_mcp/__init__.py')).toBe(true);
		const smoke = files.find((f) => f.filePath === 'tests/test_smoke.py');
		expect(smoke).toBeDefined();
		expect(smoke.content).toContain('test_package_imports');
	});

	// Round-3 fix (memo genproj-fixes-round3, Option A): with a custom
	// docker-container command/entrypoint the app provides its own entry point,
	// so the scaffold __main__.py must NOT be emitted (regeneration used to
	// clobber the app's real __main__.py with this placeholder).
	it('does not emit src/<pkg>/__main__.py when docker-container has a custom entrypoint', async () => {
		const { files } = await generateNasPortMcp();
		expect(files.some((f) => f.filePath === 'src/nas_port_mcp/__main__.py')).toBe(false);
	});

	it('does not emit src/<pkg>/__main__.py when docker-container has a custom command', async () => {
		const { files } = await generateNasPortMcp({
			'docker-container': {
				...NAS_PORT_MCP_CONFIG['docker-container'],
				entrypoint: undefined,
				command: ['/usr/local/bin/entrypoint.sh']
			}
		});
		expect(files.some((f) => f.filePath === 'src/nas_port_mcp/__main__.py')).toBe(false);
	});

	// Fresh-project behavior must be unchanged: no custom command/entrypoint →
	// the placeholder __main__.py is still scaffolded.
	it('still scaffolds src/<pkg>/__main__.py for fresh projects without a custom command/entrypoint', async () => {
		const { files } = await generateNasPortMcp({
			'docker-container': {
				registryNamespace: 'nickbrett1'
			}
		});
		expect(files.some((f) => f.filePath === 'src/nas_port_mcp/__main__.py')).toBe(true);
	});

	it('emits a root README with a Python quickstart and deploy pointer, and no requirements.txt (pyproject-first)', async () => {
		const { files } = await generateNasPortMcp();
		const readme = files.find((f) => f.filePath === 'README.md');
		expect(readme).toBeDefined();
		expect(readme.content).toContain('pip install -e ".[dev]"');
		expect(readme.content).toContain('ruff check src tests');
		expect(readme.content).toContain('deploy/README.md');

		// 2.4: pick one — Dockerfile is pyproject-first, so no requirements.txt.
		expect(files.some((f) => f.filePath === 'requirements.txt')).toBe(false);
	});

	it('emits deploy/README.md with classic-PAT GHCR guidance and CircleCI context setup', async () => {
		const { files } = await generateNasPortMcp();
		const readme = files.find((f) => f.filePath === 'deploy/README.md');
		expect(readme).toBeDefined();

		// nas-port-mcp bug 3: fine-grained PATs cannot access GHCR — instruct a
		// classic PAT with write:packages.
		expect(readme.content).toContain('classic** PAT with the `write:packages` scope');
		expect(readme.content).toContain(
			'https://github.com/settings/tokens/new?scopes=write:packages'
		);
		expect(readme.content).not.toContain('fine-grained PAT with Packages');
		// nas-port-mcp bug 4: one-time CircleCI context setup step, naming the
		// actual context (default `common`), not the registry prefix.
		expect(readme.content).toContain('CircleCI context (`common`)');
		expect(readme.content).toContain('One-time CI setup (CircleCI context)');
		expect(readme.content).toContain('GHCR_USERNAME` = your GitHub username');
		expect(readme.content).toContain('GHCR_TOKEN` = a **classic** personal access token');
	});
});

describe('code-quality Python variant (memo §2.7)', () => {
	it('is a selectable capability requiring devcontainer-python', () => {
		const cap = capabilities.find((c) => c.id === 'code-quality-python');
		expect(cap).toBeDefined();
		expect(cap.name).toContain('Ruff');
		expect(cap.dependencies).toContain('devcontainer-python');
	});

	it('adds a ruff lint step to the CircleCI config when selected', async () => {
		const { files } = await generateNasPortMcp(NAS_PORT_MCP_CONFIG, ['code-quality-python']);
		const ci = files.find((f) => f.filePath === '.circleci/config.yml');
		expect(ci.content).toContain('Lint (Ruff)');
		expect(ci.content).toContain('ruff check src tests');
	});
});

describe('Devcontainer kitchen sink (memo §2.9)', () => {
	it('does not leak unselected tooling into post-create-setup.sh', async () => {
		const { files } = await generateNasPortMcp();
		const setup = files.find((f) => f.filePath === '.devcontainer/post-create-setup.sh');
		expect(setup).toBeDefined();
		// None of these are selected: wrangler, doppler, gemini, specdag, socat, nanobanana.
		expect(setup.content).not.toContain('.wrangler');
		expect(setup.content).not.toContain('.doppler');
		expect(setup.content).not.toContain('.gemini');
		expect(setup.content).not.toContain('specdag');
		expect(setup.content).not.toContain('socat');
		expect(setup.content).not.toContain('nanobanana');
		// Python venv setup retained (do-not-regress).
		expect(setup.content).toContain('pyproject.toml');
	});
});

describe('Node regression (memo §6)', () => {
	it('keeps the Node docker-container path: /health route, HEALTHCHECK, widget, adapter-node', async () => {
		const context = {
			projectName: 'parquet-peek',
			capabilities: ['sveltekit', 'devcontainer-node', 'docker-container', 'circleci'],
			configuration: {
				'docker-container': {
					publishPort: '127.0.0.1:3000:3000',
					dataMounts: [
						{
							hostPath: '/volume1/marketdata',
							containerPath: '/data',
							readOnly: true
						}
					]
				}
			},
			registryNamespace: 'nickbrett1'
		};
		const files = await generateAllFiles(context);

		const dockerfile = files.find((f) => f.filePath === 'Dockerfile');
		expect(dockerfile.content).toContain('FROM node:22-slim AS build');
		expect(dockerfile.content).toContain('HEALTHCHECK');
		expect(dockerfile.content).toContain("fetch('http://127.0.0.1:3000/health')");
		expect(dockerfile.content).toContain('CMD ["node", "build/index.js"]');

		expect(files.some((f) => f.filePath === 'src/routes/health/+server.js')).toBe(true);

		const compose = files.find((f) => f.filePath === 'docker-compose.yml');
		expect(compose.content).toContain('127.0.0.1:3000:3000');
		expect(compose.content).toContain('/volume1/marketdata:/data:ro');
		expect(compose.content).toContain('homepage.widget.url=http://localhost:3000/health');
		expect(compose.content).toContain('ghcr.io/nickbrett1/parquet-peek:latest');
		expect(compose.content).not.toContain('OWNER');

		const ci = files.find((f) => f.filePath === '.circleci/config.yml');
		expect(ci.content).toContain('circleci/node@5.0.2');
		expect(ci.content).toContain('executor: node/default');
		expect(ci.content).toContain('npm run build');
		expect(ci.content).toContain('docker-publish');
	});
});

describe('Homepage URLs use the published host port (genproj-homepage-port-wart)', () => {
	it('emits href/widget with the HOST port when publishPort maps a different host port', async () => {
		const context = {
			projectName: 'parquet-peek',
			description: 'Peek at Databento parquet files from the phone.',
			capabilities: ['sveltekit', 'devcontainer-node', 'docker-container', 'circleci'],
			configuration: {
				'docker-container': {
					publishPort: '127.0.0.1:3002:3000',
					hostname: 'nas',
					healthcheck: 'http:/health'
				}
			},
			registryNamespace: 'nickbrett1'
		};
		const files = await generateAllFiles(context);

		const compose = files.find((f) => f.filePath === 'docker-compose.yml');
		// href: browser-facing -> configured hostname + host port 3002.
		expect(compose.content).toContain('homepage.href=http://nas:3002/');
		expect(compose.content).not.toContain('homepage.href=http://nas:3000/');
		// widget: Homepage queries the daemon -> localhost, but still host port 3002.
		expect(compose.content).toContain('homepage.widget.url=http://localhost:3002/health');
		expect(compose.content).not.toContain('homepage.widget.url=http://localhost:3000/health');

		// Snippet agrees with the compose labels (single source of truth).
		const homepage = files.find((f) => f.filePath === 'deploy/homepage-services.yaml');
		expect(homepage.content).toContain('href: http://nas:3002/');
		expect(homepage.content).toContain('url: http://localhost:3002/health');
		expect(homepage.content).not.toContain(':3000/');
	});

	it('keeps default ports in compose labels and snippet when publishPort is unset', async () => {
		const context = {
			projectName: 'demo-app',
			capabilities: ['sveltekit', 'devcontainer-node', 'docker-container'],
			configuration: {},
			registryNamespace: 'nickbrett1'
		};
		const files = await generateAllFiles(context);

		const compose = files.find((f) => f.filePath === 'docker-compose.yml');
		expect(compose.content).toContain('homepage.href=http://localhost:3000/');
		expect(compose.content).toContain('homepage.widget.url=http://localhost:3000/health');
		const homepage = files.find((f) => f.filePath === 'deploy/homepage-services.yaml');
		expect(homepage.content).toContain('href: http://localhost:3000/');
		expect(homepage.content).toContain('url: http://localhost:3000/health');
	});
});

describe('docker-container template data (config plumbing)', () => {
	it('exposes envVars/aptPackages/healthcheck/pythonDependencies fragments to templates', () => {
		const data = getCapabilityTemplateData('docker-container', {
			projectName: 'demo',
			capabilities: ['devcontainer-python', 'docker-container'],
			configuration: {
				'docker-container': {
					aptPackages: ['iproute2'],
					envVars: ['PORT=3001', 'BARE_KEY'],
					healthcheck: 'http:/healthz'
				}
			}
		});
		expect(data.dockerAptInstall).toContain('iproute2');
		expect(data.dockerAptInstall).toContain('curl'); // auto-added for python http healthcheck
		// compose environment is valid YAML map form with ${KEY:-default} interpolation.
		expect(data.composeEnvVars).toContain('PORT: ${PORT:-3001}');
		expect(data.composeEnvVars).toContain('BARE_KEY: ${BARE_KEY}');
		expect(data.composeEnvVars).not.toMatch(/^\s+PORT=3001$/m);
		expect(data.envExampleEntries).toContain('PORT=3001');
		expect(data.envExampleEntries).toContain('BARE_KEY=');
		expect(data.dockerHealthcheck).toContain('/healthz');
		expect(data.homepageWidget).toContain('/healthz');
	});

	it('exposes pythonDependencies from the docker-container config schema', () => {
		const cap = capabilities.find((c) => c.id === 'docker-container');
		expect(cap.configurationSchema.properties.pythonDependencies).toBeDefined();
		expect(cap.configurationSchema.properties.pythonDependencies.type).toBe('array');
	});
});
