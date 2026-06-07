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
				if (templateId === 'gitignore') {
					return `content for gitignore ${data.pythonIgnore || ''} ${data.javaIgnore || ''}`;
				}
				if (templateId.startsWith('devcontainer-') && templateId.endsWith('-json')) {
					const features = { [`feature-${templateId}`]: {} };
					const extensions = [`ext-${templateId}`];
					return JSON.stringify({
						name: `devcontainer for ${templateId}`,
						features,
						customizations: { vscode: { extensions } }
					});
				}
				if (templateId === 'vscode-settings-json') {
					return 'content for vscode-settings-json';
				}
				if (templateId === 'devcontainer-zshrc-full') {
					return (data.agyDevAlias || '').replace('{{projectName}}', data.name);
				}
				return `content for ${templateId}`;
			});
		}
	}
	return {
		TemplateEngine: MockTemplateEngine,
		AGY_DEV_ALIAS: 'agy-dev-{{projectName}}-mock',
		SHELL_SETUP_SCRIPT: 'shell-setup-script-mock',
		GIT_SAFE_DIR_SCRIPT: 'git-safe-dir-script-mock',
		AGY_SETUP_SCRIPT: 'agy-setup-script-mock',
		PLAYWRIGHT_SETUP_SCRIPT: 'playwright-setup-script-mock',
		DOPPLER_LOGIN_SCRIPT: 'doppler-login-mock',
		WRANGLER_LOGIN_SCRIPT: 'wrangler-login-mock',
		SETUP_WRANGLER_SCRIPT: 'setup-wrangler-mock',
		DOPPLER_INSTALL_SCRIPT: 'doppler-install-mock',
		generateVscodeSettingsFile: vi.fn(),
		generateViteConfigFile: vi.fn((context) => ({
			filePath: 'vite.config.js',
			content: 'mock vite config'
		})),
		generateSharedReporterFile: vi.fn(() => ({
			filePath: 'scripts/shared-reporter.js',
			content: 'mock shared reporter'
		})),
		generateRunSharedTestsFile: vi.fn(() => ({
			filePath: 'scripts/run-shared-tests.js',
			content: 'mock run shared tests'
		}))
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
		},
		{
			id: 'sveltekit',
			name: 'SvelteKit',
			templates: [{ templateId: 'svelte-config-js', filePath: 'svelte.config.js' }]
		},
		{
			id: 'devcontainer-python',
			name: 'Python DevContainer',
			templates: []
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
		expect(content.devDependencies).toContain('"wrangler": "^4.56.0"');
	});

	it('generates sveltekit specific files', async () => {
		const projectConfig = { name: 'SvelteProject' };
		const preview = await generatePreview(projectConfig, ['sveltekit', 'devcontainer-node']);

		const svelteConfig = preview.files.find((f) => f.name === 'svelte.config.js');
		expect(svelteConfig).toBeDefined();

		const packageJson = preview.files.find((f) => f.name === 'package.json');
		const package_ = JSON.parse(packageJson.content);
		expect(package_.devDependencies).toContain('@sveltejs/kit');
	});

	it('generates agy-dev alias with correct project name in .zshrc', async () => {
		const projectConfig = { name: 'CustomProject' };
		const preview = await generatePreview(projectConfig, ['devcontainer-node', 'doppler']);

		const devcontainerFolder = preview.files.find(
			(f) => f.name === '.devcontainer' && f.type === 'folder'
		);
		const zshrc = devcontainerFolder.children.find((f) => f.name === '.zshrc');
		expect(zshrc).toBeDefined();
		expect(zshrc.content).toBe('agy-dev-CustomProject-mock');
	});

	it('generates correct gitignore for python', async () => {
		const projectConfig = { name: 'PythonProject' };
		const preview = await generatePreview(projectConfig, ['devcontainer-python']);
		const gitignore = preview.files.find((f) => f.name === '.gitignore');
		expect(gitignore).toBeDefined();
		expect(gitignore.content).toContain('__pycache__');
	});

	it('generates correct gitignore for java', async () => {
		const projectConfig = { name: 'JavaProject' };
		const preview = await generatePreview(projectConfig, ['devcontainer-java']);
		const gitignore = preview.files.find((f) => f.name === '.gitignore');
		expect(gitignore).toBeDefined();
		expect(gitignore.content).toContain('*.class');
	});

	it('generates .vscode/settings.json for python', async () => {
		const projectConfig = { name: 'PythonProject' };
		const preview = await generatePreview(projectConfig, ['devcontainer-python']);

		const vscodeFolder = preview.files.find((f) => f.name === '.vscode' && f.type === 'folder');
		expect(vscodeFolder).toBeDefined();

		const settingsFile = vscodeFolder.children.find((f) => f.name === 'settings.json');
		expect(settingsFile).toBeDefined();
		expect(settingsFile.content).toBe('content for vscode-settings-json');
	});

	it('generates vite.config.js and test runner scripts when devcontainer-node is selected', async () => {
		const projectConfig = { name: 'NodeProject' };
		const preview = await generatePreview(projectConfig, ['devcontainer-node']);

		const viteConfig = preview.files.find((f) => f.name === 'vite.config.js');
		expect(viteConfig).toBeDefined();
		expect(viteConfig.content).toBe('mock vite config');

		const scriptsFolder = preview.files.find((f) => f.name === 'scripts' && f.type === 'folder');
		expect(scriptsFolder).toBeDefined();

		const sharedReporter = scriptsFolder.children.find((f) => f.name === 'shared-reporter.js');
		expect(sharedReporter).toBeDefined();
		expect(sharedReporter.content).toBe('mock shared reporter');

		const runSharedTests = scriptsFolder.children.find((f) => f.name === 'run-shared-tests.js');
		expect(runSharedTests).toBeDefined();
		expect(runSharedTests.content).toBe('mock run shared tests');
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

		const sourceFolder = tree.find((f) => f.name === 'src');
		expect(sourceFolder.type).toBe('folder');
		expect(sourceFolder.children).toHaveLength(2); // main.js and utils folder

		const utilitiesFolder = sourceFolder.children.find((f) => f.name === 'utils');
		expect(utilitiesFolder.type).toBe('folder');
		expect(utilitiesFolder.children).toHaveLength(1);
		expect(utilitiesFolder.children[0].name).toBe('helper.js');
	});
});
