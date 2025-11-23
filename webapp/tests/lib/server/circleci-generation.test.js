import { describe, it, expect } from 'vitest';
import { generatePreview } from '$lib/server/preview-generator.js';
import { capabilities } from '$lib/config/capabilities.js';

describe('CircleCI Capability Generation', () => {
    it('should generate .circleci/config.yml when circleci capability is selected', async () => {
        const projectConfig = {
            name: 'test-project',
            description: 'A test project',
            configuration: {
                circleci: {
                    deployTarget: 'none'
                }
            }
        };

        const selectedCapabilities = ['circleci'];

        const previewData = await generatePreview(projectConfig, selectedCapabilities);

        // The output is organized into folders. We expect a .circleci folder.
        const circleCiFolder = previewData.files.find(f => f.name === '.circleci' && f.type === 'folder');
        expect(circleCiFolder).toBeDefined();

        const circleCiFile = circleCiFolder.children.find(f => f.name === 'config.yml');
        expect(circleCiFile).toBeDefined();

        expect(circleCiFile.content).toContain('version: 2.1');
        expect(circleCiFile.content).toContain('cimg/node:20.11.0');
    });
});
