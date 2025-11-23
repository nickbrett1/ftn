import { describe, it, expect, vi } from 'vitest';
import { generatePreview } from '../../../src/lib/server/preview-generator.js';

// Mock TemplateEngine to control its behavior in tests
vi.mock('../../../src/lib/utils/file-generator.js', () => {
	class MockTemplateEngine {
		constructor() {
			this.initialize = vi.fn().mockResolvedValue(true);
			this.generateFile = vi.fn((templateId, data) => {
				if (templateId.includes('json')) {
					const features = { [`feature-${templateId}`]: {} };
					const extensions = [`ext-${templateId}`];
					return JSON.stringify({
						name: `devcontainer for ${templateId}`,
						features,
						customizations: { vscode: { extensions } }
					});
				}
				return `content for ${templateId}`;
			});
		}
	}
	return { TemplateEngine: MockTemplateEngine };
});

vi.mock('../../../src/lib/config/capabilities.js', () => ({
	capabilities: [
		{
			id: 'devcontainer-node',
			name: 'Node.js DevContainer',
			templates: [
				{ templateId: 'devcontainer-node-json', filePath: '.devcontainer/devcontainer.json' },
				{ templateId: 'devcontainer-node-dockerfile', filePath: '.devcontainer/Dockerfile' },
				{ templateId: 'devcontainer-zshrc-full', filePath: '.devcontainer/.zshrc' },
				{ templateId: 'devcontainer-p10k-zsh-full', filePath: '.devcontainer/.p10k.zsh' },
				{
					templateId: 'devcontainer-post-create-setup-sh',
					filePath: '.devcontainer/post-create-setup.sh'
				}
			]
		},
		{
			id: 'devcontainer-java',
			name: 'Java DevContainer',
			templates: [
				{ templateId: 'devcontainer-java-json', filePath: '.devcontainer/devcontainer.json' },
				{ templateId: 'devcontainer-java-dockerfile', filePath: '.devcontainer/Dockerfile' }
			]
		},
		{
			id: 'another',
			name: 'Another Capability',
			templates: [{ templateId: 'another-template', filePath: 'another/file.txt' }]
		}
	]
}));

vi.mock('../../../src/lib/utils/capability-resolver.js', () => ({
	resolveDependencies: vi.fn((caps) => ({
		resolvedCapabilities: caps,
		addedDependencies: [],
		conflicts: [],
		isValid: true
	})),
	getCapabilityExecutionOrder: vi.fn((caps) => caps)
}));

describe('generatePreview', () => {
	it('creates preview data with non-devcontainer files', async () => {
		const projectConfig = { name: 'TestProject', configuration: { another: { enabled: true } } };
		const preview = await generatePreview(projectConfig, ['another']);
		const anotherFolder = preview.files.find((f) => f.name === 'another' && f.type === 'folder');
		expect(anotherFolder).toBeDefined();
		const anotherFile = anotherFolder.children.find((f) => f.path === 'another/file.txt');
		expect(anotherFile).toBeDefined();
		expect(anotherFile.content).toBe('content for another-template');
	});

	it('merges multiple devcontainer files correctly', async () => {
		const projectConfig = {
			name: 'TestProject',
			configuration: {
				'devcontainer-node': { enabled: true },
				'devcontainer-java': { enabled: true }
			}
		};
		const preview = await generatePreview(projectConfig, [
			'devcontainer-node',
			'devcontainer-java'
		]);

		const devcontainerFolder = preview.files.find(
			(f) => f.name === '.devcontainer' && f.type === 'folder'
		);
		expect(devcontainerFolder).toBeDefined();

		const devcontainerJsonFile = devcontainerFolder.children.find(
			(f) => f.name === 'devcontainer.json'
		);
		expect(devcontainerJsonFile).toBeDefined();

		const dockerfile = devcontainerFolder.children.find((f) => f.name === 'Dockerfile');
		expect(dockerfile).toBeDefined();
		// It should use the first one as the base
		expect(dockerfile.content).toBe('content for devcontainer-node-dockerfile');

		// Check that there is only one of each devcontainer file
		expect(devcontainerFolder.children.length).toBe(5); // devcontainer.json, Dockerfile, .zshrc, .p10k.zsh, post-create-setup.sh

		// Check the merged devcontainer.json content
		const mergedJson = JSON.parse(devcontainerJsonFile.content);
		expect(mergedJson.features).toHaveProperty('feature-devcontainer-node-json');
		expect(mergedJson.features).toHaveProperty('feature-devcontainer-java-json');
		expect(mergedJson.customizations.vscode.extensions).toContain('ext-devcontainer-node-json');
		expect(mergedJson.customizations.vscode.extensions).toContain('ext-devcontainer-java-json');
	});
});
