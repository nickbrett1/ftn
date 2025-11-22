import { describe, it, expect } from 'vitest';
import { organizeFilesIntoFolders } from '../../src/lib/server/preview-generator.js';

describe('organizeFilesIntoFolders', () => {
	it('should organize files into a nested tree structure', () => {
		const files = [
			{ path: 'README.md', name: 'README.md', type: 'file' },
			{ path: 'src/app.html', name: 'app.html', type: 'file' },
			{ path: 'src/routes/+page.svelte', name: '+page.svelte', type: 'file' },
			{ path: 'src/lib/components/Header.svelte', name: 'Header.svelte', type: 'file' }
		];

		const organized = organizeFilesIntoFolders(files);

		// Expected structure:
		// - README.md
		// - src/
		//   - app.html
		//   - routes/
		//     - +page.svelte
		//   - lib/
		//     - components/
		//       - Header.svelte

		// Check root level
		const readme = organized.find((f) => f.name === 'README.md');
		expect(readme).toBeDefined();
		expect(readme.type).toBe('file');

		const source = organized.find((f) => f.name === 'src');
		expect(source).toBeDefined();
		expect(source.type).toBe('folder');

		// Check src children
		const appHtml = source.children.find((f) => f.name === 'app.html');
		expect(appHtml).toBeDefined();
		expect(appHtml.type).toBe('file');

		const routes = source.children.find((f) => f.name === 'routes');
		expect(routes).toBeDefined();
		expect(routes.type).toBe('folder');

		// Check src/routes children
		const pageSvelte = routes.children.find((f) => f.name === '+page.svelte');
		expect(pageSvelte).toBeDefined();
		expect(pageSvelte.type).toBe('file');

		// Check src/lib/components children (deep nesting)
		const library = source.children.find((f) => f.name === 'lib');
		expect(library).toBeDefined();
		expect(library.type).toBe('folder');

		const components = library.children.find((f) => f.name === 'components');
		expect(components).toBeDefined();
		expect(components.type).toBe('folder');

		const headerSvelte = components.children.find((f) => f.name === 'Header.svelte');
		expect(headerSvelte).toBeDefined();
	});
});
