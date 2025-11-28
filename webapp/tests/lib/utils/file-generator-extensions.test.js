import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('File Generator - Extensions', () => {
	it('should include SonarLint extension when sonarlint capability is selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node', 'sonarlint'],
			configuration: {
				'devcontainer-node': { nodeVersion: '22' },
				sonarlint: {}
			}
		};

		const files = await generateAllFiles(context);
		const devcontainerFile = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');

		expect(devcontainerFile).toBeDefined();
		const content = JSON.parse(devcontainerFile.content);

		expect(content.customizations).toBeDefined();
		expect(content.customizations.vscode).toBeDefined();
		expect(content.customizations.vscode.extensions).toContain('SonarSource.sonarlint-vscode');
	});

	it('should include Editor Configuration extensions when editor-tools is selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node', 'editor-tools'],
			configuration: {
				'devcontainer-node': { nodeVersion: '22' }
			}
		};

		const files = await generateAllFiles(context);
		const devcontainerFile = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');

		expect(devcontainerFile).toBeDefined();
		const content = JSON.parse(devcontainerFile.content);

		expect(content.customizations.vscode.extensions).toContain('dbaeumer.vscode-eslint');
		expect(content.customizations.vscode.extensions).toContain('esbenp.prettier-vscode');
		expect(content.customizations.vscode.extensions).toContain('svelte.svelte-vscode');
		expect(content.customizations.vscode.extensions).toContain('eamodio.gitlens');
	});

	it('should combine extensions from multiple capabilities', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node', 'sonarlint', 'editor-tools', 'doppler'],
			configuration: {
				'devcontainer-node': { nodeVersion: '22' }
			}
		};

		const files = await generateAllFiles(context);
		const devcontainerFile = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		const content = JSON.parse(devcontainerFile.content);
		const extensions = content.customizations.vscode.extensions;

		expect(extensions).toContain('SonarSource.sonarlint-vscode');
		expect(extensions).toContain('dbaeumer.vscode-eslint');
		expect(extensions).toContain('THEARC.doppler');
	});

	it('should include Python extensions when Python devcontainer is selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-python'],
			configuration: {
				'devcontainer-python': { pythonVersion: '3.11' }
			}
		};

		const files = await generateAllFiles(context);
		const devcontainerFile = files.find((f) => f.filePath === '.devcontainer/devcontainer.json');
		const content = JSON.parse(devcontainerFile.content);

		expect(content.customizations.vscode.extensions).toContain('ms-python.python');
		expect(content.customizations.vscode.extensions).toContain('ms-python.vscode-pylance');
		// Ensure standard editor tools are NOT present if not selected
		expect(content.customizations.vscode.extensions).not.toContain('dbaeumer.vscode-eslint');
	});
});
