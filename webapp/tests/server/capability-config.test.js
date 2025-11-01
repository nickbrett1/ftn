import { describe, it, expect } from 'vitest';

import { CapabilityConfigurationService } from '../../src/lib/server/capability-config.js';

describe('CapabilityConfigurationService', () => {
	const service = new CapabilityConfigurationService();

	it('returns all capabilities and categories', () => {
		const all = service.getAllCapabilities();
		const testing = service.getCapabilitiesByCategory('testing');

		expect(all.sveltekit).toBeDefined();
		expect(Object.keys(testing)).toEqual(['testing', 'playwright']);
	});

	it('retrieves individual capabilities', () => {
		expect(service.getCapability('circleci')).toMatchObject({ id: 'circleci' });
		expect(service.getCapability('does-not-exist')).toBeNull();
	});

	it('validates capability selections with dependency resolution', () => {
		const result = service.validateCapabilitySelection(['sonarlint']);

		expect(result.isValid).toBe(true);
		expect(result.resolvedCapabilities).toContain('java');
		expect(result.missingDependencies).toEqual([
			{
				capability: 'SonarLint',
				dependency: 'Java'
			}
		]);
		expect(result.warnings).toContain('Some dependencies will be automatically added');
	});

	it('reports unknown capabilities as errors', () => {
		const result = service.validateCapabilitySelection(['unknown-cap']);
		expect(result.isValid).toBe(false);
		expect(result.errors).toContain('Unknown capability: unknown-cap');
	});

	it('filters capabilities requiring authentication', () => {
		const requiringAuth = service.getCapabilitiesRequiringAuth([
			'circleci',
			'doppler',
			'sveltekit'
		]);

		expect(requiringAuth).toEqual(['circleci', 'doppler']);
	});

	it('returns unique auth service requirements', () => {
		const services = service.getRequiredAuthServices([
			'circleci',
			'doppler',
			'sonarcloud',
			'doppler' // duplicate should not affect output
		]);

		expect(services.sort()).toEqual(['circleci', 'doppler', 'sonarcloud']);
	});

	it('exposes configuration schema and validates configuration', () => {
		expect(service.getCapabilityConfigurationSchema('circleci')).toMatchObject({ cache: true });
		expect(service.getCapabilityConfigurationSchema('missing')).toBeNull();

		const validation = service.validateCapabilityConfiguration('circleci', {
			cache: true,
			unknownOption: true
		});
		expect(validation.isValid).toBe(true);
		expect(validation.warnings).toContain('Unknown configuration option: unknownOption');

		const invalid = service.validateCapabilityConfiguration('missing', {});
		expect(invalid.isValid).toBe(false);
		expect(invalid.errors).toContain('Unknown capability: missing');
	});
});
