import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockProcessTemplate } = vi.hoisted(() => ({
	mockProcessTemplate: vi.fn((template, context) =>
		template.replace('{{projectName}}', context.name)
	)
}));

vi.mock('../../src/lib/utils/capabilities.js', () => ({
	CAPABILITIES: {
		feature: {
			id: 'feature',
			name: 'Feature Capability',
			description: 'Adds feature support',
			templates: [{ path: 'src/feature.js', content: 'console.log("{{projectName}}");' }],
			externalServices: [
				{
					type: 'github',
					name: 'GitHub',
					actions: [{ type: 'create', description: 'Setup {{projectName}} repo' }],
					requiresAuth: true
				}
			]
		},
		another: {
			id: 'another',
			name: 'Another Capability',
			description: 'Secondary feature',
			templates: [],
			externalServices: []
		}
	}
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

vi.mock('../../src/lib/server/template-engine.js', () => ({
	processTemplate: mockProcessTemplate
}));

import { generatePreview } from '../../src/lib/server/preview-generator.js';

describe('generatePreview', () => {
	const projectConfig = {
		name: 'Demo',
		description: 'Demo project',
		repositoryUrl: '',
		isPrivate: true,
		capabilityConfigs: { feature: { enabled: true } }
	};

	beforeEach(() => {
		mockProcessTemplate.mockClear();
	});

	it('creates preview data with files, services and summary', async () => {
		const preview = await generatePreview(projectConfig, ['feature']);

		expect(preview.files.length).toBeGreaterThan(0);
		expect(preview.externalServices[0]).toMatchObject({ type: 'github' });
		expect(preview.summary).toMatchObject({
			projectName: 'Demo',
			totalCapabilities: 2,
			addedDependencies: 1,
			totalFiles: preview.files.length
		});
		expect(preview.summary.isValid).toBe(true);
		expect(mockProcessTemplate).toHaveBeenCalled();
	});

	it('continues preview generation when template processing fails', async () => {
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mockProcessTemplate.mockImplementationOnce(() => {
			throw new Error('template failure');
		});

		const preview = await generatePreview(projectConfig, ['feature']);

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

		warnSpy.mockRestore();
	});
});
