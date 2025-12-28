import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

describe('NPM Resolution Test', () => {
    it('should resolve dependencies for a generated SvelteKit + Wrangler project', async () => {
        const context = {
            name: 'npm-install-test',
            capabilities: ['sveltekit', 'cloudflare-wrangler', 'devcontainer-node'],
            configuration: {
                'devcontainer-node': { nodeVersion: '20' },
                'cloudflare-wrangler': { workerType: 'web' }
            }
        };

        const files = await generateAllFiles(context);
        const packageJsonFile = files.find(f => f.filePath === 'package.json');

        expect(packageJsonFile).toBeDefined();

        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'npm-test-'));
        await fs.writeFile(path.join(tempDir, 'package.json'), packageJsonFile.content);

        try {
            // Use --dry-run to check resolution without actually downloading everything
            // Increase timeout as this can be slow
            const { stdout, stderr } = await execPromise('npm install --dry-run', { 
                cwd: tempDir,
                timeout: 60000 
            });
            
            expect(stdout).toBeDefined();
            // If it didn't throw, it resolved successfully
        } catch (error) {
            console.error('NPM Install resolution failed');
            console.error('Stdout:', error.stdout);
            console.error('Stderr:', error.stderr);
            throw error;
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }, 70000); // 70 second timeout for npm install
});
