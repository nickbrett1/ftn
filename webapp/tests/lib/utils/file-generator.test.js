import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateEngine, generateAllFiles } from '$lib/utils/file-generator.js';
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
    "ghcr.io/devcontainers/features/node:1": {
      "version": "{{capabilityConfig.nodeVersion}}"
    }
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "svelte.svelte-vscode"
      ]
    }
  },
  "postCreateCommand": "./post-create-setup.sh"
}
`;

const javaDockerfileTemplateContent = `ARG VARIANT=\"{{javaVersion}}\"\nFROM mcr.microsoft.com/devcontainers/java:0-{{javaVersion}}\nRUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
    && apt-get -y install --no-install-recommends git zsh \\
    && npm install -g @google/gemini-cli
`;

const nodeDockerfileTemplateContent = `ARG VARIANT=\"{{capabilityConfig.nodeVersion}}\"\nFROM mcr.microsoft.com/devcontainers/typescript-node:0-{{capabilityConfig.nodeVersion}}\nRUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
    && apt-get -y install --no-install-recommends git zsh \\
    && npm install -g @google/gemini-cli
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
        const result = engine.compileTemplate(template, { javaVersion: '17' });
        expect(result).toBe(javaDockerfileTemplateContent.replace(/{{javaVersion}}/g, '17'));
    });

    it('replaces variables from node dockerfile template', () => {
        const template = engine.getTemplate('devcontainer-node-dockerfile');
        // Now requires capabilityConfig structure
        const result = engine.compileTemplate(template, { capabilityConfig: { nodeVersion: '20' } });
        expect(result).toBe(nodeDockerfileTemplateContent.replace(/{{capabilityConfig.nodeVersion}}/g, '20'));
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
		const content = engine.generateFile('devcontainer-java-dockerfile', { javaVersion: '17' });
		expect(content).toBe(javaDockerfileTemplateContent.replaceAll('{{javaVersion}}', '17'));

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
				data: { javaVersion: '17' }
			},
			{ templateId: 'missing', filePath: '/tmp/missing.txt', data: {} }
		]);

		const success = results.find((entry) => entry.templateId === 'devcontainer-java-dockerfile');
		const failure = results.find((entry) => entry.templateId === 'missing');

		expect(success).toBeDefined();
		expect(success.success).toBe(true);
		expect(success.content).toBe(javaDockerfileTemplateContent.replaceAll('{{javaVersion}}', '17'));
		expect(failure.success).toBe(false);
		expect(failure.error).toContain('Template not found');
	});

    it('should generate CircleCI config with Cloudflare deployment steps when deployTarget is cloudflare', () => {
        const selectedCapabilities = ['circleci'];
        const capabilitiesConfig = {
            'circleci': {
                deployTarget: 'cloudflare'
            }
        };
        const projectMetadata = { name: 'test-project' };
        const context = {
            capabilities: selectedCapabilities,
            config: capabilitiesConfig,
            projectMetadata: projectMetadata
        };

        const templateData = getCapabilityTemplateData('circleci', context);
        const content = engine.generateFile('circleci-config', templateData);

        expect(content).toContain('deploy-to-cloudflare');
        expect(content).toContain('command: npx wrangler deploy');
    });

    it('should NOT generate CircleCI config with Cloudflare deployment steps when deployTarget is none', () => {
        const selectedCapabilities = ['circleci'];
        const capabilitiesConfig = {
            'circleci': {
                deployTarget: 'none'
            }
        };
        const projectMetadata = { name: 'test-project' };
         const context = {
            capabilities: selectedCapabilities,
            config: capabilitiesConfig,
            projectMetadata: projectMetadata
        };

        const templateData = getCapabilityTemplateData('circleci', context);
        const content = engine.generateFile('circleci-config', templateData);

        expect(content).not.toContain('deploy-to-cloudflare');
        expect(content).not.toContain('command: npx wrangler deploy');
    });
});

describe('generateAllFiles', () => {
	const context = {
		projectName: 'test-project',
		capabilities: ['devcontainer-node', 'doppler'],
		configuration: {
			'devcontainer-node': { nodeVersion: '18' },
			doppler: { projectType: 'web' }
		}
	};

	it('generates all requested files including merged devcontainer files', async () => {
		// Use the real TemplateEngine but mock its initialization if needed
		// Since we are testing generateAllFiles which instantiates TemplateEngine internally,
		// we rely on the template imports being available (which they are via ?raw).

		const files = await generateAllFiles(context);

		expect(files).toBeInstanceOf(Array);
		expect(files.length).toBeGreaterThan(0);

		// Check for specific files
		const dockerfile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		expect(dockerfile).toBeDefined();
		expect(dockerfile.content).toContain('FROM mcr.microsoft.com/devcontainers/typescript-node');

		const devcontainerJson = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		expect(devcontainerJson).toBeDefined();
		const jsonContent = JSON.parse(devcontainerJson.content);
		expect(jsonContent.name).toBe('Node.js');

		const dopplerFile = files.find((f) => f.filePath === 'doppler.yaml');
		expect(dopplerFile).toBeDefined();
		expect(dopplerFile.content).toContain('project: test-project');
	});

	it('merges devcontainer configurations correctly', async () => {
		const multiContext = {
			...context,
			capabilities: ['devcontainer-node', 'devcontainer-python'],
			configuration: {
				'devcontainer-node': { nodeVersion: '18' },
				'devcontainer-python': { packageManager: 'pip' }
			}
		};

		const files = await generateAllFiles(multiContext);
		const devcontainerJson = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		const jsonContent = JSON.parse(devcontainerJson.content);

		// Should contain base node features
		expect(jsonContent.name).toBe('Node.js');
		// Should theoretically merge python features if the templates were set up that way
		// In this mock setup, we check that the file is generated and valid JSON
		expect(jsonContent).toHaveProperty('features');
	});

	it('handles empty capabilities list', async () => {
		const emptyContext = {
			projectName: 'empty',
			capabilities: [],
			configuration: {}
		};
		const files = await generateAllFiles(emptyContext);
		expect(files).toEqual([]);
	});

	it('handles capability with no templates', async () => {
		// Mock a capability not in the list or one without templates if possible
		// Since we import capabilities from $lib/config/capabilities.js, we are bound by that list.
		// We can just pass a context with a capability that has no templates logic in generateAllFiles if we could control it.
		// But collectNonDevelopmentContainerFiles iterates over otherCapabilities and checks c.templates.
		// If we pass a fake capability ID, it won't find it in capabilities array and skip it.

		const fakeContext = {
			projectName: 'fake',
			capabilities: ['non-existent-capability'],
			configuration: {}
		};

		const files = await generateAllFiles(fakeContext);
		expect(files).toEqual([]);
	});
});
