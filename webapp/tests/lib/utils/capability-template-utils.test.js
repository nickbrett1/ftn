import { describe, it, expect } from 'vitest';
import {
	getCapabilityTemplateData,
	applyDefaults,
	getGooseMcpConfig,
	assertNoGooseEnvVarReferences,
	resolveDopplerTarget
} from '../../../src/lib/utils/capability-template-utils';

describe('capability-template-utils', () => {
	describe('getCodingAgentsTemplateData', () => {
		it('should generate config for sonarcloud and circleci', () => {
			const context = {
				capabilities: ['coding-agents', 'sonarcloud', 'circleci']
			};
			const data = getCapabilityTemplateData('coding-agents', context);
			expect(data.sonarQubeMcpConfig).toContain('sonarqube-mcp-server');
			expect(data.sonarQubeMcpConfig).toContain('"command": "npx"');
			expect(data.circleCiMcpConfig).toContain('@circleci/mcp-server-circleci');
			expect(data.circleCiMcpConfig).toContain('"command": "npx"');
			expect(data.githubMcpConfig).toContain('@modelcontextprotocol/server-github');
			expect(data.githubMcpConfig).toContain('"command": "npx"');
			expect(data.dopplerMcpConfig).toBe('');
		});

		it('should generate doppler-wrapped configs if doppler is present', () => {
			const context = {
				capabilities: ['coding-agents', 'sonarcloud', 'circleci', 'doppler']
			};
			const data = getCapabilityTemplateData('coding-agents', context);
			expect(data.sonarQubeMcpConfig).toContain('"command": "doppler"');
			expect(data.sonarQubeMcpConfig).toContain('"run"');
			expect(data.circleCiMcpConfig).toContain('"command": "doppler"');
			expect(data.circleCiMcpConfig).toContain('"run"');
			expect(data.githubMcpConfig).toContain('"command": "doppler"');
			expect(data.githubMcpConfig).toContain('"run"');
			expect(data.dopplerMcpConfig).toContain('@dopplerhq/mcp-server');
			expect(data.dopplerMcpConfig).toContain('"command": "sh"');
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

	describe('getGooseMcpConfig', () => {
		// Regression (genproj-goose-env-refs): goose does not expand ${VAR}/$VAR
		// in a stdio extension's env map — the literal text becomes the token and
		// every MCP call 401s. Goose blocks must therefore use the doppler
		// wrapper and must NEVER contain env var references.
		it('should emit doppler-wrapped goose blocks (no env refs) when doppler is present', () => {
			const data = getGooseMcpConfig({
				capabilities: ['sonarcloud', 'circleci', 'doppler', 'xcode-development']
			});
			expect(data.sonarQubeGooseConfig).toContain('cmd: doppler');
			expect(data.sonarQubeGooseConfig).toContain(
				'args: ["run", "--", "npx", "-y", "sonarqube-mcp-server"]'
			);
			expect(data.circleCiGooseConfig).toContain('cmd: doppler');
			expect(data.circleCiGooseConfig).toContain(
				'args: ["run", "--", "npx", "-y", "@circleci/mcp-server-circleci"]'
			);
			// No env map at all in either block.
			expect(data.sonarQubeGooseConfig).not.toMatch(/\benv:\s*$/m);
			expect(data.circleCiGooseConfig).not.toMatch(/\benv:\s*$/m);
			// And no $ anywhere in the emitted YAML.
			expect(data.sonarQubeGooseConfig).not.toContain('$');
			expect(data.circleCiGooseConfig).not.toContain('$');
		});

		it('should never emit env var references in goose blocks (without doppler)', () => {
			// circleci/sonarcloud declare dependencies: ['doppler'] and the
			// dependency resolver always expands them, so this path is normally
			// unreachable — but if it is hit, emit NOTHING rather than a broken
			// ${VAR} env block (the pre-fix anti-pattern → MCP 401).
			const data = getGooseMcpConfig({
				capabilities: ['sonarcloud', 'circleci']
			});
			expect(data.sonarQubeGooseConfig).toBe('');
			expect(data.circleCiGooseConfig).toBe('');
		});

		it('should emit xcode-native block without env refs', () => {
			const data = getGooseMcpConfig({ capabilities: ['xcode-development'] });
			expect(data.xcodeNativeGooseConfig).toContain('xcode-native');
			expect(data.xcodeNativeGooseConfig).toContain('.agents/mcp-sse-proxy.cjs');
			expect(data.xcodeNativeGooseConfig).not.toContain('$');
		});
	});

	describe('assertNoGooseEnvVarReferences', () => {
		it('should throw on braced ${VAR} env refs (the genproj-goose-env-refs regression)', () => {
			const block = `
  circleci:
    type: stdio
    name: circleci
    enabled: true
    cmd: npx
    args: ["-y", "@circleci/mcp-server-circleci"]
    env:
      CIRCLECI_TOKEN: "\${CIRCLECI_TOKEN}"
      CIRCLE_API_TOKEN: "\${CIRCLE_API_TOKEN}"
    timeout: 300`;
			expect(() => assertNoGooseEnvVarReferences(block, 'circleci')).toThrow(/env var reference/);
		});

		it('should throw on unbraced $VAR env refs too', () => {
			const block = `
  sonarqube:
    type: stdio
    name: sonarqube
    enabled: true
    cmd: npx
    args: ["-y", "sonarqube-mcp-server"]
    env:
      SONAR_TOKEN: "$SONAR_TOKEN"
      SONAR_HOST_URL: "$SONAR_HOST_URL"
    timeout: 300`;
			expect(() => assertNoGooseEnvVarReferences(block, 'sonarqube')).toThrow(/env var reference/);
		});

		it('should pass clean doppler-wrapped blocks and empty strings', () => {
			const clean = `
  circleci:
    type: stdio
    name: circleci
    enabled: true
    cmd: doppler
    args: ["run", "--", "npx", "-y", "@circleci/mcp-server-circleci"]
    timeout: 300`;
			expect(() => assertNoGooseEnvVarReferences(clean, 'circleci')).not.toThrow();
			expect(() => assertNoGooseEnvVarReferences('', 'circleci')).not.toThrow();
			expect(() => assertNoGooseEnvVarReferences(undefined, 'circleci')).not.toThrow();
		});
	});

	describe('getSonarCloudTemplateData', () => {
		it('should return correct settings for Python without devcontainer', () => {
			const context = {
				capabilities: ['sonarcloud'],
				configuration: {
					sonarcloud: { language: 'Python' }
				}
			};
			const data = getCapabilityTemplateData('sonarcloud', context);
			expect(data.sonarLanguageSettings).toBe('sonar.python.coverage.reportPaths=coverage.xml');
		});

		it('should return correct settings for Python with devcontainer', () => {
			const context = {
				capabilities: ['sonarcloud', 'devcontainer-python'],
				configuration: {
					sonarcloud: { language: 'Python' }
				}
			};
			const data = getCapabilityTemplateData('sonarcloud', context);
			expect(data.sonarLanguageSettings).toContain(
				'sonar.python.coverage.reportPaths=coverage.xml'
			);
			expect(data.sonarLanguageSettings).toContain('sonar.python.version=3.12');
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
			expect(data.buildWorkflowJob).toContain('ggshield/scan');
			expect(data.buildWorkflowJob).toContain('context: ctx');
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

		it('should include cargo ecosystem for rust devcontainer', () => {
			const context = {
				capabilities: ['dependabot', 'devcontainer-rust']
			};
			const data = getCapabilityTemplateData('dependabot', context);
			expect(data.dependabotUpdates).toContain('package-ecosystem: "cargo"');
		});

		it('should include cargo ecosystem for cloudflare wrangler with rust workerType', () => {
			const context = {
				capabilities: ['dependabot', 'cloudflare-wrangler'],
				configuration: {
					'cloudflare-wrangler': {
						workerType: 'rust'
					}
				}
			};
			const data = getCapabilityTemplateData('dependabot', context);
			expect(data.dependabotUpdates).toContain('package-ecosystem: "cargo"');
		});
	});

	describe('resolveDopplerTarget', () => {
		it('defaults to the shared common project', () => {
			expect(resolveDopplerTarget({ projectName: 'mailroom', configuration: {} })).toEqual({
				project: 'common',
				config: 'dev',
				strategy: 'common'
			});
		});

		it('defaults to common when configuration is missing entirely', () => {
			expect(resolveDopplerTarget({ name: 'mailroom' })).toEqual({
				project: 'common',
				config: 'dev',
				strategy: 'common'
			});
		});

		it('uses the repo name for a dedicated project when projectStrategy=new', () => {
			expect(
				resolveDopplerTarget({
					projectName: 'mailroom',
					configuration: { doppler: { projectStrategy: 'new' } }
				})
			).toEqual({
				project: 'mailroom',
				config: 'dev',
				strategy: 'new'
			});
		});

		it('honors an explicit dopplerConfig override', () => {
			expect(
				resolveDopplerTarget({ projectName: 'mailroom', dopplerConfig: 'prd', configuration: {} })
			).toEqual({
				project: 'common',
				config: 'prd',
				strategy: 'common'
			});
		});

		it('feeds the doppler template data through getCapabilityTemplateData', () => {
			const data = getCapabilityTemplateData('doppler', {
				projectName: 'mailroom',
				configuration: {}
			});
			expect(data.dopplerProject).toBe('common');
			expect(data.dopplerConfig).toBe('dev');

			const newProjectData = getCapabilityTemplateData('doppler', {
				projectName: 'mailroom',
				configuration: { doppler: { projectStrategy: 'new' } }
			});
			expect(newProjectData.dopplerProject).toBe('mailroom');
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
