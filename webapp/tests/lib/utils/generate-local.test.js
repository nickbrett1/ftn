import { describe, it } from 'vitest';
import { generateAllFiles } from '../../../src/lib/utils/file-generator.js';
import fs from 'fs';
import path from 'path';

describe('Local Generation', () => {
	it('should write files locally', async () => {
		const context = {
			projectName: "stripe-toddler",
			capabilities: [
				"coding-agents",
				"devcontainer-rust",
				"circleci",
				"doppler",
				"cloudflare-wrangler",
				"dependabot",
				"editor-tools",
				"gitguardian",
				"sonarcloud"
			],
			configuration: {}
		};

		console.log("Generating files...");
		const files = await generateAllFiles(context);
		console.log(`Generated ${files.length} files.`);

		const destDir = '/workspaces/stripe-toddler';
		for (const file of files) {
			const destPath = path.join(destDir, file.filePath);
			fs.mkdirSync(path.dirname(destPath), { recursive: true });
			fs.writeFileSync(destPath, file.content, 'utf8');
			if (file.filePath.endsWith('.sh')) {
				fs.chmodSync(destPath, '755');
			}
			console.log(`Wrote: ${file.filePath}`);
		}
		console.log("All files written successfully!");
	});
});
