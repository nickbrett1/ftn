import { describe, it, expect, vi } from 'vitest';
import {
	generatePreview,
	organizeFilesIntoFolders
} from '../../../src/lib/server/preview-generator.js';

// Mock TemplateEngine to control its behavior in tests
vi.mock('../../../src/lib/utils/file-generator.js', () => {
	class MockTemplateEngine {
		constructor() {
			this.initialize = vi.fn().mockResolvedValue(true);
			this.generateFile = vi.fn((templateId, data) => {
				if (templateId === 'package-json') {
					return JSON.stringify(data);
				}
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
	return {
		TemplateEngine: MockTemplateEngine,
		GEMINI_DEV_ALIAS: 'gemini-dev-alias-mock',
		SHELL_SETUP_SCRIPT: 'shell-setup-script-mock',
		GIT_SAFE_DIR_SCRIPT: 'git-safe-dir-script-mock',
		GEMINI_SETUP_SCRIPT: 'gemini-setup-script-mock',
		PLAYWRIGHT_SETUP_SCRIPT: 'playwright-setup-script-mock',
		DOPPLER_LOGIN_SCRIPT: 'doppler-login-mock',
		WRANGLER_LOGIN_SCRIPT: 'wrangler-login-mock',
		SETUP_WRANGLER_SCRIPT: 'setup-wrangler-mock'
	};
});

// Mock capabilities - only needed if we don't mock capabilities.js fully or rely on structure
// The real implementation imports capabilities from $lib/config/capabilities.js
// So we must mock it to provide controlled data
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
		},
		{
			id: 'cloudflare-wrangler',
			name: 'Cloudflare Wrangler',
			externalServices: []
		},
		{
			id: 'doppler',
			name: 'Doppler',
			externalServices: []
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

vi.mock('../../../src/lib/utils/capability-template-utils.js', () => ({
	getCapabilityTemplateData: vi.fn(() => ({})),
	applyDefaults: vi.fn((cap, config) => config)
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

	it('generates cloudflare files when capability present', async () => {
		const projectConfig = { name: 'CloudflareProject' };
		// Testing with cloudflare-wrangler and doppler to trigger more files
		const preview = await generatePreview(projectConfig, ['cloudflare-wrangler', 'doppler']);

		const scriptsFolder = preview.files.find((f) => f.name === 'scripts' && f.type === 'folder');
		expect(scriptsFolder).toBeDefined();

		const loginScript = scriptsFolder.children.find((f) => f.name === 'cloud_login.sh');
		expect(loginScript).toBeDefined();

		const setupScript = scriptsFolder.children.find((f) => f.name === 'setup-wrangler-config.sh');
		expect(setupScript).toBeDefined();

		const wranglerTemplate = preview.files.find((f) => f.name === 'wrangler.template.jsonc');
		expect(wranglerTemplate).toBeDefined();
	});

	it('generates package.json with correct wrangler version when cloudflare-wrangler and devcontainer-node are present', async () => {
		const projectConfig = { name: 'NodeProject' };
		const preview = await generatePreview(projectConfig, [
			'devcontainer-node',
			'cloudflare-wrangler'
		]);

		const packageJsonFile = preview.files.find((f) => f.name === 'package.json');
		expect(packageJsonFile).toBeDefined();
		const content = JSON.parse(packageJsonFile.content);
		expect(content.devDependencies).toContain('"wrangler": "^4.54.0"');
	});

	it('handles errors during preview generation', async () => {
		// Mock resolveDependencies to throw
		const { resolveDependencies } = await import('../../../src/lib/utils/capability-resolver.js');
		resolveDependencies.mockImplementationOnce(() => {
			throw new Error('Resolution failed');
		});

		await expect(generatePreview({}, [])).rejects.toThrow(
			'Failed to generate preview: Resolution failed'
		);
	});
});

describe('organizeFilesIntoFolders', () => {
	it('should organize flat file list into tree', () => {
		const files = [
			{ path: 'README.md', name: 'README.md', type: 'file' },
			{ path: 'src/main.js', name: 'main.js', type: 'file' },
			{ path: 'src/utils/helper.js', name: 'helper.js', type: 'file' }
		];

		const tree = organizeFilesIntoFolders(files);
		expect(tree).toHaveLength(2); // README.md and src folder

		const srcFolder = tree.find((f) => f.name === 'src');
		expect(srcFolder.type).toBe('folder');
		expect(srcFolder.children).toHaveLength(2); // main.js and utils folder

		const utilsFolder = srcFolder.children.find((f) => f.name === 'utils');
		expect(utilsFolder.type).toBe('folder');
		expect(utilsFolder.children).toHaveLength(1);
		expect(utilsFolder.children[0].name).toBe('helper.js');
	});
});
