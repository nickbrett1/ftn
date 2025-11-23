import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TemplateEngine } from '$lib/utils/file-generator.js';

// Manually define the content of the templates for testing purposes
const nodeJsonTemplateContent = `{
  "name": "Node.js",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:0-18",
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": true,
      "installOhMyZsh": true,
      "upgradePackages": true,
      "username": "node"
    },
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"
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

const nodeDockerfileTemplateContent = `ARG VARIANT=\"{{nodeVersion}}\"\nFROM mcr.microsoft.com/devcontainers/typescript-node:0-{{nodeVersion}}\nRUN apt-get update && export DEBIAN_FRONTEND=noninteractive \\
    && apt-get -y install --no-install-recommends git zsh \\
    && npm install -g @google/gemini-cli
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
		const result = engine.compileTemplate('Hello {{name}} and {{nested.prop}}', { name: 'world', nested: { prop: 'value' } });
		expect(result).toBe('Hello world and value');
	});
    
    it('replaces variables from a real template file', () => {
        const template = engine.getTemplate('devcontainer-java-dockerfile');
        const result = engine.compileTemplate(template, { javaVersion: '17' });
        expect(result).toBe(javaDockerfileTemplateContent.replace(/{{javaVersion}}/g, '17'));
    });

    it('replaces variables from node dockerfile template', () => {
        const template = engine.getTemplate('devcontainer-node-dockerfile');
        const result = engine.compileTemplate(template, { nodeVersion: '20' });
        expect(result).toBe(nodeDockerfileTemplateContent.replace(/{{nodeVersion}}/g, '20'));
    });

	it('generates sonar-project.properties with correct variables', () => {
		const content = engine.generateFile('sonar-project-properties', { name: 'my-project' });
		expect(content).toContain('sonar.projectKey=my-project');
		expect(content).toContain('sonar.projectName=my-project');
		expect(content).toContain('sonar.organization=bem');
	});

	it('generates files and handles missing templates', () => {
		const content = engine.generateFile('devcontainer-java-dockerfile', { javaVersion: '17' });
		expect(content).toBe(javaDockerfileTemplateContent.replace(/{{javaVersion}}/g, '17'));

		expect(() => engine.generateFile('missing', {})).toThrow('Template not found');
	});

	it('generates multiple files collecting errors', () => {
		const results = engine.generateFiles([
			{ templateId: 'devcontainer-java-dockerfile', filePath: '/tmp/ok.txt', data: { javaVersion: '17' } },
			{ templateId: 'missing', filePath: '/tmp/missing.txt', data: {} }
		]);

		const success = results.find((entry) => entry.templateId === 'devcontainer-java-dockerfile');
		const failure = results.find((entry) => entry.templateId === 'missing');

		expect(success).toBeDefined();
        expect(success.success).toBe(true);
        expect(success.content).toBe(javaDockerfileTemplateContent.replace(/{{javaVersion}}/g, '17'));
		expect(failure.success).toBe(false);
		expect(failure.error).toContain('Template not found');
	});
});
