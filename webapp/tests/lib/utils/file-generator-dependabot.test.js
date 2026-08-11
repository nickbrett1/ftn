import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('Dependabot File Generation', () => {
	it('should generate dependabot auto-merge workflow when dependabot capability is selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['dependabot', 'devcontainer-node'],
			configuration: {
				dependabot: {}
			}
		};

		const files = await generateAllFiles(context);
		const autoMergeFile = files.find(
			(f) => f.filePath === '.github/workflows/dependabot-auto-merge.yml'
		);
		const dependabotConfigFile = files.find((f) => f.filePath === '.github/dependabot.yml');

		expect(autoMergeFile).toBeDefined();
		expect(autoMergeFile.content).toContain('name: Dependabot auto-merge');
		expect(autoMergeFile.content).toContain('permissions:');
		expect(autoMergeFile.content).toContain('contents: write');
		expect(autoMergeFile.content).toContain('pull-requests: write');

		// Auto-merge must use the default GITHUB_TOKEN (with the write
		// permissions declared above), not a custom PAT secret.
		expect(autoMergeFile.content).toContain('GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}');
		expect(autoMergeFile.content).not.toContain('MYTOKEN');

		expect(dependabotConfigFile).toBeDefined();
	});

	it('should NOT generate dependabot auto-merge workflow when dependabot capability is NOT selected', async () => {
		const context = {
			name: 'test-project',
			capabilities: ['devcontainer-node'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const autoMergeFile = files.find(
			(f) => f.filePath === '.github/workflows/dependabot-auto-merge.yml'
		);

		expect(autoMergeFile).toBeUndefined();
	});
});
