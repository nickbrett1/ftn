import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';

describe('file-generator devcontainer merging', () => {
	it('should merge multiple devcontainers', async () => {
		const context = {
			capabilities: ['devcontainer-node', 'devcontainer-python'],
			configuration: {}
		};

		const files = await generateAllFiles(context);
		const devcontainerJson = files.find(f => f.filePath === '.devcontainer/devcontainer.json');

		expect(devcontainerJson).toBeDefined();
		const parsed = JSON.parse(devcontainerJson.content);
		expect(parsed.features).toBeDefined();
	});
});
