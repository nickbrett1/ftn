import { describe, it, expect, afterEach, vi } from 'vitest';

import * as capabilityResolver from '$lib/utils/capability-resolver.js';
import {
	resolveDependencies,
	validateCapabilitySelection,
	getCapabilitiesRequiringAuth,
	getRequiredAuthServices,
	sortCapabilitiesByDependency,
	getCapabilityExecutionOrder,
	canAddCapability,
	getCapabilitySelectionSummary
} from '$lib/utils/capability-resolver.js';
import { CAPABILITIES } from '$lib/utils/capabilities.js';

const addedCapabilityIds = new Set();

function addCapability(id, definition) {
	CAPABILITIES[id] = definition;
	addedCapabilityIds.add(id);
}

afterEach(() => {
	for (const id of addedCapabilityIds) {
		delete CAPABILITIES[id];
	}
	addedCapabilityIds.clear();
	vi.restoreAllMocks();
});

describe('capability resolver', () => {
	describe('resolveDependencies', () => {
		it('adds missing dependencies and tracks them', () => {
			const result = resolveDependencies(['sonarlint']);
			expect(result.resolvedCapabilities).toEqual(expect.arrayContaining(['sonarlint', 'java']));
			expect(result.addedDependencies).toContain('java');
			expect(result.conflicts).toEqual([]);
			expect(result.isValid).toBe(true);
		});

		it('records conflicts when present', () => {
			addCapability('conflict-cap', {
				id: 'conflict-cap',
				name: 'Conflict Cap',
				description: '',
				category: 'testing',
				dependencies: [],
				conflicts: ['typescript'],
				requiresAuth: false
			});

			const result = resolveDependencies(['typescript', 'conflict-cap']);
			expect(result.conflicts).toContain('typescript');
			expect(result.isValid).toBe(false);
		});
	});

	describe('validateCapabilitySelection', () => {
		it('returns errors for unknown capabilities', () => {
			const result = validateCapabilitySelection(['unknown-cap']);
			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('Unknown capability: unknown-cap');
		});

		it('includes warnings for missing dependencies when resolver omits them', () => {
			addCapability('requires-warning', {
				id: 'requires-warning',
				name: 'Requires Warning',
				description: '',
				category: 'testing',
				dependencies: ['typescript'],
				conflicts: [],
				requiresAuth: false
			});

			vi.spyOn(capabilityResolver, 'resolveDependencies').mockReturnValue({
				resolvedCapabilities: ['requires-warning'],
				addedDependencies: [],
				conflicts: [],
				isValid: true
			});

			const result = validateCapabilitySelection(['requires-warning']);
			expect(result.warnings).toContain('Missing dependency: Requires Warning requires TypeScript');
		});

		it('adds warnings for auth requirements', () => {
			const result = validateCapabilitySelection(['circleci']);
			expect(result.warnings).toContain('Authentication required for: circleci');
		});
	});

	it('identifies capabilities requiring authentication', () => {
		expect(getCapabilitiesRequiringAuth(['circleci', 'sonarlint'])).toEqual(['circleci']);
	});

	it('aggregates auth services without duplicates', () => {
		expect(getRequiredAuthServices(['circleci', 'doppler', 'circleci']).sort()).toEqual([
			'circleci',
			'doppler'
		]);
	});

	it('sorts capabilities with dependencies first', () => {
		const order = sortCapabilitiesByDependency(['sonarlint', 'java', 'typescript']);
		expect(order.indexOf('java')).toBeLessThan(order.indexOf('sonarlint'));
	});

	it('computes execution order including dependencies', () => {
		const order = getCapabilityExecutionOrder(['sonarlint']);
		expect(order.indexOf('java')).toBeGreaterThan(-1);
		expect(order.indexOf('java')).toBeLessThan(order.indexOf('sonarlint'));
	});

	describe('canAddCapability', () => {
		it('rejects unknown capabilities', () => {
			expect(canAddCapability('missing-cap', [])).toEqual({ canAdd: false, reason: 'Unknown capability' });
		});

		it('rejects already selected capability', () => {
			expect(canAddCapability('typescript', ['typescript'])).toEqual({
				canAdd: false,
				reason: 'Already selected'
			});
		});

		it('rejects conflicting capability', () => {
			addCapability('conflict-cap', {
				id: 'conflict-cap',
				name: 'Conflict Cap',
				description: '',
				category: 'testing',
				dependencies: [],
				conflicts: ['typescript'],
				requiresAuth: false
			});

			expect(canAddCapability('conflict-cap', ['typescript'])).toEqual({
				canAdd: false,
				reason: 'Conflicts with TypeScript'
			});
		});

		it('allows capability when no conflicts', () => {
			expect(canAddCapability('typescript', ['sveltekit'])).toEqual({ canAdd: true, reason: null });
		});
	});

	it('summarizes capability selection', () => {
		const summary = getCapabilitySelectionSummary(['sonarlint', 'circleci']);
		expect(summary.totalSelected).toBe(2);
		expect(summary.totalResolved).toBeGreaterThanOrEqual(2);
		expect(summary.addedDependencies).toBeGreaterThanOrEqual(1);
		expect(summary.authServices).toBeGreaterThanOrEqual(1);
		expect(summary.executionOrder).toEqual(expect.arrayContaining(['sonarlint', 'java']));
	});
});
