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
			watchtower: { default: true },
			homepage: { default: true }
		});
		expect(capability.templates.map((t) => t.templateId)).toEqual([
			'dockerfile',
			'dockerignore',
			'docker-compose',
			'deploy-readme',
			'homepage-services'
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
		expect(data.networkMode).toBe('bridge');
		expect(data.exposePort).toBe('3000');
		expect(data.networkModeLine).toBe('');
		expect(data.portsConfig).toContain('3000:3000');
		expect(data.composeLabels).toContain('com.centurylinklabs.watchtower.enable=true');
		expect(data.composeLabels).toContain('homepage.widget.type=customapi');
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

	it('uses a python base image for python projects', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-python'],
			configuration: {},
			projectName: 'py-app'
		});
		expect(data.dockerBaseImage).toBe('python:3.12-slim');
		expect(data.dockerSetupCommands).toContain('pip install');
	});

	it('uses a node base image for node/svelte projects', () => {
		const data = getCapabilityTemplateData('docker-container', {
			capabilities: ['docker-container', 'devcontainer-node'],
			configuration: {},
			projectName: 'node-app'
		});
		expect(data.dockerBaseImage).toBe('node:22-alpine');
		expect(data.dockerSetupCommands).toContain('npm ci');
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
		expect(data.deployWorkflowJob).toContain('docker-publish');
		expect(data.deployWorkflowJob).toContain('context: common');
	});

	it('uses dockerhub credentials for the dockerhub registry', () => {
		const data = getCapabilityTemplateData('circleci', {
			capabilities: ['circleci', 'docker-container'],
			configuration: {
				'docker-container': { registry: 'dockerhub' },
				circleci: { context: { enabled: false } }
			},
			projectName: 'demo-app'
		});
		expect(data.deployJobDefinition).toContain('docker.io/OWNER/demo-app');
		expect(data.deployJobDefinition).toContain('DOCKERHUB_TOKEN');
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
