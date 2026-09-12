/**
 * @fileoverview Tests for the buildkite CI capability: catalog entry,
 * configuration defaults, the deployment constants the provisioning needs, and
 * the template data behind the generated pipeline.
 */

import { describe, it, expect } from 'vitest';
import { capabilities, getCapabilityById } from '$lib/config/capabilities.js';
import { getServiceConfig } from '$lib/config/external-services.js';
import { getCapabilityTemplateData } from '$lib/utils/capability-template-utils.js';

describe('buildkite capability', () => {
	it('is defined with correct metadata', () => {
		const capability = getCapabilityById('buildkite');
		expect(capability).toBeDefined();
		expect(capability.name).toBe('Buildkite Integration');
		expect(capability.category).toBe('ci-cd');
		// No dependencies: v1's generated pipeline does not run `doppler run`,
		// unlike CircleCI's.
		expect(capability.dependencies).toEqual([]);
		expect(capability.templates.map((t) => t.filePath)).toEqual([
			'.buildkite/pipeline.yml',
			'.buildkite/README.md'
		]);
	});

	it('does not conflict with circleci, so a repo can migrate gradually', () => {
		const capability = getCapabilityById('buildkite');
		expect(capability.conflicts).toEqual([]);
		expect(getCapabilityById('circleci').conflicts).toEqual([]);
	});

	it('needs no user authentication — the deployment owns the token', () => {
		const capability = getCapabilityById('buildkite');
		expect(capability.requiresAuth).toEqual([]);
		// The manual "set up project" step is exactly what this avoids.
		expect(capability.externalServices[0].requiresAuth).toBe(false);
		expect(capability.externalServices[0].actions.map((a) => a.type)).toEqual([
			'create',
			'configure'
		]);
	});

	it('appears once in the catalog with a unique id', () => {
		expect(capabilities.filter((c) => c.id === 'buildkite')).toHaveLength(1);
	});

	it('defaults to the fleet queue and provisions the pipeline', () => {
		const schema = getCapabilityById('buildkite').configurationSchema.properties;
		expect(schema.queue.default).toBe('mac-studio-linux');
		expect(schema.provisionPipeline.default).toBe(true);
	});

	it('carries the organisation and cluster the API needs', () => {
		// Deployment-level constants: a pipeline cannot be created without a
		// cluster in this organisation, and organisation/cluster are not
		// per-project preferences.
		const config = getServiceConfig('buildkite');
		expect(config.organization).toBeTruthy();
		expect(config.clusterId).toBeTruthy();
		expect(config.baseUrl).toBe('https://api.buildkite.com/v2');
	});

	it('generates a pipeline that installs once and names the queue', () => {
		const data = getCapabilityTemplateData('buildkite', {
			capabilities: ['buildkite', 'devcontainer-node'],
			configuration: {}
		});
		expect(data.buildkiteQueue).toBe('mac-studio-linux');
		expect(data.buildkiteLanguage).toBe('node');
		expect(data.buildkiteCommands).toContain('npm ci');
		// One install, not one per step.
		expect((data.buildkiteCommands.match(/npm ci/g) || []).length).toBe(1);
	});

	it('resolves the language from the selected devcontainer', () => {
		const python = getCapabilityTemplateData('buildkite', {
			capabilities: ['buildkite', 'devcontainer-python'],
			configuration: {}
		});
		expect(python.buildkiteLanguage).toBe('python');
		expect(python.buildkiteImage).toContain('python:');
	});
});
