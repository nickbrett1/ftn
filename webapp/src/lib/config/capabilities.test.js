/**
 * @fileoverview Tests for capability definitions configuration
 */

import { describe, it, expect } from 'vitest';
import {
	capabilities,
	getCapabilityById,
	getCapabilitiesByCategory,
	validateCapabilityDependencies,
	getRequiredAuthServices
} from './capabilities.js';

describe('Capabilities Config', () => {
	describe('getCapabilityById', () => {
		it('should return capability for valid ID', () => {
			const capability = getCapabilityById('devcontainer-node');
			expect(capability).toBeDefined();
			expect(capability.id).toBe('devcontainer-node');
		});

		it('should return undefined for invalid ID', () => {
			const capability = getCapabilityById('nonexistent');
			expect(capability).toBeUndefined();
		});
	});

	describe('getCapabilitiesByCategory', () => {
		it('should return capabilities in specified category', () => {
			const devcontainer = getCapabilitiesByCategory('devcontainer');
			expect(devcontainer.length).toBeGreaterThan(0);
			expect(devcontainer.every((cap) => cap.category === 'devcontainer')).toBe(true);
		});

		it('should return empty array for empty category', () => {
			const empty = getCapabilitiesByCategory('nonexistent');
			expect(empty).toEqual([]);
		});
	});

	describe('validateCapabilityDependencies', () => {
		it('should validate selection with no dependencies', () => {
			const result = validateCapabilityDependencies(['circleci']);
			expect(result.valid).toBe(true);
			expect(result.missing).toEqual([]);
			expect(result.conflicts).toEqual([]);
		});

		it('should detect missing dependencies', () => {
			// sonarlint requires sonarcloud and devcontainer-java
			const result = validateCapabilityDependencies(['sonarlint']);
			expect(result.valid).toBe(false);
			expect(result.missing).toHaveLength(2);
			expect(result.missing[0].capability).toBe('sonarlint');
			// Check that both dependencies are present (order may vary)
			const dependencyIds = result.missing.map((m) => m.dependency);
			expect(dependencyIds).toContain('sonarcloud');
			expect(dependencyIds).toContain('devcontainer-java');
		});

		it('should return valid when dependencies are satisfied', () => {
			// sonarlint requires sonarcloud and devcontainer-java
			const result = validateCapabilityDependencies([
				'sonarlint',
				'sonarcloud',
				'devcontainer-java',
				'docker'
			]);
			expect(result.valid).toBe(true);
			expect(result.missing).toEqual([]);
		});
	});

	describe('getRequiredAuthServices', () => {
		it('should extract unique auth services', () => {
			const services = getRequiredAuthServices(['circleci', 'doppler', 'sonarcloud']);
			expect(services).toContain('circleci');
			expect(services).toContain('doppler');
			expect(services).toContain('sonarcloud');
		});

		it('should deduplicate auth services', () => {
			const services = getRequiredAuthServices(['circleci', 'circleci']);
			expect(services).toEqual(['circleci']);
		});

		it('should return empty array when no auth required', () => {
			const services = getRequiredAuthServices(['devcontainer-node', 'playwright']);
			expect(services).toEqual([]);
		});
	});

	describe('Capability Definitions', () => {
		it('should have valid capability structure', () => {
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

		it('should have dependencies as arrays', () => {
			for (const capability of capabilities) {
				expect(Array.isArray(capability.dependencies)).toBe(true);
				expect(Array.isArray(capability.conflicts)).toBe(true);
				expect(Array.isArray(capability.requiresAuth)).toBe(true);
			}
		});

		it('should have unique IDs', () => {
			const ids = capabilities.map((cap) => cap.id);
			const uniqueIds = new Set(ids);
			expect(ids.length).toBe(uniqueIds.size);
		});

		it('should have valid configuration schemas', () => {
			for (const capability of capabilities) {
				expect(capability.configurationSchema).toBeDefined();
				expect(capability.configurationSchema).toHaveProperty('type');
				expect(capability.configurationSchema.type).toBe('object');
			}
		});

		it('should have valid category values', () => {
			const validCategories = [
				'devcontainer',
				'ci-cd',
				'code-quality',
				'secrets',
				'deployment',
				'monitoring',
				'project-structure',
				'internal'
			];
			for (const capability of capabilities) {
				expect(validCategories).toContain(capability.category);
			}
		});

		it('should have valid dependencies and conflicts', () => {
			const ids = new Set(capabilities.map((c) => c.id));
			for (const capability of capabilities) {
				for (const dep of capability.dependencies) {
					expect(ids.has(dep)).toBe(true);
				}
				for (const conflict of capability.conflicts) {
					expect(ids.has(conflict)).toBe(true);
				}
			}
		});

		it('should have valid auth service requirements', () => {
			const validServices = ['circleci', 'doppler', 'sonarcloud', 'cloudflare'];
			for (const capability of capabilities) {
				for (const service of capability.requiresAuth) {
					expect(validServices).toContain(service);
				}
			}
		});
	});
});
