import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('GitGuardian Generation', () => {
	beforeEach(() => {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should add GitGuardian orb and job to CircleCI config when GitGuardian and CircleCI are selected', async () => {
		const context = {
			name: 'gitguardian-test-project',
			capabilities: ['gitguardian', 'circleci'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const circleCiConfig = files.find((f) => f.filePath === '.circleci/config.yml');

		expect(circleCiConfig).toBeDefined();
		// Verify Orb injection
		expect(circleCiConfig.content).toContain('ggshield: gitguardian/ggshield@1');

		// Verify Job injection in Workflow
		expect(circleCiConfig.content).toContain('- ggshield/scan:');
		expect(circleCiConfig.content).toContain('base_revision: << pipeline.git.base_revision >>');
	});

	it('should not add GitGuardian config if capability is not selected', async () => {
		const context = {
			name: 'no-gitguardian-test',
			capabilities: ['circleci'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const circleCiConfig = files.find((f) => f.filePath === '.circleci/config.yml');

		expect(circleCiConfig).toBeDefined();
		expect(circleCiConfig.content).not.toContain('ggshield: gitguardian/ggshield');
		expect(circleCiConfig.content).not.toContain('- ggshield/scan:');
	});
});
