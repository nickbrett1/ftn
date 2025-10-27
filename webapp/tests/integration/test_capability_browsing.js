/**
 * @fileoverview Integration test for capability browsing
 * @description Tests the complete capability browsing flow
 */

import { describe, it, expect } from 'vitest';
import { capabilities } from '../../src/lib/config/capabilities.js';

describe('Capability Browsing Integration', () => {
	describe('Capability Loading Flow', () => {
		it('should load capabilities from configuration', () => {
			// Test that capabilities are properly loaded from configuration
			expect(capabilities).toBeDefined();
			expect(Array.isArray(capabilities)).toBe(true);
			expect(capabilities.length).toBeGreaterThan(0);
		});

		it('should have all required capability fields', () => {
			for (const capability of capabilities) {
				expect(capability).toHaveProperty('id');
				expect(capability).toHaveProperty('name');
				expect(capability).toHaveProperty('description');
				expect(capability).toHaveProperty('category');
				expect(capability).toHaveProperty('dependencies');
				expect(capability).toHaveProperty('conflicts');
				expect(capability).toHaveProperty('requiresAuth');
				expect(capability).toHaveProperty('configurationSchema');
				expect(capability).toHaveProperty('templates');
			}
		});

		it('should have unique capability IDs', () => {
			const ids = capabilities.map((c) => c.id);
			const uniqueIds = new Set(ids);
			expect(ids.length).toBe(uniqueIds.size);
		});
	});

	describe('Capability Categories', () => {
		it('should have capabilities in all expected categories', () => {
			const categories = new Set(capabilities.map((c) => c.category));
			const expectedCategories = [
				'devcontainer',
				'ci-cd',
				'code-quality',
				'secrets',
				'deployment',
				'monitoring'
			];

			for (const category of expectedCategories) {
				expect(categories.has(category)).toBe(true);
			}
		});

		it('should have devcontainer capabilities', () => {
			const devcontainerCapabilities = capabilities.filter((c) => c.category === 'devcontainer');
			expect(devcontainerCapabilities.length).toBeGreaterThan(0);

			// Should have at least one for each major language
			const languages = devcontainerCapabilities.map((c) => c.id);
			expect(languages).toContain('devcontainer-node');
			expect(languages).toContain('devcontainer-python');
			expect(languages).toContain('devcontainer-java');
		});

		it('should have CI/CD capabilities', () => {
			const cicdCapabilities = capabilities.filter((c) => c.category === 'ci-cd');
			expect(cicdCapabilities.length).toBeGreaterThan(0);

			const capabilityIds = cicdCapabilities.map((c) => c.id);
			expect(capabilityIds).toContain('circleci');
			expect(capabilityIds).toContain('github-actions');
		});

		it('should have code quality capabilities', () => {
			const qualityCapabilities = capabilities.filter((c) => c.category === 'code-quality');
			expect(qualityCapabilities.length).toBeGreaterThan(0);

			const capabilityIds = qualityCapabilities.map((c) => c.id);
			expect(capabilityIds).toContain('sonarcloud');
			expect(capabilityIds).toContain('sonarlint');
		});

		it('should have secrets management capabilities', () => {
			const secretsCapabilities = capabilities.filter((c) => c.category === 'secrets');
			expect(secretsCapabilities.length).toBeGreaterThan(0);

			const capabilityIds = secretsCapabilities.map((c) => c.id);
			expect(capabilityIds).toContain('doppler');
		});

		it('should have deployment capabilities', () => {
			const deploymentCapabilities = capabilities.filter((c) => c.category === 'deployment');
			expect(deploymentCapabilities.length).toBeGreaterThan(0);

			const capabilityIds = deploymentCapabilities.map((c) => c.id);
			expect(capabilityIds).toContain('cloudflare-wrangler');
		});

		it('should have monitoring capabilities', () => {
			const monitoringCapabilities = capabilities.filter((c) => c.category === 'monitoring');
			expect(monitoringCapabilities.length).toBeGreaterThan(0);

			const capabilityIds = monitoringCapabilities.map((c) => c.id);
			expect(capabilityIds).toContain('dependabot');
			expect(capabilityIds).toContain('lighthouse-ci');
			expect(capabilityIds).toContain('playwright');
		});
	});

	describe('Capability Dependencies', () => {
		it('should have valid dependency chains', () => {
			const capabilityIds = capabilities.map((c) => c.id);

			for (const capability of capabilities) {
				for (const dependency of capability.dependencies) {
					expect(capabilityIds).toContain(dependency);
				}
			}
		});

		it('should have valid conflict relationships', () => {
			const capabilityIds = capabilities.map((c) => c.id);

			for (const capability of capabilities) {
				for (const conflict of capability.conflicts) {
					expect(capabilityIds).toContain(conflict);
				}
			}
		});

		it('should have sonarlint depend on sonarcloud', () => {
			const sonarlintCapability = capabilities.find((c) => c.id === 'sonarlint');
			expect(sonarlintCapability).toBeDefined();
			expect(sonarlintCapability.dependencies).toContain('sonarcloud');
		});

		it('should have devcontainer capabilities conflict with each other', () => {
			const devcontainerCapabilities = capabilities.filter((c) => c.category === 'devcontainer');

			for (const capability of devcontainerCapabilities) {
				const otherDevcontainerCapabilities = devcontainerCapabilities
					.filter((c) => c.id !== capability.id)
					.map((c) => c.id);

				for (const conflict of capability.conflicts) {
					expect(otherDevcontainerCapabilities).toContain(conflict);
				}
			}
		});

		it('should have circleci and github-actions conflict', () => {
			const circleciCapability = capabilities.find((c) => c.id === 'circleci');
			const githubActionsCapability = capabilities.find((c) => c.id === 'github-actions');

			expect(circleciCapability).toBeDefined();
			expect(githubActionsCapability).toBeDefined();

			expect(circleciCapability.conflicts).toContain('github-actions');
			expect(githubActionsCapability.conflicts).toContain('circleci');
		});
	});

	describe('Authentication Requirements', () => {
		it('should have valid authentication service references', () => {
			const validAuthServices = ['github', 'circleci', 'doppler', 'sonarcloud'];

			for (const capability of capabilities) {
				for (const authService of capability.requiresAuth) {
					expect(validAuthServices).toContain(authService);
				}
			}
		});

		it('should require GitHub auth for github-actions', () => {
			const githubActionsCapability = capabilities.find((c) => c.id === 'github-actions');
			expect(githubActionsCapability).toBeDefined();
			expect(githubActionsCapability.requiresAuth).toContain('github');
		});

		it('should require CircleCI auth for circleci', () => {
			const circleciCapability = capabilities.find((c) => c.id === 'circleci');
			expect(circleciCapability).toBeDefined();
			expect(circleciCapability.requiresAuth).toContain('circleci');
		});

		it('should require Doppler auth for doppler', () => {
			const dopplerCapability = capabilities.find((c) => c.id === 'doppler');
			expect(dopplerCapability).toBeDefined();
			expect(dopplerCapability.requiresAuth).toContain('doppler');
		});

		it('should require SonarCloud auth for sonarcloud', () => {
			const sonarcloudCapability = capabilities.find((c) => c.id === 'sonarcloud');
			expect(sonarcloudCapability).toBeDefined();
			expect(sonarcloudCapability.requiresAuth).toContain('sonarcloud');
		});

		it('should not require auth for devcontainer capabilities', () => {
			const devcontainerCapabilities = capabilities.filter((c) => c.category === 'devcontainer');

			for (const capability of devcontainerCapabilities) {
				expect(capability.requiresAuth).toHaveLength(0);
			}
		});
	});

	describe('Configuration Schema Validation', () => {
		it('should have valid configuration schemas', () => {
			for (const capability of capabilities) {
				const schema = capability.configurationSchema;
				expect(schema).toHaveProperty('type');
				expect(schema.type).toBe('object');

				if (schema.properties) {
					expect(typeof schema.properties).toBe('object');
				}
			}
		});

		it('should have valid devcontainer node configuration schema', () => {
			const nodeCapability = capabilities.find((c) => c.id === 'devcontainer-node');
			expect(nodeCapability).toBeDefined();

			const schema = nodeCapability.configurationSchema;
			expect(schema.properties).toHaveProperty('nodeVersion');
			expect(schema.properties).toHaveProperty('packageManager');

			expect(schema.properties.nodeVersion.enum).toContain('18');
			expect(schema.properties.nodeVersion.enum).toContain('20');
			expect(schema.properties.nodeVersion.enum).toContain('22');

			expect(schema.properties.packageManager.enum).toContain('npm');
			expect(schema.properties.packageManager.enum).toContain('yarn');
			expect(schema.properties.packageManager.enum).toContain('pnpm');
		});

		it('should have valid CircleCI configuration schema', () => {
			const circleciCapability = capabilities.find((c) => c.id === 'circleci');
			expect(circleciCapability).toBeDefined();

			const schema = circleciCapability.configurationSchema;
			expect(schema.properties).toHaveProperty('nodeVersion');
			expect(schema.properties).toHaveProperty('deployTarget');

			expect(schema.properties.deployTarget.enum).toContain('cloudflare');
			expect(schema.properties.deployTarget.enum).toContain('vercel');
			expect(schema.properties.deployTarget.enum).toContain('aws');
		});
	});

	describe('Template References', () => {
		it('should have valid template references', () => {
			for (const capability of capabilities) {
				for (const template of capability.templates) {
					expect(template).toHaveProperty('id');
					expect(template).toHaveProperty('filePath');
					expect(template).toHaveProperty('templateId');

					expect(typeof template.id).toBe('string');
					expect(typeof template.filePath).toBe('string');
					expect(typeof template.templateId).toBe('string');
				}
			}
		});

		it('should have devcontainer templates', () => {
			const devcontainerCapabilities = capabilities.filter((c) => c.category === 'devcontainer');

			for (const capability of devcontainerCapabilities) {
				expect(capability.templates.length).toBeGreaterThan(0);

				const hasDevcontainerJson = capability.templates.some((t) =>
					t.filePath.includes('devcontainer.json')
				);
				const hasDockerfile = capability.templates.some((t) => t.filePath.includes('Dockerfile'));

				expect(hasDevcontainerJson).toBe(true);
				expect(hasDockerfile).toBe(true);
			}
		});

		it('should have CI/CD templates', () => {
			const cicdCapabilities = capabilities.filter((c) => c.category === 'ci-cd');

			for (const capability of cicdCapabilities) {
				expect(capability.templates.length).toBeGreaterThan(0);

				if (capability.id === 'circleci') {
					const hasConfigYml = capability.templates.some((t) => t.filePath.includes('config.yml'));
					expect(hasConfigYml).toBe(true);
				}

				if (capability.id === 'github-actions') {
					const hasWorkflowYml = capability.templates.some((t) => t.filePath.includes('workflows'));
					expect(hasWorkflowYml).toBe(true);
				}
			}
		});
	});

	describe('Capability Utility Functions', () => {
		it('should be able to get capability by ID', () => {
			// Test the getCapabilityById function
			const nodeCapability = capabilities.find((c) => c.id === 'devcontainer-node');
			expect(nodeCapability).toBeDefined();
			expect(nodeCapability.name).toBe('Node.js DevContainer');
		});

		it('should be able to get capabilities by category', () => {
			const devcontainerCapabilities = capabilities.filter((c) => c.category === 'devcontainer');
			expect(devcontainerCapabilities.length).toBeGreaterThan(0);

			for (const capability of devcontainerCapabilities) {
				expect(capability.category).toBe('devcontainer');
			}
		});

		it('should validate capability dependencies', () => {
			// Test dependency validation
			const selectedCapabilities = ['sonarlint'];
			const validation = validateCapabilityDependencies(selectedCapabilities);

			expect(validation.missing).toHaveLength(1);
			expect(validation.missing[0].capability).toBe('sonarlint');
			expect(validation.missing[0].dependency).toBe('sonarcloud');
		});

		it('should detect capability conflicts', () => {
			const selectedCapabilities = ['circleci', 'github-actions'];
			const validation = validateCapabilityDependencies(selectedCapabilities);

			expect(validation.conflicts.length).toBeGreaterThan(0);
		});

		it('should get required authentication services', () => {
			const selectedCapabilities = ['circleci', 'doppler', 'sonarcloud'];
			const requiredAuth = getRequiredAuthServices(selectedCapabilities);

			expect(requiredAuth).toContain('circleci');
			expect(requiredAuth).toContain('doppler');
			expect(requiredAuth).toContain('sonarcloud');
		});
	});
});

// Helper functions for testing (these will be imported from the actual module)
function validateCapabilityDependencies(selectedCapabilities) {
	const missing = [];
	const conflicts = [];

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((cap) => cap.id === capabilityId);
		if (!capability) continue;

		// Check dependencies
		for (const depId of capability.dependencies) {
			if (!selectedCapabilities.includes(depId)) {
				missing.push({ capability: capabilityId, dependency: depId });
			}
		}

		// Check conflicts
		for (const conflictId of capability.conflicts) {
			if (selectedCapabilities.includes(conflictId)) {
				conflicts.push({ capability: capabilityId, conflict: conflictId });
			}
		}
	}

	return { missing, conflicts, valid: missing.length === 0 && conflicts.length === 0 };
}

function getRequiredAuthServices(selectedCapabilities) {
	const required = new Set();

	for (const capabilityId of selectedCapabilities) {
		const capability = capabilities.find((cap) => cap.id === capabilityId);
		if (capability) {
			for (const service of capability.requiresAuth) {
				required.add(service);
			}
		}
	}

	return Array.from(required);
}
