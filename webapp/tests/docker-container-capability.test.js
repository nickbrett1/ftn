/**
 * @fileoverview Tests for the docker-container deployment capability:
 * catalog entry, symmetric conflicts, template data, and CircleCI wiring.
 */

import { describe, it, expect } from 'vitest';
import {
	capabilities,
	getCapabilityById,
	validateCapabilityDependencies
} from '../src/lib/config/capabilities.js';
import { getCapabilityTemplateData } from '../src/lib/utils/capability-template-utils.js';

const DEPLOYMENT_IDS = ['cloudflare-wrangler', 'google-cloud', 'docker-container'];

describe('docker-container capability', () => {
	it('is defined with correct metadata', () => {
		const capability = getCapabilityById('docker-container');
		expect(capability).toBeDefined();
		expect(capability.id).toBe('docker-container');
		expect(capability.name).toBe('Docker Container');
		expect(capability.category).toBe('deployment');
		expect(capability.dependencies).toEqual(['docker']);
		expect(capability.configurationSchema.properties).toMatchObject({
			registry: { default: 'ghcr' },
			networkMode: { default: 'bridge' },
			exposePort: { default: 3000 },
			publishPort: { default: '3000:3000' },
			baseImage: { default: 'node:22-slim' },
			hostname: { default: 'localhost' },
			dataMounts: { default: [] },
			watchtower: { default: true },
			homepage: { default: true }
		});
		// GHCR is the only supported registry.
		expect(capability.configurationSchema.properties.registry.enum).toEqual(['ghcr']);
		// commit-sha is the only supported tag strategy.
		expect(capability.configurationSchema.properties.tagStrategy.enum).toEqual(['commit-sha']);
		expect(capability.configurationSchema.properties.tagStrategy.default).toBe('commit-sha');
		expect(capability.templates.map((t) => t.templateId)).toEqual([
			'dockerfile',
			'dockerignore',
			'docker-compose',
			'deploy-readme',
			'homepage-services',
			'env-example'
		]);
	});

	it('declares symmetric conflicts with all other deployment systems', () => {
		const dockerContainer = getCapabilityById('docker-container');
		expect(dockerContainer.conflicts).toEqual(
			expect.arrayContaining(['cloudflare-wrangler', 'google-cloud'])
		);

		// Symmetry: every deployment capability that docker-container conflicts
		// with must also declare docker-container as a conflict.
		for (const otherId of DEPLOYMENT_IDS.filter((id) => id !== 'docker-container')) {
			const other = getCapabilityById(otherId);
			expect(other.conflicts).toContain('docker-container');
		}
	});

	it('is reported as conflicting by validateCapabilityDependencies', () => {
		const result = validateCapabilityDependencies(['docker-container', 'cloudflare-wrangler']);
		expect(result.valid).toBe(false);
		expect(result.conflicts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					capability1: 'docker-container',
					capability2: 'cloudflare-wrangler'
				})
			])
		);
	});

	it('appears once in the catalog with a unique id', () => {
		const ids = capabilities.map((c) => c.id);
		expect(ids.filter((id) => id === 'docker-container')).toHaveLength(1);
	});
});

describe('docker-container template data', () => {
	it('uses ghcr.io prefix and bridge ports by default', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'circleci'],
			configuration: {},
			projectName: 'demo-app'
		});
		expect(data.registryPrefix).toBe('ghcr.io');
		expect(data.registryNamespace).toBe('OWNER');
		expect(data.networkMode).toBe('bridge');
		expect(data.exposePort).toBe('3000');
		expect(data.networkModeLine).toBe('');
		expect(data.portsConfig).toContain('3000:3000');
		expect(data.composeLabels).toContain('com.centurylinklabs.watchtower.enable=true');
		expect(data.composeLabels).toContain('homepage.widget.type=customapi');
		expect(data.volumesConfig).toBe('');
	});

	it('substitutes the authenticated GitHub login into the registry namespace', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container'],
			configuration: {},
			projectName: 'parquet-peek',
			registryNamespace: 'nickbrett1'
		});
		expect(data.registryNamespace).toBe('nickbrett1');
	});

	it('emits a glibc base image with a multi-stage, lockfile-aware Dockerfile for node', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-node'],
			configuration: {},
			projectName: 'node-app'
		});
		// 2.1: glibc default, not alpine (musl breaks native modules).
		expect(data.dockerBaseImage).toBe('node:22-slim');
		// genproj-docker-build-speedup: manifest-first ordering — manifests
		// (package.json + lockfile) are copied and installed BEFORE the source
		// copy, so the npm ci layer is cached unless the manifest changes.
		// Lockfile-aware install: strict `npm ci` when a package-lock.json
		// exists, `npm install` fallback otherwise (genproj emits no lockfile,
		// so a hard `npm ci` would break every fresh-clone build).
		expect(data.dockerBuildCommands).toContain('COPY package.json package-lock.json* .npmrc* ./');
		expect(
			data.dockerBuildCommands.indexOf('COPY package.json package-lock.json* .npmrc* ./')
		).toBeLessThan(data.dockerBuildCommands.indexOf('npm ci'));
		expect(data.dockerBuildCommands.indexOf('npm ci')).toBeLessThan(
			data.dockerBuildCommands.indexOf('COPY . .')
		);
		expect(data.dockerBuildCommands.indexOf('COPY . .')).toBeLessThan(
			data.dockerBuildCommands.indexOf('npm run build')
		);
		expect(data.dockerBuildCommands).toContain(
			'RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi'
		);
		// 4.2: runtime stage carries only the build output + prod deps.
		expect(data.dockerRuntimeCommands).toContain('COPY --from=build /app/build ./build');
		expect(data.dockerRuntimeCommands).toContain(
			'RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi'
		);
		// 2.2: healthcheck uses node fetch, no wget.
		expect(data.dockerHealthcheck).toContain('node -e');
		expect(data.dockerHealthcheck).not.toContain('wget');
		expect(data.dockerHealthcheck).toContain('/health');
		// CMD matches adapter-node output.
		expect(data.dockerRunCommand).toContain('node');
		expect(data.dockerRunCommand).toContain('build/index.js');
	});

	it('allows opting into alpine via baseImage config', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-node'],
			configuration: {
				'docker-container': { baseImage: 'node:22-alpine' }
			},
			projectName: 'pure-js-app'
		});
		expect(data.dockerBaseImage).toBe('node:22-alpine');
	});

	it('emits host networking and no port mapping when networkMode is host', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container'],
			configuration: {
				'docker-container': { networkMode: 'host', exposePort: 8899 }
			},
			projectName: 'govee-mcp'
		});
		expect(data.networkModeLine).toBe('    network_mode: host');
		expect(data.portsConfig).toBe('');
		expect(data.exposePort).toBe('8899');
	});

	it('honours publishPort, hostname and dataMounts configuration', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container'],
			configuration: {
				'docker-container': {
					publishPort: '127.0.0.1:3000:3000',
					hostname: 'nas.local',
					dataMounts: [
						{ hostPath: '/volume1/marketdata', containerPath: '/data', readOnly: true },
						{ hostPath: '/volume1/writable', containerPath: '/writable', readOnly: false }
					]
				}
			},
			projectName: 'parquet-peek'
		});
		// 3.4: private/loopback-only binding.
		expect(data.portsConfig).toContain('127.0.0.1:3000:3000');
		// 3.2: hostname drives the Homepage href.
		expect(data.composeLabels).toContain('homepage.href=http://nas.local:3000/');
		// 3.3: data mounts emitted read-only by default, rw when requested.
		expect(data.volumesConfig).toContain('/volume1/marketdata:/data:ro');
		expect(data.volumesConfig).toContain('/volume1/writable:/writable');
		expect(data.volumesConfig).not.toContain('/volume1/writable:/writable:ro');
	});

	it('derives the Homepage host port from the left-hand side of publishPort (genproj-homepage-port-wart)', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container'],
			configuration: {
				'docker-container': {
					publishPort: '127.0.0.1:3002:3000',
					hostname: 'nas',
					healthcheck: 'http:/health'
				}
			},
			projectName: 'parquet-peek'
		});
		// hostPort = left-hand side of the mapping, never the container port.
		expect(data.hostPort).toBe('3002');
		expect(data.exposePort).toBe('3000');
		// Compose labels: href uses hostname + hostPort; widget uses
		// localhost + hostPort (Homepage queries the daemon).
		expect(data.composeLabels).toContain('homepage.href=http://nas:3002/');
		expect(data.composeLabels).toContain('homepage.widget.url=http://localhost:3002/health');
		// Snippet agrees with the labels (single source of truth for the port).
		expect(data.homepageWidget).toContain('url: http://localhost:3002/health');
		// The compose port binding itself is untouched.
		expect(data.portsConfig).toContain('127.0.0.1:3002:3000');
	});

	it('keeps default Homepage URLs when publishPort is unset (no regression)', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-node'],
			configuration: {},
			projectName: 'demo-app'
		});
		expect(data.hostPort).toBe('3000');
		expect(data.composeLabels).toContain('homepage.href=http://localhost:3000/');
		expect(data.composeLabels).toContain('homepage.widget.url=http://localhost:3000/health');
		expect(data.homepageWidget).toContain('url: http://localhost:3000/health');
	});

	it('uses a python base image for python projects', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-python'],
			configuration: {},
			projectName: 'py-app'
		});
		expect(data.dockerBaseImage).toBe('python:3.12-slim');
		expect(data.dockerBuildCommands).toContain('pip install');
		expect(data.dockerRuntimeCommands).toContain('COPY --from=build /opt/venv /opt/venv');
	});

	it('installs Python deps before the source copy via a placeholder package (manifest-first)', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-python'],
			configuration: {},
			projectName: 'py-app'
		});
		const commands = data.dockerBuildCommands;
		// genproj-docker-build-speedup (mailroom-proven): manifests + README
		// copied first, then a placeholder package lets `pip install .` resolve
		// pyproject deps with no source present.
		expect(commands).toContain('COPY README.md pyproject.toml* requirements.txt* ./');
		expect(commands).toContain('mkdir -p src/py_app && touch src/py_app/__init__.py');
		expect(commands.indexOf('pip install --no-cache-dir .')).toBeLessThan(
			commands.indexOf('COPY . .')
		);
		// After the source copy the real package is reinstalled cheaply
		// (deps already in the venv).
		expect(commands.indexOf('COPY . .')).toBeLessThan(
			commands.indexOf('pip install --no-cache-dir --no-deps .')
		);
		// venv creation stays cached ahead of the dependency install.
		expect(commands.indexOf('python -m venv /opt/venv')).toBeLessThan(
			commands.indexOf('pip install --no-cache-dir .')
		);
		// requirements.txt still supported: local refs (`-e .[dev]`) filtered
		// out of the pre-copy install, full install after the copy
		// (nas-port-mcp bug 2 regression guard).
		expect(commands).toContain("grep -vE '^\\s*(-e|--editable)\\s+\\.' requirements.txt");
		expect(commands).toContain(
			'RUN if [ -f requirements.txt ]; then \\\n      /opt/venv/bin/pip install --no-cache-dir -r requirements.txt; \\\n    elif [ -f pyproject.toml ]; then \\\n      /opt/venv/bin/pip install --no-cache-dir --no-deps .; \\\n    fi'
		);
	});

	it('uses a maven base image and go-offline manifest-first build for java', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-java'],
			configuration: {},
			projectName: 'java-app'
		});
		expect(data.dockerBaseImage).toBe('maven:3.9-eclipse-temurin-21');
		const commands = data.dockerBuildCommands;
		expect(commands).toContain('COPY pom.xml ./');
		expect(commands).toContain('RUN mvn -B dependency:go-offline');
		expect(commands.indexOf('RUN mvn -B dependency:go-offline')).toBeLessThan(
			commands.indexOf('COPY src ./src')
		);
		expect(commands).toContain('RUN mvn -B package');
		expect(data.dockerRuntimeCommands).toContain(
			'COPY --from=build /app/target/*.jar /app/app.jar'
		);
		expect(data.dockerRunCommand).toContain('CMD ["java", "-jar", "/app/app.jar"]');
	});

	it('uses a rust base image and cargo fetch manifest-first build for rust', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-rust'],
			configuration: {},
			projectName: 'rust-app'
		});
		expect(data.dockerBaseImage).toBe('rust:1-slim');
		const commands = data.dockerBuildCommands;
		expect(commands).toContain('COPY Cargo.toml Cargo.lock* ./');
		expect(commands).toContain('RUN cargo fetch');
		expect(commands.indexOf('RUN cargo fetch')).toBeLessThan(commands.indexOf('COPY src ./src'));
		expect(commands).toContain('RUN cargo build --release');
		expect(data.dockerRuntimeCommands).toContain(
			'COPY --from=build /app/target/release/rust-app /usr/local/bin/rust-app'
		);
		expect(data.dockerRunCommand).toContain('CMD ["rust-app"]');
	});

	it('exposes the CircleCI context name for the deploy runbook', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'circleci'],
			configuration: {
				circleci: { context: { enabled: true, name: 'deploy' } }
			},
			projectName: 'py-app'
		});
		expect(data.circleciContext).toBe('deploy');
	});

	it('defaults the CircleCI context name to common', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'circleci'],
			configuration: {},
			projectName: 'py-app'
		});
		expect(data.circleciContext).toBe('common');
	});
});

describe('CircleCI integration for docker-container', () => {
	it('adds a docker-publish job and workflow when docker-container is selected', () => {
		const data = getCapabilityTemplateData('circleci', {
			capabilities: ['circleci', 'docker-container'],
			configuration: {
				'docker-container': { registry: 'ghcr' },
				circleci: { context: { enabled: true, name: 'common' } }
			},
			projectName: 'govee-mcp'
		});

		expect(data.deployJobDefinition).toContain('docker-publish');
		expect(data.deployJobDefinition).toContain('ghcr.io/OWNER/govee-mcp');
		expect(data.deployJobDefinition).toContain('GHCR_TOKEN');
		expect(data.deployJobDefinition).toContain('GHCR_USERNAME');
		// 4.1: multi-arch buildx push. No --provenance flag: the buildx
		// bundled with cimg/base:stable rejects it ("unknown flag:
		// --provenance") — nas-port-mcp bug 1.
		expect(data.deployJobDefinition).toContain('docker buildx create --use');
		expect(data.deployJobDefinition).toContain('--platform linux/amd64,linux/arm64');
		expect(data.deployJobDefinition).not.toContain('--provenance');
		expect(data.deployJobDefinition).toContain('--push');
		expect(data.deployWorkflowJob).toContain('docker-publish');
		expect(data.deployWorkflowJob).toContain('context: common');
	});

	it('uses the authenticated registry namespace in the image ref', () => {
		const data = getCapabilityTemplateData('circleci', {
			capabilities: ['circleci', 'docker-container'],
			configuration: {
				'docker-container': { registry: 'ghcr' },
				circleci: { context: { enabled: false } }
			},
			projectName: 'parquet-peek',
			registryNamespace: 'nickbrett1'
		});
		expect(data.deployJobDefinition).toContain('ghcr.io/nickbrett1/parquet-peek');
		expect(data.deployJobDefinition).not.toContain('OWNER');
		expect(data.deployJobDefinition).toContain('GHCR_TOKEN');
		expect(data.deployJobDefinition).toContain('GHCR_USERNAME');
		expect(data.deployWorkflowJob).not.toContain('context:');
	});

	it('leaves deploy jobs empty when docker-container is not selected', () => {
		const data = getCapabilityTemplateData('circleci', {
			capabilities: ['circleci'],
			configuration: {},
			projectName: 'plain-app'
		});
		expect(data.deployJobDefinition).toBe('');
		expect(data.deployWorkflowJob).toBe('');
	});
});
