import { describe, it, expect } from 'vitest';
import {
	getCapabilityTemplateData,
	applyDefaults
} from '../../../src/lib/utils/capability-template-utils';

describe('capability-template-utils', () => {
	describe('getCodingAgentsTemplateData', () => {
		it('should generate config for sonarcloud and circleci', () => {
			const context = {
				capabilities: ['coding-agents', 'sonarcloud', 'circleci']
			};
			const data = getCapabilityTemplateData('coding-agents', context);
			expect(data.sonarQubeMcpConfig).toContain('sonarqube-mcp-server');
			expect(data.circleCiMcpConfig).toContain('@modelcontextprotocol/server-circleci');
		});

		it('should generate empty config if no dependencies', () => {
			const context = {
				capabilities: ['coding-agents']
			};
			const data = getCapabilityTemplateData('coding-agents', context);
			expect(data.sonarQubeMcpConfig).toBe('');
			expect(data.circleCiMcpConfig).toBe('');
		});
	});

	describe('getSonarCloudTemplateData', () => {
		it('should return correct settings for Python', () => {
			const context = {
				capabilities: ['sonarcloud'],
				configuration: {
					sonarcloud: { language: 'Python' }
				}
			};
			const data = getCapabilityTemplateData('sonarcloud', context);
			expect(data.sonarLanguageSettings).toBe('sonar.python.coverage.reportPaths=coverage.xml');
		});

		it('should return correct settings for Java', () => {
			const context = {
				capabilities: ['sonarcloud'],
				configuration: {
					sonarcloud: { language: 'Java' }
				}
			};
			const data = getCapabilityTemplateData('sonarcloud', context);
			expect(data.sonarLanguageSettings).toBe('sonar.java.binaries=.');
		});

		it('should return correct settings for JavaScript', () => {
			const context = {
				capabilities: ['sonarcloud'],
				configuration: {
					sonarcloud: { language: 'JavaScript' }
				}
			};
			const data = getCapabilityTemplateData('sonarcloud', context);
			expect(data.sonarLanguageSettings).toBe(
				'sonar.javascript.lcov.reportPaths=coverage/lcov.info'
			);
		});
	});

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

		it('should configure gitguardian orb and job', () => {
			const context = {
				capabilities: ['circleci', 'gitguardian'],
				configuration: { circleci: { context: { enabled: true, name: 'ctx' } } }
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.orbs).toContain('ggshield: gitguardian/ggshield@1');
			expect(data.additionalWorkflowJobs).toContain('ggshield/scan');
			expect(data.additionalWorkflowJobs).toContain('context: ctx');
		});

		it('should configure wrangler setup with doppler', () => {
			const context = {
				capabilities: ['circleci', 'cloudflare-wrangler', 'doppler']
			};
			const data = getCapabilityTemplateData('circleci', context);
			expect(data.preBuildSteps).toContain('./scripts/setup-wrangler-config.sh');
		});
	});

	describe('getDependabotTemplateData', () => {
		it('should include npm ecosystem for node devcontainer', () => {
			const context = {
				capabilities: ['dependabot', 'devcontainer-node']
			};
			const data = getCapabilityTemplateData('dependabot', context);
			expect(data.dependabotUpdates).toContain('package-ecosystem: "npm"');
		});

		it('should include pip ecosystem for python devcontainer', () => {
			const context = {
				capabilities: ['dependabot', 'devcontainer-python-3']
			};
			const data = getCapabilityTemplateData('dependabot', context);
			expect(data.dependabotUpdates).toContain('package-ecosystem: "pip"');
		});

		it('should include maven ecosystem for java devcontainer', () => {
			const context = {
				capabilities: ['dependabot', 'devcontainer-java-17']
			};
			const data = getCapabilityTemplateData('dependabot', context);
			expect(data.dependabotUpdates).toContain('package-ecosystem: "maven"');
		});
	});

	describe('applyDefaults', () => {
		it('should apply defaults from schema', () => {
			const capability = {
				configurationSchema: {
					properties: {
						enabled: { default: true },
						name: { default: 'default-name' },
						other: { type: 'string' }
					}
				}
			};
			const config = { other: 'custom' };
			const result = applyDefaults(capability, config);
			expect(result.enabled).toBe(true);
			expect(result.name).toBe('default-name');
			expect(result.other).toBe('custom');
		});

		it('should not overwrite existing values', () => {
			const capability = {
				configurationSchema: {
					properties: {
						enabled: { default: true }
					}
				}
			};
			const config = { enabled: false };
			const result = applyDefaults(capability, config);
			expect(result.enabled).toBe(false);
		});

		it('should handle missing properties', () => {
			const capability = { configurationSchema: {} };
			const config = { a: 1 };
			expect(applyDefaults(capability, config)).toEqual(config);
		});
	});
});
