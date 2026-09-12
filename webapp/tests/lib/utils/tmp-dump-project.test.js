import { describe, it } from 'vitest';
import { generateAllFiles } from '$lib/utils/file-generator.js';
import fs from 'node:fs';
import path from 'node:path';

describe('tmp: dump generated project shape', () => {
	it('node + buildkite', async () => {
		const files = await generateAllFiles({
			name: 'smoke-demo',
			projectName: 'smoke-demo',
			capabilities: ['buildkite', 'devcontainer-node', 'sveltekit', 'code-quality', 'dependabot'],
			configuration: { buildkite: {} }
		});
		console.log('\n=== FILE LIST ===');
		console.log(
			files
				.map((f) => f.filePath)
				.sort()
				.join('\n')
		);
		const out = '/tmp/gentest';
		fs.rmSync(out, { recursive: true, force: true });
		for (const f of files) {
			const dest = path.join(out, f.filePath);
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.writeFileSync(dest, f.content);
		}
		console.log('\n=== wrote', files.length, 'files to', out, '===');

		const pkg = files.find((f) => f.filePath === 'package.json');
		console.log('\n=== package.json ===');
		console.log(pkg ? pkg.content : '(none)');
		console.log(
			'\n=== has package-lock.json? ===',
			!!files.find((f) => f.filePath === 'package-lock.json')
		);
		const vite = files.find((f) => f.filePath === 'vite.config.js');
		console.log('\n=== vite.config.js ===');
		console.log(vite ? vite.content : '(none)');
	});
});
