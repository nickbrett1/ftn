import { describe, it, expect, vi } from 'vitest';
import { generatePreview } from '../../src/lib/server/preview-generator.js';
import { TemplateEngine } from '../../src/lib/utils/file-generator.js';
import { capabilities } from '../../src/lib/config/capabilities.js';

// Mock R2 bucket as undefined/null for this test to verify fallback behavior
const mockR2Bucket = undefined;

describe('generatePreview with devcontainer', () => {
	it('should generate devcontainer files using fallback templates when R2 is unavailable', async () => {
		const projectConfig = {
			name: 'Test Project',
			description: 'A test project',
			configuration: {
				'devcontainer-node': {
					nodeVersion: '20'
				}
			}
		};

		const selectedCapabilities = ['devcontainer-node'];

		const previewData = await generatePreview(projectConfig, selectedCapabilities, mockR2Bucket);

		// Check that files were generated
		const devcontainerFolder = previewData.files.find(
			(f) => f.name === '.devcontainer' && f.type === 'folder'
		);
		expect(devcontainerFolder).toBeDefined();

		// Check for devcontainer.json
		const devcontainerJson = devcontainerFolder.children.find(
			(f) => f.name === 'devcontainer.json'
		);
		expect(devcontainerJson).toBeDefined();
		expect(devcontainerJson.content).toContain('"name": "Node.js"');

		// Check that organizeFilesIntoFolders created a tree
		expect(previewData.files.some((f) => f.name === 'README.md')).toBe(true);
	});
});
