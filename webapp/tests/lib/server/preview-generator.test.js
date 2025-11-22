import { describe, it, expect, vi } from 'vitest';
import { generatePreview } from '../../../src/lib/server/preview-generator.js';
import { TemplateEngine } from '../../../src/lib/utils/file-generator.js';

vi.mock('../../../src/lib/config/capabilities.js', () => ({
	capabilities: [
		{
			id: 'feature',
			name: 'Feature Capability',
			description: 'Adds feature support',
			templates: [{ filePath: 'src/feature.js', templateId: 'feature-template' }],
			externalServices: [
				{
					type: 'github',
					name: 'GitHub',
					actions: [{ type: 'create', description: 'Setup {{name}} repo' }],
					requiresAuth: true
				}
			]
		},
		{
			id: 'another',
			name: 'Another Capability',
			description: 'Secondary feature',
			templates: [],
			externalServices: []
		}
	]
}));

vi.mock('../../../src/lib/utils/capability-resolver.js', () => ({
	resolveDependencies: vi.fn(() => ({
		resolvedCapabilities: ['feature', 'another'],
		addedDependencies: ['another'],
		conflicts: [],
		isValid: true
	})),
	getCapabilityExecutionOrder: vi.fn(() => ['feature', 'another'])
}));

vi.mock('$app/environment', () => ({
	platform: {
		env: {
			R2_TEMPLATES_BUCKET: undefined // Mock R2 bucket to be undefined in test environment
		}
	}
}));

vi.mock('../../../src/lib/utils/file-generator.js', () => ({
	TemplateEngine: class MockTemplateEngine {
		constructor(r2Bucket) {
			// Accept r2Bucket in constructor
			this.r2Bucket = r2Bucket;
		}
		async initialize() {
			// Mock initialization
		}
		compileTemplate(templateString, data) {
			// Mock compileTemplate
			return templateString.replace('{{name}}', data.name);
		}
		async generateFile(templateId, data) {
			// Mock template content for testing
			if (templateId === 'devcontainer-node-json') {
				return `// devcontainer.json for ${data.name}`;
			}
			if (templateId === 'devcontainer-node-dockerfile') {
				return `FROM node:${data.capabilityConfig.nodeVersion}`;
			}
			if (templateId === 'devcontainer-zshrc') {
				return `// .zshrc for ${data.name}`;
			}
			if (templateId === 'devcontainer-p10k-zsh') {
				return `// .p10k.zsh for ${data.name}`;
			}
			if (templateId === 'devcontainer-setup-sh') {
				return `#!/bin/bash\n# setup.sh for ${data.name}`;
			}
			if (templateId === 'devcontainer-python-json') {
				return `// devcontainer.json for Python ${data.capabilityConfig.pythonVersion}`;
			}
			if (templateId === 'devcontainer-python-dockerfile') {
				return `FROM python:${data.capabilityConfig.pythonVersion}`;
			}
			if (templateId === 'devcontainer-java-json') {
				return `// devcontainer.json for Java ${data.capabilityConfig.javaVersion}`;
			}
			if (templateId === 'devcontainer-java-dockerfile') {
				return `FROM java:${data.capabilityConfig.javaVersion}`;
			}
			if (templateId === 'feature-template') {
				return `// feature file for ${data.name}`;
			}
			return `Mock content for ${templateId} with project ${data.name}`;
		}
	}
}));

describe('generatePreview', () => {
	const projectConfig = {
		name: 'Demo',
		description: 'Demo project',
		repositoryUrl: '',
		isPrivate: true,
		configuration: { feature: { enabled: true } }
	};

	const mockR2Bucket = {
		list: vi.fn(() => Promise.resolve({ objects: [] })),
		get: vi.fn(() => Promise.resolve(null))
	};

	it('creates preview data with files, services and summary', async () => {
		const preview = await generatePreview(projectConfig, ['feature'], mockR2Bucket);
		const srcFolder = preview.files.find((f) => f.name === 'src' && f.type === 'folder');
		expect(srcFolder).toBeDefined();
		const featureFile = srcFolder.children.find((f) => f.name === 'feature.js');
		expect(featureFile).toBeDefined();

		expect(preview.files.length).toBe(2); // folder and readme
		expect(preview.externalServices[0]).toMatchObject({ type: 'github' });
		expect(preview.summary).toMatchObject({
			projectName: 'Demo',
			totalCapabilities: 2,
			addedDependencies: 1,
			totalFiles: 2
		});
		expect(preview.summary.isValid).toBe(true);
	});

	it('continues preview generation when template processing fails', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const generateFileSpy = vi
			.spyOn(TemplateEngine.prototype, 'generateFile')
			.mockRejectedValue(new Error('template failure'));

		const preview = await generatePreview(projectConfig, ['feature'], mockR2Bucket);

		expect(warnSpy).toHaveBeenCalledWith(
			'⚠️ Failed to process template feature-template:',
			expect.any(Error)
		);
		expect(preview.files).toEqual([
			expect.objectContaining({
				path: 'README.md',
				name: 'README.md'
			})
		]);
		expect(preview.files.length).toBe(1);

		generateFileSpy.mockRestore();
		warnSpy.mockRestore();
	});
});