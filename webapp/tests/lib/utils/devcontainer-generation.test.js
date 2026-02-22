import { describe, it, expect } from 'vitest';
import { TemplateEngine, generateMergedDevelopmentContainerFiles } from '$lib/utils/file-generator';

describe('DevContainer Generation Tests', () => {
	it('should generate valid Java devcontainer.json without undefined variables', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-java'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-java']);

		const devcontainerJsonFile = files.find(
			(f) => f.filePath === '.devcontainer/devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();

		const devcontainerJson = JSON.parse(devcontainerJsonFile.content);

		// Check for unresolved variables in build
		expect(devcontainerJson.build).toEqual({ dockerfile: 'Dockerfile' });

		// Check for runArgs
		expect(devcontainerJson.runArgs).toContain('--sysctl');
		expect(devcontainerJson.runArgs).toContain('net.ipv6.conf.all.disable_ipv6=1');

		// Check for unresolved variables in features
		const javaFeature = devcontainerJson.features['ghcr.io/devcontainers/features/java:1'];
		expect(javaFeature).toBeDefined();
		expect(javaFeature.version).toBe('21');

		// Check for correct user in features
		expect(devcontainerJson.features['ghcr.io/devcontainers/features/common-utils:2'].username).toBe(
			'vscode'
		);

		// Check Dockerfile user
		const dockerfileFile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		expect(dockerfileFile).toBeDefined();
		expect(dockerfileFile.content).toContain('USER vscode');
	});

	it('should generate valid Python devcontainer.json without undefined variables', async () => {
		const engine = new TemplateEngine();
		await engine.initialize();

		const context = {
			capabilities: ['devcontainer-python'],
			configuration: {}
		};

		const files = generateMergedDevelopmentContainerFiles(engine, context, ['devcontainer-python']);

		const devcontainerJsonFile = files.find(
			(f) => f.filePath === '.devcontainer/devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();

		const devcontainerJson = JSON.parse(devcontainerJsonFile.content);

		// Check for unresolved variables in build
		expect(devcontainerJson.build).toEqual({ dockerfile: 'Dockerfile' });

		// Check for runArgs
		expect(devcontainerJson.runArgs).toContain('--sysctl');
		expect(devcontainerJson.runArgs).toContain('net.ipv6.conf.all.disable_ipv6=1');

		// Check for unresolved variables in features
		const pythonFeature = devcontainerJson.features['ghcr.io/devcontainers/features/python:1'];
		expect(pythonFeature).toBeDefined();
		expect(pythonFeature.version).toBe('3.12');

		// Check for correct user in features
		expect(devcontainerJson.features['ghcr.io/devcontainers/features/common-utils:2'].username).toBe(
			'vscode'
		);

		// Check Dockerfile user
		const dockerfileFile = files.find((f) => f.filePath === '.devcontainer/Dockerfile');
		expect(dockerfileFile).toBeDefined();
		expect(dockerfileFile.content).toContain('USER vscode');
	});
});
