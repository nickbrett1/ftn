import { describe, it, expect } from 'vitest';
import { getCapabilityTemplateData } from '$lib/utils/capability-template-utils.js';

describe('capability-template-utils', () => {
	describe('dependabot configuration', () => {
		it('should include github-actions by default', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot']
			});
			expect(data.dependabotUpdates).toContain('package-ecosystem: "github-actions"');
			expect(data.dependabotUpdates).toContain('interval: "weekly"');
		});

		it('should include npm when devcontainer-node is selected', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-node']
			});
			expect(data.dependabotUpdates).toContain('package-ecosystem: "github-actions"');
			expect(data.dependabotUpdates).toContain('package-ecosystem: "npm"');
		});

		it('should include pip when devcontainer-python is selected', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-python']
			});
			expect(data.dependabotUpdates).toContain('package-ecosystem: "github-actions"');
			expect(data.dependabotUpdates).toContain('package-ecosystem: "pip"');
		});

		it('should include maven when devcontainer-java is selected', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-java']
			});
			expect(data.dependabotUpdates).toContain('package-ecosystem: "github-actions"');
			expect(data.dependabotUpdates).toContain('package-ecosystem: "maven"');
		});

		it('should include cargo when devcontainer-rust is selected', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-rust']
			});
			expect(data.dependabotUpdates).toContain('package-ecosystem: "github-actions"');
			expect(data.dependabotUpdates).toContain('package-ecosystem: "cargo"');
		});

		it('should include multiple ecosystems when multiple containers are selected', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-node', 'devcontainer-python']
			});
			expect(data.dependabotUpdates).toContain('package-ecosystem: "github-actions"');
			expect(data.dependabotUpdates).toContain('package-ecosystem: "npm"');
			expect(data.dependabotUpdates).toContain('package-ecosystem: "pip"');
		});

		it('should use configured update schedule', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot'],
				configuration: {
					dependabot: {
						updateSchedule: 'daily'
					}
				}
			});
			expect(data.dependabotUpdates).toContain('interval: "daily"');
		});

		it('should group minor/patch updates by default', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot']
			});
			expect(data.dependabotUpdates).toContain('groups:');
			expect(data.dependabotUpdates).toContain('minor-and-patch:');
			expect(data.dependabotUpdates).toContain('- "minor"');
			expect(data.dependabotUpdates).toContain('- "patch"');
		});

		it('should split npm into development and production groups', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-node']
			});
			expect(data.dependabotUpdates).toContain('dev-minor-and-patch:');
			expect(data.dependabotUpdates).toContain('dependency-type: "development"');
			expect(data.dependabotUpdates).toContain('prod-minor-and-patch:');
			expect(data.dependabotUpdates).toContain('dependency-type: "production"');
		});

		it('should never group major updates', () => {
			// Majors stay as individual PRs: a grouped PR is harder to attribute
			// when it goes red, and that matters most for a major bump.
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-node', 'devcontainer-python']
			});
			expect(data.dependabotUpdates).not.toContain('"major"');
		});

		it('should omit groups when groupUpdates is false', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-node'],
				configuration: {
					dependabot: {
						groupUpdates: false
					}
				}
			});
			expect(data.dependabotUpdates).not.toContain('groups:');
			expect(data.dependabotUpdates).toContain('package-ecosystem: "npm"');
		});

		it('should emit a group block with parseable indentation', () => {
			const data = getCapabilityTemplateData('dependabot', {
				capabilities: ['dependabot', 'devcontainer-node']
			});
			expect(data.dependabotUpdates).toContain(
				'    groups:\n' +
					'      dev-minor-and-patch:\n' +
					'        patterns:\n' +
					'          - "*"\n' +
					'        dependency-type: "development"\n' +
					'        update-types:\n' +
					'          - "minor"\n' +
					'          - "patch"'
			);
		});
	});
});
