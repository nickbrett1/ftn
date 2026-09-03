import { describe, it, expect } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import util from 'node:util';
import os from 'node:os';

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
		const packageJsonFile = files.find((f) => f.filePath === 'package.json');

		expect(packageJsonFile).toBeDefined();

		// The devcontainer-node project must pin a working npm (11) and enforce
		// it, because npm 10's arborist crashes fresh-installing vitest-4
		// projects ('edgesOut'). packageManager + engines + engine-strict .npmrc
		// together make npm refuse to run under the wrong version.
		const packageJson = JSON.parse(packageJsonFile.content);
		expect(packageJson.packageManager).toMatch(/^npm@11\./);
		expect(packageJson.engines?.npm).toMatch(/^>=11 <12$/);
		expect(packageJsonFile.content).toContain('"engines"');
		const npmrcFile = files.find((f) => f.filePath === '.npmrc');
		expect(npmrcFile?.content).toContain('engine-strict=true');

		const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'npm-test-'));
		await fs.writeFile(path.join(tempDir, 'package.json'), packageJsonFile.content);

		try {
			// Use full install to verify dependency resolution
			// Increase timeout as this can be slow
			const { stdout, stderr } = await execPromise('npm install', {
				cwd: tempDir,
				timeout: 600_000
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
	}, 600_000); // Cold install of the generated project hits the live registry;
	// give it the same 10min budget as the inner exec() call (previously 70s
	// timed out once npm 11 stopped failing fast with the npm 10 arborist bug).
});
