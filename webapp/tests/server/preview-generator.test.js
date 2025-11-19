import { describe, it, expect, vi, afterEach } from 'vitest';
import { generatePreview } from '../../src/lib/server/preview-generator.js';
import { TemplateEngine } from '../../src/lib/utils/file-generator.js';

vi.mock('../../src/lib/config/capabilities.js', () => ({
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
					actions: [{ type: 'create', description: 'Setup {{projectName}} repo' }],
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

vi.mock('../../src/lib/utils/capability-resolver.js', () => ({
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
			R2_TEMPLATES_BUCKET: undefined
		}
	}
}));

// Re-add the class mock for TemplateEngine
vi.mock('../../src/lib/utils/file-generator.js', () => ({
	TemplateEngine: class MockTemplateEngine {
		constructor() {}
		async initialize() {}
		compileTemplate(templateString, data) {
			return templateString.replace('{{projectName}}', data.name || data.projectName);
		}
		async generateFile(templateId, data) {
			return `Mock content for ${templateId} with project ${data.name || data.projectName}`;
		}
	}
}));

describe('generatePreview', () => {
	const projectConfig = {
		name: 'Demo',
		projectName: 'Demo',
		description: 'Demo project',
		repositoryUrl: '',
		isPrivate: true,
		configuration: { feature: { enabled: true } }
	};

	const mockR2Bucket = {
		list: vi.fn(() => Promise.resolve({ objects: [] })),
		get: vi.fn(() => Promise.resolve(null))
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('creates preview data with files, services and summary', async () => {
		const preview = await generatePreview(projectConfig, ['feature'], mockR2Bucket);
		expect(preview.files.length).toBeGreaterThan(0);
		expect(preview.externalServices[0]).toMatchObject({ type: 'github' });
		expect(preview.summary).toMatchObject({
			projectName: 'Demo',
			totalCapabilities: 2,
			addedDependencies: 1,
			totalFiles: preview.files.length
		});
		expect(preview.summary.isValid).toBe(true);
	});

	it('continues preview generation when template processing fails', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		// Spy on the prototype of the mocked class
		vi.spyOn(TemplateEngine.prototype, 'generateFile').mockImplementationOnce(() => {
			throw new Error('template failure');
		});

		const preview = await generatePreview(projectConfig, ['feature'], mockR2Bucket);

		expect(warnSpy).toHaveBeenCalled();
		expect(preview.files).toEqual([
			{
				path: 'README.md',
				name: 'README.md',
				content: expect.stringContaining('# Demo'),
				size: expect.any(Number),
				type: 'file'
			}
		]);
	});
});
