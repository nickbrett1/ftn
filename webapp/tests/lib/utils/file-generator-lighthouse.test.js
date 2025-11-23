import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateAllFiles, TemplateEngine } from '$lib/utils/file-generator.js';

describe('File Generator - Lighthouse Integration', () => {
    let engine;

    beforeEach(async () => {
        engine = new TemplateEngine();
        await engine.initialize();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('generates .lighthouse.cjs when lighthouse-ci capability is selected', async () => {
        const context = {
            capabilities: ['lighthouse-ci'],
            configuration: {
                'lighthouse-ci': {
                    thresholds: { performance: 90 }
                }
            }
        };

        const files = await generateAllFiles(context);
        const lighthouseFile = files.find(f => f.filePath === '.lighthouse.cjs');

        expect(lighthouseFile).toBeDefined();
        expect(lighthouseFile.content).toContain('module.exports = {');
        expect(lighthouseFile.content).toContain('staticDistDir: \'./build\'');
    });

    it('generates .circleci/config.yml without lighthouse when only circleci is selected', async () => {
        const context = {
            capabilities: ['circleci'],
            configuration: {}
        };

        const files = await generateAllFiles(context);
        const circleCiFile = files.find(f => f.filePath === '.circleci/config.yml');

        expect(circleCiFile).toBeDefined();
        expect(circleCiFile.content).toContain('version: 2.1');
        // Should not contain lighthouse job definition (or it should be replaced by empty string)
        expect(circleCiFile.content).not.toContain('Run Lighthouse CI');
        expect(circleCiFile.content).not.toContain('{{lighthouseJobDefinition}}'); // Should be replaced
    });

    it('generates .circleci/config.yml WITH lighthouse when both capabilities are selected', async () => {
        const context = {
            capabilities: ['circleci', 'lighthouse-ci'],
            configuration: {}
        };

        const files = await generateAllFiles(context);

        // Check for Lighthouse config file
        const lighthouseFile = files.find(f => f.filePath === '.lighthouse.cjs');
        expect(lighthouseFile).toBeDefined();

        // Check for CircleCI config file
        const circleCiFile = files.find(f => f.filePath === '.circleci/config.yml');
        expect(circleCiFile).toBeDefined();

        // Check content of CircleCI config
        expect(circleCiFile.content).toContain('Run Lighthouse CI');
        expect(circleCiFile.content).toContain('lhci autorun');
        expect(circleCiFile.content).toContain('    - lighthouse:');
        expect(circleCiFile.content).toContain('        requires:');
        expect(circleCiFile.content).toContain('          - build');
        expect(circleCiFile.content).not.toContain('{{lighthouseJobDefinition}}');
    });
});
