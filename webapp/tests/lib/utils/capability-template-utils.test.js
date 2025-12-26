import { describe, it, expect } from 'vitest';
import { getCapabilityTemplateData } from '../../../src/lib/utils/capability-template-utils';

describe('capability-template-utils', () => {
	describe('getCircleCiTemplateData', () => {
		it('should include context in build job when enabled with custom name', () => {
			const context = {
				capabilities: ['circleci'],
				configuration: {
					circleci: {
						context: {
							enabled: true,
							name: 'my-custom-context'
						}
					}
				}
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.buildWorkflowJob).toContain('- build:');
			expect(data.buildWorkflowJob).toContain('context: my-custom-context');
		});

		it('should not include context when disabled', () => {
			const context = {
				capabilities: ['circleci'],
				configuration: {
					circleci: {
						context: {
							enabled: false,
							name: 'common'
						}
					}
				}
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.buildWorkflowJob).toBe('      - build');
		});

		it('should use default context "common" when enabled but no name provided', () => {
			const context = {
				capabilities: ['circleci'],
				configuration: {
					circleci: {
						context: {
							enabled: true
						}
					}
				}
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.buildWorkflowJob).toContain('context: common');
		});

		it('should default to enabled and "common" if configuration is missing', () => {
			const context = {
				capabilities: ['circleci'],
				configuration: {}
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.buildWorkflowJob).toContain('context: common');
		});

		it('should add context to lighthouse job if present', () => {
			const context = {
				capabilities: ['circleci', 'lighthouse-ci'],
				configuration: {
					circleci: {
						context: {
							enabled: true,
							name: 'common'
						}
					}
				}
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.lighthouseWorkflowJob).toContain('context: common');
		});

		it('should add context to deploy job if present', () => {
			const context = {
				capabilities: ['circleci', 'cloudflare-wrangler'],
				configuration: {
					circleci: {
						context: {
							enabled: true,
							name: 'prod'
						}
					}
				}
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.deployWorkflowJob).toContain('context: prod');
		});
	});
});
