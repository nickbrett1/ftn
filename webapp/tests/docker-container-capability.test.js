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
		// 1.1/4.3: full source copy BEFORE build; lockfile-aware install —
		// strict `npm ci` when a package-lock.json exists, `npm install`
		// fallback otherwise (genproj emits no lockfile, so a hard `npm ci`
		// would break every fresh-clone build).
		expect(data.dockerBuildCommands).toContain('COPY . .');
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
		// 4.1: multi-arch buildx push with provenance disabled.
		expect(data.deployJobDefinition).toContain('docker buildx create --use');
		expect(data.deployJobDefinition).toContain('--platform linux/amd64,linux/arm64');
		expect(data.deployJobDefinition).toContain('--provenance=false');
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
