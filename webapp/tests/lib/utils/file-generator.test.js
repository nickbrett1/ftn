import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateEngine, GEMINI_DEV_ALIAS, generateAllFiles } from '$lib/utils/file-generator.js';
import { getCapabilityTemplateData } from '$lib/utils/capability-template-utils.js';

// Manually define the content of the templates for testing purposes
const nodeJsonTemplateContent = `{
  "name": "Node.js",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:0-{{capabilityConfig.nodeVersion}}",
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "installOhMyZsh": true,
      "upgradePackages": true,
      "username": "node"
    },
    "ghcr.io/devcontainers/features/python:1": {},
    "ghcr.io/devcontainers/features/node:1": {
      "version": "{{capabilityConfig.nodeVersion}}"
    }
  },
  "postCreateCommand": "./post-create-setup.sh"
}
`;

const javaDockerfileTemplateContent = `ARG VARIANT="{{capabilityConfig.javaVersion}}"
FROM mcr.microsoft.com/devcontainers/java:0-{{capabilityConfig.javaVersion}}
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
    && apt-get -y install --no-install-recommends git zsh curl \\
    && npm install -g @google/gemini-cli @specifyapp/cli

RUN curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

USER node

RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \\
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git \$HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \\
    && git clone https://github.com/zsh-users/zsh-autosuggestions \$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions \\
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git \$HOME/.oh-my-zsh/custom/themes/powerlevel10k \\
    && curl https://cursor.com/install -fsS | bash

RUN uv tool install --python 3.11 git+https://github.com/github/spec-kit.git
`;

const nodeDockerfileTemplateContent = `ARG VARIANT="{{capabilityConfig.nodeVersion}}"
FROM mcr.microsoft.com/devcontainers/typescript-node:0-{{capabilityConfig.nodeVersion}}
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
    && apt-get -y install --no-install-recommends git zsh curl \\
    && npm install -g @google/gemini-cli @specifyapp/cli

RUN curl -LsSf https://astral.sh/uv/install.sh | env CARGO_HOME=/usr/local UV_INSTALL_DIR=/usr/local/bin sh

USER node

RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \\
    && git clone https://github.com/zsh-users/zsh-syntax-highlighting.git \$HOME/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting \\
    && git clone https://github.com/zsh-users/zsh-autosuggestions \$HOME/.oh-my-zsh/custom/plugins/zsh-autosuggestions \\
    && git clone --depth=1 https://github.com/romkatv/powerlevel10k.git \$HOME/.oh-my-zsh/custom/themes/powerlevel10k \\
    && curl https://cursor.com/install -fsS | bash

RUN uv tool install --python 3.11 git+https://github.com/github/spec-kit.git
`;

const dopplerYamlTemplateContent = `setup:
  project: {{projectName}}
  config: dev
`;

describe('TemplateEngine', () => {
	let engine;

	beforeEach(async () => {
		engine = new TemplateEngine();
		await engine.initialize();
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('initializes successfully and loads template strings', () => {
		expect(engine.initialized).toBe(true);
		expect(engine.templates.has('devcontainer-node-json')).toBe(true);
		expect(typeof engine.templates.get('devcontainer-node-json')).toBe('string');
	});

	it('retrieves template strings', () => {
		const template = engine.getTemplate('devcontainer-node-json');
		expect(template).toBe(nodeJsonTemplateContent);

		const nonExistent = engine.getTemplate('non-existent');
		expect(nonExistent).toBeNull();
	});

	it('replaces variables in template string', () => {
		const result = engine.compileTemplate('Hello {{name}} and {{nested.prop}}', {
			name: 'world',
			nested: { prop: 'value' }
		});
		expect(result).toBe('Hello world and value');
	});

	it('replaces variables from a real template file', () => {
		const template = engine.getTemplate('devcontainer-java-dockerfile');
		const result = engine.compileTemplate(template, { capabilityConfig: { javaVersion: '17' } });
		expect(result).toBe(
			javaDockerfileTemplateContent.replaceAll(/{{capabilityConfig.javaVersion}}/g, '17')
		);
	});

	it('replaces variables from node dockerfile template', () => {
		const template = engine.getTemplate('devcontainer-node-dockerfile');
		// Now requires capabilityConfig structure
		const result = engine.compileTemplate(template, { capabilityConfig: { nodeVersion: '20' } });
		expect(result).toBe(
			nodeDockerfileTemplateContent.replaceAll(/{{capabilityConfig.nodeVersion}}/g, '20')
		);
	});

	it('generates sonar-project.properties with correct variables', () => {
		const data = {
			projectName: 'my-project',
			organization: 'my-org',
			sonarLanguageSettings: 'sonar.foo=bar'
		};
		const content = engine.generateFile('sonar-project-properties', data);
		expect(content).toContain('sonar.projectKey=my-project');
		expect(content).toContain('sonar.projectName=my-project');
		expect(content).toContain('sonar.organization=my-org');
		expect(content).toContain('sonar.foo=bar');
	});

	it('generates files and handles missing templates', () => {
		const content = engine.generateFile('devcontainer-java-dockerfile', {
			capabilityConfig: { javaVersion: '17' }
		});
		expect(content).toBe(
			javaDockerfileTemplateContent.replaceAll(/{{capabilityConfig.javaVersion}}/g, '17')
		);

		expect(() => engine.generateFile('missing', {})).toThrow('Template not found');
	});

	it('generates doppler.yaml correctly', () => {
		const content = engine.generateFile('doppler-yaml', { projectName: 'test-project' });
		expect(content).toBe(dopplerYamlTemplateContent.replace('{{projectName}}', 'test-project'));
	});

	it('generates multiple files collecting errors', () => {
		const results = engine.generateFiles([
			{
				templateId: 'devcontainer-java-dockerfile',
				filePath: '/tmp/ok.txt',
				data: { capabilityConfig: { javaVersion: '17' } }
			},
			{ templateId: 'missing', filePath: '/tmp/missing.txt', data: {} }
		]);

		const success = results.find((entry) => entry.templateId === 'devcontainer-java-dockerfile');
		const failure = results.find((entry) => entry.templateId === 'missing');

		expect(success).toBeDefined();
		expect(success.success).toBe(true);
		expect(success.content).toBe(
			javaDockerfileTemplateContent.replaceAll(/{{capabilityConfig.javaVersion}}/g, '17')
		);
		expect(failure.success).toBe(false);
		expect(failure.error).toContain('Template not found');
	});

	it('should generate CircleCI config with Cloudflare deployment steps when cloudflare-wrangler capability is present', () => {
		const selectedCapabilities = ['circleci', 'cloudflare-wrangler'];
		const capabilitiesConfig = {};
		const projectMetadata = { name: 'test-project' };
		const context = {
			capabilities: selectedCapabilities,
			configuration: capabilitiesConfig,
			projectMetadata: projectMetadata
		};

		const templateData = getCapabilityTemplateData('circleci', context);
		const content = engine.generateFile('circleci-config', templateData);

		expect(content).toContain('deploy-to-cloudflare');
		expect(content).toContain('command: npx wrangler deploy');
	});

	it('should NOT generate CircleCI config with Cloudflare deployment steps when cloudflare-wrangler capability is NOT present', () => {
		const selectedCapabilities = ['circleci'];
		const capabilitiesConfig = {};
		const projectMetadata = { name: 'test-project' };
		const context = {
			capabilities: selectedCapabilities,
			configuration: capabilitiesConfig,
			projectMetadata: projectMetadata
		};

		const templateData = getCapabilityTemplateData('circleci', context);
		const content = engine.generateFile('circleci-config', templateData);

		expect(content).not.toContain('deploy-to-cloudflare');
		expect(content).not.toContain('command: npx wrangler deploy');
	});

	it('should include gemini-dev alias in .zshrc when Doppler capability is present in generateAllFiles', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node', 'doppler'],
			configuration: {
				'devcontainer-node': { nodeVersion: '18' }
			}
		};

		const files = await generateAllFiles(context);
		const zshrc = files.find((f) => f.filePath.endsWith('.zshrc'));

		expect(zshrc).toBeDefined();
		expect(zshrc.content).toContain('gemini-dev()');
		expect(zshrc.content).toContain('doppler run');
	});

	it('should NOT include gemini-dev alias in .zshrc when Doppler capability is NOT present in generateAllFiles', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node'],
			configuration: {
				'devcontainer-node': { nodeVersion: '18' }
			}
		};

		const files = await generateAllFiles(context);
		const zshrc = files.find((f) => f.filePath.endsWith('.zshrc'));

		expect(zshrc).toBeDefined();
		expect(zshrc.content).not.toContain('gemini-dev()');
		expect(zshrc.content).not.toContain('doppler run');
	});

	it('gemini-dev alias content should match expected constant', () => {
		expect(GEMINI_DEV_ALIAS).toContain('gemini-dev()');
		expect(GEMINI_DEV_ALIAS).toContain('doppler run --project webapp --config dev -- gemini "$@"');
	});
});
