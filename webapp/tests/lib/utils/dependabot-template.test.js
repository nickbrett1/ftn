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
	});
});
