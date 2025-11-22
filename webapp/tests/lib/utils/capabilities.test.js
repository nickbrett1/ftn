/**
 * @fileoverview Tests for capability utilities
 */

import { describe, it, expect } from 'vitest';
import {
	CAPABILITIES,
	CAPABILITY_CATEGORIES,
	getAllCapabilities,
	getCapabilitiesByCategory,
	getCapability,
	getAllCategories,
	getCapabilitiesRequiringAuth,
	getRequiredAuthServices,
	searchCapabilitiesByTags
} from '../../../src/lib/utils/capabilities.js';

describe('Capabilities Utils', () => {
	describe('getAllCapabilities', () => {
		it('should return all capabilities', () => {
			const all = getAllCapabilities();
			expect(all).toBe(CAPABILITIES);
			expect(Object.keys(all).length).toBeGreaterThan(0);
		});
	});

	describe('getCapability', () => {
		it('should return capability for valid ID', () => {
			const capability = getCapability('sveltekit');
			expect(capability).toBeDefined();
			expect(capability.id).toBe('sveltekit');
			expect(capability.name).toBe('SvelteKit');
		});

		it('should return null for invalid ID', () => {
			const capability = getCapability('nonexistent');
			expect(capability).toBeNull();
		});
	});

	describe('getCapabilitiesByCategory', () => {
		it('should return capabilities in specified category', () => {
			const framework = getCapabilitiesByCategory('framework');
			expect(Object.keys(framework).length).toBeGreaterThan(0);
			expect(framework.sveltekit).toBeDefined();
		});

		it('should return empty object for empty category', () => {
			const empty = getCapabilitiesByCategory('nonexistent');
			expect(Object.keys(empty).length).toBe(0);
		});
	});

	describe('getAllCategories', () => {
		it('should return all categories', () => {
			const categories = getAllCategories();
			expect(categories).toBe(CAPABILITY_CATEGORIES);
			expect(Object.keys(categories).length).toBeGreaterThan(0);
		});

		it('should include standard categories', () => {
			const categories = getAllCategories();
			expect(categories.framework).toBeDefined();
			expect(categories.testing).toBeDefined();
			expect(categories.cicd).toBeDefined();
		});
	});

	describe('getCapabilitiesRequiringAuth', () => {
		it('should filter capabilities that require auth', () => {
			const capabilities = ['sveltekit', 'circleci', 'sonarcloud', 'tailwindcss'];
			const requiringAuth = getCapabilitiesRequiringAuth(capabilities);
			expect(requiringAuth).toContain('circleci');
			expect(requiringAuth).toContain('sonarcloud');
			expect(requiringAuth).not.toContain('sveltekit');
			expect(requiringAuth).not.toContain('tailwindcss');
		});

		it('should return empty array when no capabilities require auth', () => {
			const capabilities = ['sveltekit', 'tailwindcss', 'playwright'];
			const requiringAuth = getCapabilitiesRequiringAuth(capabilities);
			expect(requiringAuth).toEqual([]);
		});
	});

	describe('getRequiredAuthServices', () => {
		it('should extract unique auth services', () => {
			const capabilities = ['circleci', 'doppler', 'sonarcloud'];
			const services = getRequiredAuthServices(capabilities);
			expect(services).toContain('circleci');
			expect(services).toContain('doppler');
			expect(services).toContain('sonarcloud');
		});

		it('should deduplicate auth services', () => {
			const capabilities = ['circleci', 'circleci'];
			const services = getRequiredAuthServices(capabilities);
			expect(services).toEqual(['circleci']);
		});

		it('should return empty array when no auth required', () => {
			const capabilities = ['sveltekit', 'tailwindcss'];
			const services = getRequiredAuthServices(capabilities);
			expect(services).toEqual([]);
		});
	});

	describe('searchCapabilitiesByTags', () => {
		it('should find capabilities by tags', () => {
			const results = searchCapabilitiesByTags(['framework']);
			expect(Object.keys(results).length).toBeGreaterThan(0);
		});

		it('should find multiple capabilities with same tag', () => {
			const results = searchCapabilitiesByTags(['testing']);
			expect(Object.keys(results).length).toBeGreaterThan(0);
		});

		it('should return empty object for no matches', () => {
			const results = searchCapabilitiesByTags(['nonexistent-tag']);
			expect(Object.keys(results).length).toBe(0);
		});

		it('should find capabilities with multiple tags', () => {
			const results = searchCapabilitiesByTags(['testing', 'framework']);
			expect(Object.keys(results).length).toBeGreaterThan(0);
		});
	});

	describe('Capability Definitions', () => {
		it('should have valid capability structure', () => {
			const capability = getCapability('sveltekit');
			expect(capability).toHaveProperty('id');
			expect(capability).toHaveProperty('name');
			expect(capability).toHaveProperty('description');
			expect(capability).toHaveProperty('category');
			expect(capability).toHaveProperty('dependencies');
			expect(capability).toHaveProperty('conflicts');
			expect(capability).toHaveProperty('configuration');
		});

		it('should have valid categories', () => {
			const categories = getAllCategories();
			for (const [key, category] of Object.entries(categories)) {
				expect(category).toHaveProperty('name');
				expect(category).toHaveProperty('description');
			}
		});

		it('should have dependencies as arrays', () => {
			for (const capability of Object.values(CAPABILITIES)) {
				expect(Array.isArray(capability.dependencies)).toBe(true);
				expect(Array.isArray(capability.conflicts)).toBe(true);
			}
		});

		it('should have configuration objects', () => {
			for (const capability of Object.values(CAPABILITIES)) {
				expect(typeof capability.configuration).toBe('object');
				expect(capability.configuration).not.toBeNull();
			}
		});
	});
});